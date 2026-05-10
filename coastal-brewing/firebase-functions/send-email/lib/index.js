"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
/**
 * send-email — Coastal Brewing Co. transactional email gateway.
 *
 * Owner directive 2026-05-06: email automation routes through GCP /
 * Firebase, NOT direct third-party APIs from coastal-runner. This
 * function lives in the ai-managed-services Firebase project, owns the SendGrid
 * integration, and is called by coastal-runner via HTTPS.
 *
 * Auth: HMAC-SHA256(body) using COASTAL_EMAIL_FUNCTION_SECRET, sent in
 * X-Coastal-Signature. Function verifies before forwarding to SendGrid.
 *
 * Why a function instead of a direct SendGrid call from the runner:
 *  - Single email-vendor abstraction. Swap SendGrid -> Mailgun -> SES
 *    later by changing only this function, not every caller.
 *  - Centralized template registry (template_id resolves to the right
 *    SendGrid dynamic-template ID).
 *  - Future delivery webhooks (open/click/bounce) terminate at this
 *    function and write back to Firestore for ops visibility.
 *  - Function logs are owner-visible in the Firebase console; runner
 *    logs don't expose vendor errors directly.
 *
 * Deploy:
 *  cd coastal-brewing/firebase-functions/send-email
 *  npm install
 *  firebase deploy --only functions:sendEmail --project ai-managed-services
 *
 * After deploy, set env on coastal-runner:
 *  COASTAL_EMAIL_FUNCTION_URL=https://<region>-ai-managed-services.cloudfunctions.net/sendEmail
 *  COASTAL_EMAIL_FUNCTION_SECRET=<random hex 64>
 *  (function secret env via `firebase functions:secrets:set ...`)
 */
const functions = __importStar(require("firebase-functions"));
const crypto = __importStar(require("crypto"));
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const COASTAL_EMAIL_FUNCTION_SECRET = process.env.COASTAL_EMAIL_FUNCTION_SECRET || "";
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
function verifySignature(rawBody, signature) {
    if (!COASTAL_EMAIL_FUNCTION_SECRET)
        return false;
    const expected = crypto
        .createHmac("sha256", COASTAL_EMAIL_FUNCTION_SECRET)
        .update(rawBody)
        .digest("hex");
    // timing-safe comparison
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
exports.sendEmail = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "method not allowed" });
        return;
    }
    const signature = (req.get("X-Coastal-Signature") || "").trim();
    const rawBody = JSON.stringify(req.body);
    if (!verifySignature(rawBody, signature)) {
        res.status(401).json({ error: "invalid signature" });
        return;
    }
    // Replay-window check — issued_at must be within 5 minutes
    const body = req.body;
    const now = Math.floor(Date.now() / 1000);
    if (body.issued_at && Math.abs(now - body.issued_at) > 300) {
        res.status(401).json({ error: "request expired" });
        return;
    }
    if (!SENDGRID_API_KEY) {
        res.status(503).json({ error: "SENDGRID_API_KEY not configured" });
        return;
    }
    // Compose SendGrid v3 payload. Plain HTML+text — no dynamic template
    // for v1; the runner-side composer in email_adapter.py owns the body.
    // Switch to SendGrid dynamic templates later when we add ship-notif /
    // order-confirmation / subscription-renewal flows that benefit from
    // editable templates.
    const sendgridPayload = {
        personalizations: [{ to: [{ email: body.to }] }],
        from: parseFromAddress(body.from),
        subject: body.subject,
        content: [
            { type: "text/plain", value: body.text || stripHtml(body.html) },
            { type: "text/html", value: body.html },
        ],
        categories: [body.template_id || "transactional_basic"],
    };
    try {
        const sgRes = await fetch(SENDGRID_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${SENDGRID_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(sendgridPayload),
        });
        if (sgRes.status === 202) {
            const messageId = sgRes.headers.get("x-message-id") || "";
            res.status(200).json({ ok: true, message_id: messageId });
            return;
        }
        const errBody = await sgRes.text();
        functions.logger.warn("sendgrid error", {
            status: sgRes.status,
            body: errBody.slice(0, 500),
        });
        res.status(502).json({ error: `sendgrid ${sgRes.status}` });
    }
    catch (e) {
        functions.logger.error("sendgrid fetch failed", e);
        res.status(502).json({ error: "sendgrid request failed" });
    }
});
function parseFromAddress(from) {
    // Match "Name <email@host>" or bare "email@host"
    const m = from.match(/^(.*?)<([^>]+)>$/);
    if (m) {
        return { name: m[1].trim(), email: m[2].trim() };
    }
    return { email: from.trim() };
}
function stripHtml(html) {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
//# sourceMappingURL=index.js.map
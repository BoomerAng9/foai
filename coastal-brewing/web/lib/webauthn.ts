// Browser-side helpers for navigator.credentials.create / get.
// Converts base64url ↔ ArrayBuffer for the WebAuthn API spec.

const b64urlToBuf = (s: string): ArrayBuffer => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
};

const bufToB64url = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export async function webauthnEnroll(email: string) {
  const optsResp = await fetch("/api/v1/owner/enroll-start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    credentials: "include",
  });
  if (!optsResp.ok) {
    const body = await optsResp.json().catch(() => ({}));
    throw new Error(body.detail ?? `enroll-start failed: ${optsResp.status}`);
  }
  const opts = await optsResp.json();
  // Re-hydrate base64url-encoded fields the webauthn lib emits.
  opts.challenge = b64urlToBuf(opts.challenge);
  opts.user.id = b64urlToBuf(opts.user.id);
  if (opts.excludeCredentials) {
    opts.excludeCredentials = opts.excludeCredentials.map((c: { id: string; type: string; transports?: string[] }) => ({
      ...c,
      id: b64urlToBuf(c.id),
    }));
  }

  const credential = (await navigator.credentials.create({ publicKey: opts })) as PublicKeyCredential;
  const attestation = credential.response as AuthenticatorAttestationResponse;

  const credentialJson = {
    id: credential.id,
    rawId: bufToB64url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: bufToB64url(attestation.attestationObject),
      clientDataJSON: bufToB64url(attestation.clientDataJSON),
    },
  };

  const finishResp = await fetch("/api/v1/owner/enroll-finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, credential: credentialJson }),
    credentials: "include",
  });
  if (!finishResp.ok) {
    const body = await finishResp.json().catch(() => ({}));
    throw new Error(body.detail ?? `enroll-finish failed: ${finishResp.status}`);
  }
  return finishResp.json();
}

export async function webauthnChallenge(email: string) {
  const optsResp = await fetch("/api/v1/owner/challenge-start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    credentials: "include",
  });
  if (!optsResp.ok) {
    const body = await optsResp.json().catch(() => ({}));
    throw new Error(body.detail ?? `challenge-start failed: ${optsResp.status}`);
  }
  const opts = await optsResp.json();
  opts.challenge = b64urlToBuf(opts.challenge);
  if (opts.allowCredentials) {
    opts.allowCredentials = opts.allowCredentials.map((c: { id: string; type: string; transports?: string[] }) => ({
      ...c,
      id: b64urlToBuf(c.id),
    }));
  }

  const credential = (await navigator.credentials.get({ publicKey: opts })) as PublicKeyCredential;
  const assertion = credential.response as AuthenticatorAssertionResponse;

  const credentialJson = {
    id: credential.id,
    rawId: bufToB64url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: bufToB64url(assertion.authenticatorData),
      clientDataJSON: bufToB64url(assertion.clientDataJSON),
      signature: bufToB64url(assertion.signature),
      userHandle: assertion.userHandle ? bufToB64url(assertion.userHandle) : null,
    },
  };

  const finishResp = await fetch("/api/v1/owner/challenge-finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, credential: credentialJson }),
    credentials: "include",
  });
  if (!finishResp.ok) {
    const body = await finishResp.json().catch(() => ({}));
    throw new Error(body.detail ?? `challenge-finish failed: ${finishResp.status}`);
  }
  return finishResp.json();
}

import { startSession, endSession, type SessionStartResp } from "./companionApi";

export type TranslationStreamHandle = {
  sessionId: string;
  startedAt: number;
  stop: () => Promise<void>;
};

export type StartOpts = {
  sourceLang: string;
  targetLang: string;
  onCaption: (text: string) => void;
  onError?: (err: Error) => void;
};

export async function startTranslationStream(opts: StartOpts): Promise<TranslationStreamHandle> {
  const sess: SessionStartResp = await startSession(opts.sourceLang, opts.targetLang);
  const startedAt = Date.now();

  const ws = new WebSocket(sess.ws_url);
  ws.binaryType = "arraybuffer";

  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: "audio/webm" });

  mediaRecorder.ondataavailable = async (ev) => {
    if (ev.data.size > 0 && ws.readyState === WebSocket.OPEN) {
      const buf = await ev.data.arrayBuffer();
      ws.send(buf);
    }
  };

  ws.onmessage = (ev) => {
    if (typeof ev.data === "string") {
      try {
        const parsed = JSON.parse(ev.data);
        if (parsed.text) opts.onCaption(parsed.text);
      } catch {
        opts.onCaption(ev.data);
      }
    }
  };

  ws.onerror = () => opts.onError?.(new Error("translation socket error"));
  ws.onclose = (ev) => {
    if (ev.code >= 4400) {
      opts.onError?.(new Error(`socket closed ${ev.code}: ${ev.reason}`));
    }
  };

  ws.addEventListener("open", () => {
    mediaRecorder.start(200);
  });

  async function stop() {
    try { mediaRecorder.stop(); } catch {}
    try { mediaStream.getTracks().forEach((t) => t.stop()); } catch {}
    try { ws.close(); } catch {}
    const minutesUsed = (Date.now() - startedAt) / 60000;
    try { await endSession(sess.session_id, minutesUsed); } catch {}
  }

  return { sessionId: sess.session_id, startedAt, stop };
}

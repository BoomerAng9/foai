export interface MultiModalResponse {
  text: string;
  audio?: Uint8Array;
  metadata?: Record<string, unknown>;
}

export function composeResponse(parts: Array<string | Record<string, unknown>>, synthesizer?: (txt: string) => Promise<Uint8Array>): Promise<MultiModalResponse> {
  const textOut = parts.map((p) => (typeof p === "string" ? p : JSON.stringify(p))).join("\n");
  
  if (synthesizer) {
    return synthesizer(textOut).then((audioBytes) => ({
      text: textOut,
      audio: audioBytes
    }));
  }
  
  return Promise.resolve({
    text: textOut
  });
}

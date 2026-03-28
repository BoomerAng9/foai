export interface VoiceInputAdapter {
  transcribe(audioChunk: Uint8Array): Promise<string>;
}

export interface VoiceOutputAdapter {
  synthesize(text: string, voice: string): Promise<Uint8Array>;
}

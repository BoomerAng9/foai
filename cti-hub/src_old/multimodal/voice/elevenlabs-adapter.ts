import { VoiceOutputAdapter } from "./voice-adapter";

export class ElevenLabsAdapter implements VoiceOutputAdapter {
  private apiKey: string;
  private endpoint = "https://api.elevenlabs.io/v1/text-to-speech";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async synthesize(text: string, voiceId: string = "pNInz6obbfdqG"): Promise<Uint8Array> {
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key is missing");
    }
    
    // In a real implementation this would stream POST to elevenlabs endpoint.
    // Simulating API call for now:
    return Promise.resolve(new Uint8Array([0x00, 0x01, 0x02, 0x03])); // Fake audio bytes
  }
}

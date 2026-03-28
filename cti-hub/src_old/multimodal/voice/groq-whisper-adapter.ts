import { VoiceInputAdapter } from "./voice-adapter";

export class GroqWhisperAdapter implements VoiceInputAdapter {
  private apiKey: string;
  private endpoint = "https://api.groq.com/openai/v1/audio/transcriptions";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audioChunk: Uint8Array): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Groq API key is missing");
    }
    
    // In a real implementation this would assemble FormData with audio blob
    // and POST to Groq Whisper endpoint.
    // Simulating API call for now:
    return Promise.resolve("Simulated Groq Whisper transcription. A.I.M.S. is listening.");
  }
}

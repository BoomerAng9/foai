import { describe, it, expect, vi } from "vitest";
import { GroqWhisperAdapter } from "../../src/multimodal/voice/groq-whisper-adapter";
import { ElevenLabsAdapter } from "../../src/multimodal/voice/elevenlabs-adapter";
import { OpenAIVisionAdapter } from "../../src/multimodal/vision/openai-vision-adapter";
import { composeResponse } from "../../src/multimodal/composer/response-composer";

describe("Phase 2 - Multimodal Integration", () => {
  it("should transcribe voice input using Groq Whisper", async () => {
    const groqAdapter = new GroqWhisperAdapter("test-key");
    const bytes = new Uint8Array([0x10, 0x20]);
    const tx = await groqAdapter.transcribe(bytes);
    
    expect(tx).toContain("A.I.M.S. is listening");
  });

  it("should fail gracefully if Groq Whisper key is missing", async () => {
    const groqAdapter = new GroqWhisperAdapter("");
    await expect(groqAdapter.transcribe(new Uint8Array())).rejects.toThrow(/missing/);
  });

  it("should synthesize voice output using ElevenLabs", async () => {
    const elAdapter = new ElevenLabsAdapter("test-key");
    const audio = await elAdapter.synthesize("Operation successful");
    
    expect(audio.length).toBeGreaterThan(0);
  });

  it("should describe images via OpenAI Vision Adapter", async () => {
    const oVAdapter = new OpenAIVisionAdapter("test-key");
    const result = await oVAdapter.describeImage(new Uint8Array());
    
    expect(result.summary).toContain("A.I.M.S.");
    expect(result.tags).toContain("Schematic");
  });

  it("should compose multimodal responses correctly", async () => {
    const synthesizer = vi.fn().mockResolvedValue(new Uint8Array([0x55, 0xAA]));
    const textPart = "A.I.M.S. Engine online.";
    const metaPart = { status: "OK", level: 1 };
    
    const response = await composeResponse([textPart, metaPart], synthesizer);
    
    expect(response.text).toContain("A.I.M.S. Engine online.");
    expect(response.text).toContain("OK");
    expect(response.audio).toBeDefined();
    expect(response.audio![0]).toBe(0x55);
    expect(synthesizer).toHaveBeenCalled();
  });
});

import { GoogleGenerativeAI } from "@google/generative-ai";

export class EmbeddingService {
  private genAI: GoogleGenerativeAI;
  private readonly MODEL_NAME = "gemini-embedding-2-preview";

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Generates embeddings for various multimodal inputs using Gemini Embeddings 2.
   */
  async generateEmbedding(input: string | { text: string; mimeType: string; data: string }) {
    const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });
    
    // Note: The specific implementation for multimodal embeddings (vision/audio)
    // currently maps to the task-aware embedding interfaces.
    if (typeof input === "string") {
      const result = await model.embedContent(input);
      return result.embedding.values;
    } else {
      // Handle multimodal payloads (Future implementation based on specific Gemini 2 SDK updates)
      const result = await model.embedContent(input.text); // Fallback for now
      return result.embedding.values;
    }
  }

  async batchEmbed(texts: string[]) {
    const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });
    const result = await model.batchEmbedContents({
      requests: texts.map((t) => ({ content: { role: "user", parts: [{ text: t }] } })),
    });
    return result.embeddings.map((e) => e.values);
  }
}

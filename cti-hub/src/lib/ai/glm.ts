import axios from 'axios';

export interface GLMResponse {
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GLMClient {
  private apiKey: string;
  private baseUrl: string = 'https://open.bigmodel.cn/api/paas/v4';

  constructor() {
    this.apiKey = process.env.ZHIPU_AI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[GLM] Warning: ZHIPU_AI_API_KEY is not set.');
    }
  }

  /**
   * Universal Chat Completion for GLM-5/GLM-4.7
   */
  public async chat(params: {
    model: 'glm-5' | 'glm-4.7' | 'glm-4v' | string;
    messages: { role: 'user' | 'system' | 'assistant'; content: string }[];
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  }): Promise<GLMResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          ...params,
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('[GLM] API Error:', error.response?.data || error.message);
        throw new Error(`GLM API Request failed: ${error.message}`);
      }
      console.error('[GLM] Unknown Error:', error);
      throw new Error('GLM API Request failed due to an unknown error');
    }
  }
}

export const glm = new GLMClient();

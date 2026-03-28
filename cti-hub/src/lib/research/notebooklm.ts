import axios from 'axios';

export interface NotebookSource {
  id: string;
  title: string;
  type: 'document' | 'url' | 'youtube' | 'text';
  status: 'processing' | 'ready' | 'failed';
  wordCount?: number;
  tokenCount?: number;
}

export interface ResearchResponse {
  answer: string;
  citations: {
    sourceId: string;
    sourceTitle: string;
    excerpt: string;
    pageNumber?: number;
  }[];
}

class NotebookLMClient {
  private apiKey: string;
  private accessToken: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NOTEBOOKLM_API_KEY || '';
    this.accessToken = process.env.NOTEBOOKLM_ACCESS_TOKEN || '';
    const projectId = process.env.GCP_PROJECT_ID || '';
    const location = process.env.NOTEBOOKLM_LOCATION || 'global';
    this.baseUrl = `https://us-discoveryengine.googleapis.com/v1alpha/projects/${projectId}/locations/${location}/notebooks`;
  }

  private getHeaders() {
    if (this.accessToken) {
      return { Authorization: `Bearer ${this.accessToken}` };
    }

    if (this.apiKey) {
      return { 'x-goog-api-key': this.apiKey };
    }

    throw new Error('NotebookLM is not configured. Set NOTEBOOKLM_ACCESS_TOKEN or NOTEBOOKLM_API_KEY.');
  }

  /**
   * Create a new research notebook (maps to GRAMMAR Context Pack)
   */
  async createNotebook(title: string): Promise<string> {
    try {
      const response = await axios.post(
        this.baseUrl,
        { displayName: title },
        { headers: this.getHeaders() }
      );
      return response.data.name; // Format: projects/.../notebooks/{id}
    } catch (error) {
      console.error('[NotebookLM] Error creating notebook:', error);
      throw new Error('Failed to create research notebook');
    }
  }

  /**
   * Add a data source to the Technical Language Index
   */
  async addSource(notebookId: string, source: Partial<NotebookSource> & { content?: string, url?: string }): Promise<string> {
    const url = `${this.baseUrl}/${notebookId}/sources:batchCreate`;
    
    let sourceConfig: Record<string, unknown> = {};
    if (source.type === 'url') {
      sourceConfig = { webContent: { url: source.url, sourceName: source.title } };
    } else if (source.type === 'text') {
      sourceConfig = { textContent: { content: source.content, sourceName: source.title } };
    } else if (source.type === 'youtube') {
      sourceConfig = { videoContent: { youtubeUrl: source.url } };
    }

    try {
      const response = await axios.post(
        url,
        { requests: [{ source: sourceConfig }] },
        { headers: this.getHeaders() }
      );
      return response.data.sourceIds[0];
    } catch (error) {
      console.error('[NotebookLM] Error adding source:', error);
      throw new Error('Failed to add data source to TLI');
    }
  }

  /**
   * Query the notebook for deep research
   */
  async query(notebookId: string, prompt: string): Promise<ResearchResponse> {
    const url = `${this.baseUrl}/${notebookId}:query`;
    
    try {
      const response = await axios.post(
        url,
        { query: prompt, answerGenerationSpec: { modelId: 'gemini-3.1-pro' } },
        { headers: this.getHeaders() }
      );
      
      // Map API response to our ResearchResponse format
      return {
        answer: response.data.answer.content,
        citations: response.data.answer.citations.map((c: { 
          sourceId: string; 
          sourceTitle: string; 
          excerpt: string; 
          pageNumber?: number 
        }) => ({
          sourceId: c.sourceId,
          sourceTitle: c.sourceTitle,
          excerpt: c.excerpt,
          pageNumber: c.pageNumber
        }))
      };
    } catch (error) {
      console.error('[NotebookLM] Query error:', error);
      throw new Error('NotebookLM query failed. Verify API key, project ID, and notebook/source wiring.');
    }
  }
}

export const notebookLM = new NotebookLMClient();

import { glm } from '../ai/glm';

export interface ResearchNode {
  technical_id: string;
  display_name: string;
  description: string;
  capabilities: string[];
  keywords: string[];
}

export class AutoResearchService {
  /**
   * Translate multi-lingual natural language into precise Technical Language Index (TLI) tokens.
   */
  public async translateToTechLang(humanIntent: string, language: string = 'auto'): Promise<{
    original: string;
    technical_translation: string;
    suggested_nodes: string[];
    confidence: number;
  }> {
    const prompt = `
      You are ACHEEVY's advanced intent neutralizer (NTNTN). 
      Your task is to take a human's fuzzy intent in any language and normalize it into our "Technical Language Index" (TLI).
      
      Human Intent (${language}): "${humanIntent}"
      
      Rules:
      1. Extract the CORE OBJECTIVE.
      2. Identify CONSTRAINTS (governance, budget, performance).
      3. Map to Technical Nodes (e.g., API_INTEGRATION, MIM_GOVERNANCE, FRONTEND_UX).
      
      Return JSON:
      {
        "technical_translation": "precise technical description in English",
        "suggested_nodes": ["NODE_ID_1", "NODE_ID_2"],
        "confidence": 0.0-1.0
      }
    `;

    const response = await glm.chat({
      model: 'glm-5',
      messages: [
        { role: 'system', content: 'You are a high-precision technical language translator.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    });

    try {
      const result = JSON.parse(response.choices[0].message.content);
      return {
        original: humanIntent,
        ...result
      };
    } catch {
      // Fallback for non-JSON responses
      const errorMessage = response.choices[0].message.content;
      return {
        original: humanIntent,
        technical_translation: errorMessage,
        suggested_nodes: [],
        confidence: 0.5
      };
    }
  }

  /**
   * Background "Auto-Research" loop based on Karpathy's concept.
   * It takes a problem set and attempts to find better ways to structure the TLI.
   */
  public async runResearchExperiment(objective: string): Promise<{
    findings: string;
    suggested_optimizations: { type: string; description: string; impact: string }[];
  }> {
    console.log(`[AutoResearch] Starting experiment: ${objective}`);
    
    // Step 1: Brainstorm proposals using GLM-5 reasoning
    const proposalResponse = await glm.chat({
      model: 'glm-5',
      messages: [
        { 
          role: 'system', 
          content: 'You are a Research Agent specializing in Technical Language Indexing (TLI) and Agentic Governance.' 
        },
        { 
          role: 'user', 
          content: `Objective: ${objective}\nAnalyze current TLI best practices and propose 3 optimizations.` 
        }
      ],
      temperature: 0.7
    });

    const findings = proposalResponse.choices[0].message.content;
    
    // Step 2: In a real system, we might run this through a "Simulation" 
    // where we check if these optimizations improve execution pass rates.
    
    return {
      findings,
      suggested_optimizations: [] // In a real app, parse from findings
    };
  }
}

export const autoResearch = new AutoResearchService();

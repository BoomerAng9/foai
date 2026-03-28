/**
 * LUC: Locale Universal Calculator
 * 
 * An LLM cost analyzer and task optimizer for the GRAMMAR runtime.
 * Used to calculate costs across different providers and optimize model selection.
 */

export interface ModelPricing {
  id: string;
  name: string;
  provider: string;
  inputCostPer1M: number; // in USD
  outputCostPer1M: number; // in USD
  isFree?: boolean;
  capabilities: ('text' | 'vision' | 'audio' | 'code')[];
}

export const MODELS: ModelPricing[] = [
  // Zhipu AI (GLM)
  {
    id: 'glm-4',
    name: 'GLM-4',
    provider: 'ZhipuAI',
    inputCostPer1M: 1.0,
    outputCostPer1M: 1.0,
    capabilities: ['text', 'code']
  },
  {
    id: 'glm-4v',
    name: 'GLM-4V (Vision)',
    provider: 'ZhipuAI',
    inputCostPer1M: 1.0,
    outputCostPer1M: 1.0,
    capabilities: ['text', 'vision']
  },
  {
    id: 'glm-4-air',
    name: 'GLM-4-Air',
    provider: 'ZhipuAI',
    inputCostPer1M: 0.1,
    outputCostPer1M: 0.1,
    capabilities: ['text', 'code']
  },
  {
    id: 'glm-4-flash',
    name: 'GLM-4-Flash',
    provider: 'ZhipuAI',
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    isFree: true,
    capabilities: ['text', 'code']
  },
  // OpenAI
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    inputCostPer1M: 5.0,
    outputCostPer1M: 15.0,
    capabilities: ['text', 'vision', 'code']
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o-mini',
    provider: 'OpenAI',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    capabilities: ['text', 'vision', 'code']
  },
  // Anthropic
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    capabilities: ['text', 'vision', 'code']
  },
  // DeepSeek (Commonly used for cost optimization)
  {
    id: 'deepseek-chat',
    name: 'DeepSeek-V3',
    provider: 'DeepSeek',
    inputCostPer1M: 0.2,
    outputCostPer1M: 0.2, // Rough estimates
    capabilities: ['text', 'code']
  }
];

export interface TaskDefinition {
  name: string;
  avgInputTokens: number;
  avgOutputTokens: number;
  requiredCapabilities: ('text' | 'vision' | 'audio' | 'code')[];
}

export const TASKS: Record<string, TaskDefinition> = {
  'intent-neutralization': {
    name: 'Intent Neutralization',
    avgInputTokens: 500,
    avgOutputTokens: 200,
    requiredCapabilities: ['text']
  },
  'tli-ingestion': {
    name: 'TLI Source Ingestion',
    avgInputTokens: 5000,
    avgOutputTokens: 1000,
    requiredCapabilities: ['text', 'code']
  },
  'research-query': {
    name: 'Research Query',
    avgInputTokens: 2000,
    avgOutputTokens: 1500,
    requiredCapabilities: ['text']
  },
  'vision-audit': {
    name: 'Vision Governance Audit',
    avgInputTokens: 1000,
    avgOutputTokens: 500,
    requiredCapabilities: ['vision']
  }
};

class LucService {
  /**
   * Calculate cost for a specific model and token count
   */
  calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = MODELS.find(m => m.id === modelId);
    if (!model) return 0;
    
    const inputCost = (inputTokens / 1_000_000) * model.inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * model.outputCostPer1M;
    
    return inputCost + outputCost;
  }

  /**
   * Find the most cost-effective model for a given task
   */
  optimizeForTask(taskName: string): { modelId: string; estimatedCost: number } {
    const task = TASKS[taskName];
    if (!task) return { modelId: 'gpt-4o-mini', estimatedCost: 0 };

    const compatibleModels = MODELS.filter(m => 
      task.requiredCapabilities.every(cap => m.capabilities.includes(cap))
    );

    let bestModel = compatibleModels[0];
    let minCost = Infinity;

    for (const model of compatibleModels) {
      const cost = this.calculateCost(model.id, task.avgInputTokens, task.avgOutputTokens);
      if (cost < minCost) {
        minCost = cost;
        bestModel = model;
      }
    }

    return {
      modelId: bestModel?.id || 'gpt-4o-mini',
      estimatedCost: minCost
    };
  }

  /**
   * Compare models for a specific token count
   */
  compareModels(inputTokens: number, outputTokens: number) {
    return MODELS.map(model => ({
      modelId: model.id,
      name: model.name,
      provider: model.provider,
      cost: this.calculateCost(model.id, inputTokens, outputTokens)
    })).sort((a, b) => a.cost - b.cost);
  }
}

export const luc = new LucService();

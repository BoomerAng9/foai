import { paywallService, MIMPolicy } from '../lib/auth-paywall';
import { sql } from '../lib/insforge';

export interface MIMContextPack {
  organization_id: string;
  policies: MIMPolicy[];
  memory_vectors: string[];
  revision_history: unknown[];
}

interface GovernedAction {
  type?: string;
  role?: string;
  directive?: string;
  plan?: unknown;
  [key: string]: unknown;
}

export const mim = {
  getGovernedContext: async (orgId: string): Promise<MIMContextPack> => {
    const { data: policies } = await paywallService.getPolicies(orgId);
    return {
      organization_id: orgId,
      policies: policies || [],
      memory_vectors: [],
      revision_history: []
    };
  },

  validateExecution: async (action: GovernedAction, context: MIMContextPack): Promise<{ approved: boolean; reason?: string }> => {
    for (const policy of context.policies) {
      if (!policy.is_active) continue;

      const matchesRule = (rule: string) => {
        const lowerRule = rule.toLowerCase();
        return action.type?.toLowerCase().includes(lowerRule) ||
               action.role?.toLowerCase().includes(lowerRule) ||
               action.directive?.toLowerCase().includes(lowerRule);
      };

      if (policy.type === 'security') {
        const restrictedKeywords = policy.rules?.filter(r => typeof r === 'string') || [];
        for (const keyword of restrictedKeywords) {
          if (matchesRule(keyword)) {
             return {
              approved: false,
              reason: `Security Block: Action matches restricted rule '${keyword}' in policy '${policy.name}'`
            };
          }
        }
      }

      if (policy.type === 'operational' && action.type === 'external_request') {
        if (policy.description.toLowerCase().includes('restricted') || policy.description.toLowerCase().includes('audit only')) {
           console.log(`MIM [OPERATIONAL]: Auditing external request per policy: ${policy.name}`);
        }
      }
    }

    return { approved: true };
  },

  syncMemory: async (orgId: string, content: string): Promise<void> => {
    if (!sql) return;

    try {
      console.log(`MIM: Syncing memory for Org: ${orgId}`);
      // Store content in memory_store (embedding generation deferred to a separate pipeline)
      await sql`
        INSERT INTO memory_store (organization_id, content, created_at)
        VALUES (${orgId}, ${content}, NOW())
      `;
      console.log(`MIM: Memory synchronized successfully.`);
    } catch (error) {
      console.error(`MIM: Memory sync failed:`, error);
    }
  }
};

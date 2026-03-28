import { authService, paywallService } from '../lib/auth-paywall';
import { sql } from '../lib/insforge';

export const onboardingService = {
  async onboardCustomer(userId: string, orgName: string) {
    console.log(`Onboarding: Starting for user ${userId}, Org: ${orgName}`);

    try {
      const org = await authService.createOrganization(userId, orgName);
      console.log(`Onboarding: Org created with ID: ${org.id}`);

      const defaultPolicies = [
        {
          organization_id: org.id,
          name: 'Core Security Filter',
          description: 'Restricts external requests to approved domains.',
          type: 'security' as const,
          rules: ['external_request', 'untrusted_api'],
          is_active: true
        },
        {
          organization_id: org.id,
          name: 'Operational Audit',
          description: 'Logs all high-LUC actions for financial governance.',
          type: 'operational' as const,
          rules: ['high_cost_tool'],
          is_active: true
        },
        {
          organization_id: org.id,
          name: 'Memory Discipline',
          description: 'Ensures all outputs conform to the organizational memory schema.',
          type: 'technical' as const,
          rules: ['schema_validation'],
          is_active: true
        }
      ];

      for (const policy of defaultPolicies) {
        await paywallService.createPolicy(policy);
      }
      console.log(`Onboarding: Default MIM policies provisioned.`);

      if (sql) {
        await sql`
          INSERT INTO memory_store (organization_id, content, created_at)
          VALUES (${org.id}, ${`Welcome to GRAMMAR. Organization ${orgName} has been successfully initialized.`}, NOW())
        `;
      }

      return {
        success: true,
        orgId: org.id,
        message: 'Customer onboarded successfully with governed runtime.'
      };
    } catch (error: unknown) {
      console.error('Onboarding Error:', error);
      throw error;
    }
  }
};

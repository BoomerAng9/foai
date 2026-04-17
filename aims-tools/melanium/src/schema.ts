/**
 * Melanium zod schemas. Match the Neon column shapes in
 * migrations/001_init.up.sql.
 */

import { z } from 'zod';

export const MelaniumEventTypeSchema = z.enum([
  'credit_earned',
  'credit_spent',
  'referral_bonus',
  'referral_match',
  'adjustment',
  'refund',
]);
export type MelaniumEventType = z.infer<typeof MelaniumEventTypeSchema>;

export const MelaniumTransactionSchema = z.object({
  transactionId: z.string().min(1),
  engagementId: z.string().nullable().optional(),
  customerId: z.string().min(1),
  providerCost: z.number().nonnegative(),
  achievemorMargin: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  digitalMaintenanceFee: z.number().nonnegative(),
  totalCustomerCharge: z.number().nonnegative(),
  achievemorVaultAmount: z.number().nonnegative(),
  customerBalanceAmount: z.number().nonnegative(),
  vaultId: z.string().default('melanium_vault_001'),
  currency: z.string().default('USD'),
  createdAt: z.string().datetime().optional(),
});
export type MelaniumTransaction = z.infer<typeof MelaniumTransactionSchema>;

export const CustomerBalanceSchema = z.object({
  customerId: z.string().min(1),
  balanceUsd: z.number().nonnegative(),
  lifetimeCreditsEarned: z.number().nonnegative(),
  lifetimeCreditsSpent: z.number().nonnegative(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type CustomerBalance = z.infer<typeof CustomerBalanceSchema>;

export const CustomerBalanceEventSchema = z.object({
  id: z.number().int().positive().optional(),
  customerId: z.string().min(1),
  eventType: MelaniumEventTypeSchema,
  amount: z.number(),                                    // signed
  balanceBefore: z.number().nonnegative(),
  balanceAfter: z.number().nonnegative(),
  transactionId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string().datetime().optional(),
});
export type CustomerBalanceEvent = z.infer<typeof CustomerBalanceEventSchema>;

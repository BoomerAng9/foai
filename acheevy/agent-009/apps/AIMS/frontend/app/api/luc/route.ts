/**
 * LUC API Routes
 *
 * REST endpoints for LUC Engine operations.
 * Used by both the UI calculator and Boomer_Ang orchestration.
 *
 * PRODUCTION-READY: Uses file-based persistent storage.
 * SECURITY: All inputs validated and sanitized
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createLUCEngine,
  serializeLUCAccount,
  LUCServiceKey,
  SERVICE_BUCKETS,
  LUC_PLANS,
} from '@/lib/luc/luc-engine';
import {
  getServerStorage,
  getLUCServerManager,
} from '@/lib/luc/server-storage';
import { INDUSTRY_PRESETS, getPreset, getPresetsByCategory } from '@/lib/luc/luc-presets';
import { validateId, validateLUCRequest } from '@/lib/security/validation';

// ─────────────────────────────────────────────────────────────
// Initialize Storage (File-based persistence)
// ─────────────────────────────────────────────────────────────

const storage = getServerStorage();
const accountManager = getLUCServerManager();

// ─────────────────────────────────────────────────────────────
// GET /api/luc - Get LUC summary
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUserId = searchParams.get('userId') || 'default-user';
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    // Validate userId - NO BACKDOORS
    const userIdValidation = validateId(rawUserId, 'userId');
    if (!userIdValidation.valid) {
      return NextResponse.json({ success: false, error: userIdValidation.error }, { status: 400 });
    }
    const userId = userIdValidation.sanitized || 'default-user';

    const account = await storage.getOrCreateAccount(userId);
    const engine = createLUCEngine(account);
    const summary = engine.getSummary();

    const response: any = {
      success: true,
      summary,
      account: serializeLUCAccount(account),
    };

    // Include usage history if requested
    if (includeHistory) {
      response.usageHistory = await accountManager.getUsageHistory(userId, 50);
    }

    // Include account statistics if requested
    if (includeStats) {
      response.stats = await accountManager.getAccountStats(userId);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[LUC API] Error getting summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get LUC summary' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/luc - LUC operations
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate all inputs - NO BACKDOORS
    const validation = validateLUCRequest(body);
    if (!validation.valid || !validation.data) {
      console.warn(`[LUC API] Validation failed: ${validation.error}`);
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const { action, userId, service, amount, planId, format, data, presetId } = validation.data;

    const account = await storage.getOrCreateAccount(userId);
    const engine = createLUCEngine(account);

    switch (action) {
      // ─────────────────────────────────────────────────────
      // Quote: Estimate impact without debiting
      // ─────────────────────────────────────────────────────
      case 'quote': {
        if (!service || amount === undefined) {
          return NextResponse.json(
            { success: false, error: 'Missing service or amount' },
            { status: 400 }
          );
        }

        const quote = engine.quote(service as LUCServiceKey, amount);
        return NextResponse.json({ success: true, quote });
      }

      // ─────────────────────────────────────────────────────
      // Can Execute: Check if action is allowed
      // ─────────────────────────────────────────────────────
      case 'can-execute': {
        if (!service || amount === undefined) {
          return NextResponse.json(
            { success: false, error: 'Missing service or amount' },
            { status: 400 }
          );
        }

        const result = engine.canExecute(service as LUCServiceKey, amount);
        return NextResponse.json({ success: true, result });
      }

      // ─────────────────────────────────────────────────────
      // Debit: Record usage after successful action
      // ─────────────────────────────────────────────────────
      case 'debit': {
        if (!service || amount === undefined) {
          return NextResponse.json(
            { success: false, error: 'Missing service or amount' },
            { status: 400 }
          );
        }

        const result = engine.debit(service as LUCServiceKey, amount);
        const updatedAccount = engine.getAccount();

        // Persist account changes
        await storage.saveAccount(updatedAccount);

        // Record in usage history
        await accountManager.recordDebit(
          userId,
          service as LUCServiceKey,
          amount,
          result.overageCost,
          (validation.data as any).description || `${service} usage`
        );

        return NextResponse.json({
          success: true,
          result,
          account: serializeLUCAccount(updatedAccount),
        });
      }

      // ─────────────────────────────────────────────────────
      // Credit: Reverse usage (for rollbacks)
      // ─────────────────────────────────────────────────────
      case 'credit': {
        if (!service || amount === undefined) {
          return NextResponse.json(
            { success: false, error: 'Missing service or amount' },
            { status: 400 }
          );
        }

        const result = engine.credit(service as LUCServiceKey, amount);
        const updatedAccount = engine.getAccount();

        // Persist account changes
        await storage.saveAccount(updatedAccount);

        // Record in usage history
        await accountManager.recordCredit(
          userId,
          service as LUCServiceKey,
          amount,
          (validation.data as any).description || `${service} credit/refund`
        );

        return NextResponse.json({
          success: true,
          result,
          account: serializeLUCAccount(updatedAccount),
        });
      }

      // ─────────────────────────────────────────────────────
      // Update Plan
      // ─────────────────────────────────────────────────────
      case 'update-plan': {
        if (!planId) {
          return NextResponse.json(
            { success: false, error: 'Missing planId' },
            { status: 400 }
          );
        }

        const updatedAccount = await accountManager.changePlan(userId, planId);
        const newEngine = createLUCEngine(updatedAccount);

        return NextResponse.json({
          success: true,
          message: `Plan updated to ${planId}`,
          summary: newEngine.getSummary(),
          account: serializeLUCAccount(updatedAccount),
        });
      }

      // ─────────────────────────────────────────────────────
      // Reset Billing Cycle
      // ─────────────────────────────────────────────────────
      case 'reset-cycle': {
        const updatedAccount = await accountManager.resetBillingCycle(userId);
        const newEngine = createLUCEngine(updatedAccount);

        return NextResponse.json({
          success: true,
          message: 'Billing cycle reset',
          summary: newEngine.getSummary(),
          account: serializeLUCAccount(updatedAccount),
        });
      }

      // ─────────────────────────────────────────────────────
      // Get Service Definitions
      // ─────────────────────────────────────────────────────
      case 'get-services': {
        return NextResponse.json({
          success: true,
          services: SERVICE_BUCKETS,
          plans: LUC_PLANS,
        });
      }

      // ─────────────────────────────────────────────────────
      // Get Usage History
      // ─────────────────────────────────────────────────────
      case 'get-history': {
        const limit = (validation.data as any).limit || 100;
        const history = await accountManager.getUsageHistory(userId, limit);

        return NextResponse.json({
          success: true,
          history,
          count: history.length,
        });
      }

      // ─────────────────────────────────────────────────────
      // Get Account Statistics
      // ─────────────────────────────────────────────────────
      case 'get-stats': {
        const stats = await accountManager.getAccountStats(userId);

        return NextResponse.json({
          success: true,
          stats,
        });
      }

      // ─────────────────────────────────────────────────────
      // Export Data
      // ─────────────────────────────────────────────────────
      case 'export': {
        const exportFormat = (format || 'json') as 'json' | 'csv';
        const exportData = await accountManager.exportData(userId, exportFormat);

        return NextResponse.json({
          success: true,
          format: exportFormat,
          data: exportData,
          filename: `luc-export-${userId}-${new Date().toISOString().split('T')[0]}.${exportFormat}`,
        });
      }

      // ─────────────────────────────────────────────────────
      // Import Data
      // ─────────────────────────────────────────────────────
      case 'import': {
        if (!data) {
          return NextResponse.json(
            { success: false, error: 'Missing import data' },
            { status: 400 }
          );
        }

        await accountManager.importData(userId, data as string);
        const updatedAccount = await storage.getOrCreateAccount(userId);

        return NextResponse.json({
          success: true,
          message: 'Data imported successfully',
          account: serializeLUCAccount(updatedAccount),
        });
      }

      // ─────────────────────────────────────────────────────
      // Get Industry Presets
      // ─────────────────────────────────────────────────────
      case 'get-presets': {
        const category = (validation.data as any).category;
        const presets = category ? getPresetsByCategory(category) : INDUSTRY_PRESETS;

        return NextResponse.json({
          success: true,
          presets,
          count: presets.length,
        });
      }

      // ─────────────────────────────────────────────────────
      // Apply Industry Preset
      // ─────────────────────────────────────────────────────
      case 'apply-preset': {
        if (!presetId) {
          return NextResponse.json(
            { success: false, error: 'Missing presetId' },
            { status: 400 }
          );
        }

        const preset = getPreset(presetId as string);
        if (!preset) {
          return NextResponse.json(
            { success: false, error: `Preset not found: ${presetId}` },
            { status: 404 }
          );
        }

        // Change to recommended plan
        const updatedAccount = await accountManager.changePlan(userId, preset.recommendedPlan);
        const newEngine = createLUCEngine(updatedAccount);

        return NextResponse.json({
          success: true,
          message: `Applied preset: ${preset.name}`,
          preset,
          summary: newEngine.getSummary(),
          account: serializeLUCAccount(updatedAccount),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[LUC API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

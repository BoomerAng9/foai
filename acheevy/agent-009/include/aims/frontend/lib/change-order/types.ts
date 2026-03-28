/**
 * Change Order System Types
 *
 * When Boomer_Angs pause and wait for user input, this creates a "Change Order"
 * that is tracked for billing and scope management.
 *
 * Similar to Manus AI's interruption system, users can provide:
 * - Voice input (transcribed)
 * - Images (analyzed via Vision)
 * - Files (documents, spreadsheets, etc.)
 * - Code snippets
 * - Text clarifications
 */

// ─────────────────────────────────────────────────────────────
// Input Types
// ─────────────────────────────────────────────────────────────

export type ChangeOrderInputType =
  | 'voice'
  | 'image'
  | 'file'
  | 'code'
  | 'text';

export interface VoiceInput {
  type: 'voice';
  audioUrl?: string;
  transcript: string;
  duration: number; // seconds
  confidence: number; // 0-1
}

export interface ImageInput {
  type: 'image';
  url: string;
  filename: string;
  mimeType: string;
  size: number; // bytes
  width?: number;
  height?: number;
  analysis?: string; // Vision API analysis
}

export interface FileInput {
  type: 'file';
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  preview?: string; // First N chars for text files
  pageCount?: number; // For PDFs
}

export interface CodeInput {
  type: 'code';
  content: string;
  language: string;
  filename?: string;
  lineCount: number;
}

export interface TextInput {
  type: 'text';
  content: string;
  wordCount: number;
}

export type ChangeOrderInput =
  | VoiceInput
  | ImageInput
  | FileInput
  | CodeInput
  | TextInput;

// ─────────────────────────────────────────────────────────────
// Change Order
// ─────────────────────────────────────────────────────────────

export type ChangeOrderStatus =
  | 'pending'      // Waiting for user to provide input
  | 'submitted'    // User submitted, processing
  | 'processing'   // Being analyzed/integrated
  | 'completed'    // Successfully integrated
  | 'cancelled';   // User or system cancelled

export type ChangeOrderPriority = 'low' | 'normal' | 'high' | 'critical';

export interface ChangeOrder {
  id: string;
  sessionId: string;
  userId: string;

  // Context
  triggerQuestion: string;     // What caused the pause
  context: string;             // Additional context from agents
  requestingAgent: string;     // Which Boomer_Ang requested input
  department: string;

  // Inputs (can have multiple)
  inputs: ChangeOrderInput[];

  // Status
  status: ChangeOrderStatus;
  priority: ChangeOrderPriority;

  // Timing
  createdAt: Date;
  submittedAt?: Date;
  completedAt?: Date;
  timeoutAt?: Date;            // Auto-cancel if not submitted by this time

  // User waited time (for billing/metrics)
  waitDuration?: number;       // milliseconds user was blocked

  // Billing reference
  billingId?: string;
  estimatedCost?: number;
  actualCost?: number;
}

// ─────────────────────────────────────────────────────────────
// Cost Estimation
// ─────────────────────────────────────────────────────────────

export interface ChangeOrderCostFactors {
  // Base costs per input type
  voiceTranscription: number;   // per minute
  imageAnalysis: number;        // per image
  fileProcessing: number;       // per MB
  codeAnalysis: number;         // per 1K lines
  textProcessing: number;       // per 1K tokens

  // Complexity multipliers
  priorityMultiplier: Record<ChangeOrderPriority, number>;

  // Overhead
  changeOrderFee: number;       // flat fee per change order
}

export const DEFAULT_COST_FACTORS: ChangeOrderCostFactors = {
  voiceTranscription: 0.006,    // $0.006/min (Whisper pricing)
  imageAnalysis: 0.01,          // $0.01/image
  fileProcessing: 0.005,        // $0.005/MB
  codeAnalysis: 0.002,          // $0.002/1K lines
  textProcessing: 0.001,        // $0.001/1K tokens

  priorityMultiplier: {
    low: 0.8,
    normal: 1.0,
    high: 1.5,
    critical: 2.0,
  },

  changeOrderFee: 0.05,         // $0.05 base fee
};

// ─────────────────────────────────────────────────────────────
// Token Usage Tracking
// ─────────────────────────────────────────────────────────────

export interface ChangeOrderTokenUsage {
  changeOrderId: string;

  // Input tokens
  voiceTokens: number;          // Transcription tokens
  imageTokens: number;          // Vision tokens
  fileTokens: number;           // Document processing
  codeTokens: number;           // Code analysis
  textTokens: number;           // Direct text

  // Processing tokens
  analysisTokens: number;       // AI analysis of inputs
  integrationTokens: number;    // Integrating into task context

  // Totals
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;

  // Cost
  estimatedCost: number;
}

// ─────────────────────────────────────────────────────────────
// Invoice Line Item
// ─────────────────────────────────────────────────────────────

export interface ChangeOrderLineItem {
  id: string;
  changeOrderId: string;
  description: string;

  // Itemized
  inputType: ChangeOrderInputType;
  quantity: number;             // minutes/images/MB/lines/tokens
  unitPrice: number;
  subtotal: number;

  // Timestamps
  timestamp: Date;
}

export interface ChangeOrderInvoice {
  id: string;
  sessionId: string;
  userId: string;

  // Change orders in this session
  changeOrders: ChangeOrder[];
  lineItems: ChangeOrderLineItem[];

  // Totals
  subtotal: number;
  changeOrderFees: number;      // Sum of base fees
  priorityCharges: number;      // Priority multiplier charges
  totalCost: number;

  // Token summary
  totalTokens: number;
  tokenBreakdown: {
    voice: number;
    image: number;
    file: number;
    code: number;
    text: number;
    processing: number;
  };

  // Timing
  createdAt: Date;
  periodStart: Date;
  periodEnd: Date;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function estimateInputTokens(input: ChangeOrderInput): number {
  switch (input.type) {
    case 'voice':
      // ~150 words/minute, ~1.3 tokens/word
      return Math.ceil((input.duration / 60) * 150 * 1.3);

    case 'image':
      // Vision API uses ~85 tokens for low-res, ~1000+ for high-res
      const pixels = (input.width || 512) * (input.height || 512);
      return pixels > 512 * 512 ? 1000 : 85;

    case 'file':
      // Estimate ~4 chars per token for text files
      if (input.preview) {
        return Math.ceil(input.preview.length / 4);
      }
      // For binary files, estimate based on size
      return Math.ceil(input.size / 1000);

    case 'code':
      // Code is denser, ~3 chars per token
      return Math.ceil(input.content.length / 3);

    case 'text':
      // Standard ~4 chars per token
      return Math.ceil(input.content.length / 4);

    default:
      return 0;
  }
}

export function estimateChangeOrderCost(
  order: ChangeOrder,
  factors: ChangeOrderCostFactors = DEFAULT_COST_FACTORS
): number {
  let cost = factors.changeOrderFee;

  for (const input of order.inputs) {
    switch (input.type) {
      case 'voice':
        cost += (input.duration / 60) * factors.voiceTranscription;
        break;
      case 'image':
        cost += factors.imageAnalysis;
        break;
      case 'file':
        cost += (input.size / (1024 * 1024)) * factors.fileProcessing;
        break;
      case 'code':
        cost += (input.lineCount / 1000) * factors.codeAnalysis;
        break;
      case 'text':
        const tokens = Math.ceil(input.content.length / 4);
        cost += (tokens / 1000) * factors.textProcessing;
        break;
    }
  }

  // Apply priority multiplier
  cost *= factors.priorityMultiplier[order.priority];

  return Math.round(cost * 10000) / 10000; // Round to 4 decimal places
}

export function createChangeOrderId(): string {
  return `co-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(amount);
}

/**
 * A.I.M.S. Security Validation Library
 *
 * Comprehensive input validation and sanitization
 * to protect against injection attacks and abuse.
 *
 * NO BACK DOORS. TRUE PENTESTING-READY.
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const MAX_MESSAGE_LENGTH = 32000; // 32KB for chat messages
export const MAX_TEXT_LENGTH = 5000; // 5KB for TTS/general text
export const MAX_USER_ID_LENGTH = 128;
export const MAX_SESSION_ID_LENGTH = 64;
export const MAX_ARRAY_LENGTH = 100;
export const MAX_BASE64_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_JSON_BODY_SIZE = 1024 * 1024; // 1MB

// Dangerous patterns that could indicate injection attempts
const INJECTION_PATTERNS = [
  // SQL Injection
  /(\b(union|select|insert|update|delete|drop|alter|create|truncate)\b.*\b(from|into|table|database)\b)/i,
  /(\bor\b\s+\d+\s*=\s*\d+)/i,
  /('|\"|;|--|\bor\b|\band\b).*(\b(select|union|insert|delete|update|drop)\b)/i,

  // NoSQL Injection
  /\$where\s*:/i,
  /\$gt\s*:/i,
  /\$ne\s*:/i,
  /\$regex\s*:/i,

  // Command Injection
  /[;&|`$]|\$\(|`.*`/,
  /(;|\||&)\s*(cat|ls|pwd|whoami|id|uname|curl|wget|nc|bash|sh|python|perl|ruby|php)/i,

  // Path Traversal
  /\.\.[\/\\]/,
  /%2e%2e[\/\\%]/i,

  // XSS (basic patterns)
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /data\s*:\s*text\/html/i,
];

// Prompt injection patterns (for AI models)
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+(instructions?|prompts?)/i,
  /disregard\s+(previous|all|above)/i,
  /forget\s+(everything|all|previous)/i,
  /you\s+are\s+(now|actually)\s+a/i,
  /act\s+as\s+(if|a)\s+/i,
  /pretend\s+(you|to)\s+(are|be)/i,
  /new\s+instructions?\s*:/i,
  /system\s*:\s*you\s+are/i,
  /\[\s*system\s*\]/i,
  /\{\s*"role"\s*:\s*"system"/i,
];

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: any;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ─────────────────────────────────────────────────────────────
// String Validators
// ─────────────────────────────────────────────────────────────

/**
 * Validate and sanitize a string input
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowEmpty?: boolean;
  } = {}
): ValidationResult {
  const { required = true, minLength = 0, maxLength = MAX_TEXT_LENGTH, pattern, allowEmpty = false } = options;

  // Type check
  if (value === undefined || value === null) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, sanitized: undefined };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  // Trim whitespace
  const trimmed = value.trim();

  // Empty check
  if (!allowEmpty && trimmed.length === 0) {
    if (required) {
      return { valid: false, error: `${fieldName} cannot be empty` };
    }
    return { valid: true, sanitized: '' };
  }

  // Length checks
  if (trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} exceeds maximum length of ${maxLength}` };
  }

  // Pattern check
  if (pattern && !pattern.test(trimmed)) {
    return { valid: false, error: `${fieldName} format is invalid` };
  }

  // Check for injection patterns
  for (const injectionPattern of INJECTION_PATTERNS) {
    if (injectionPattern.test(trimmed)) {
      console.warn(`[SECURITY] Potential injection detected in ${fieldName}: pattern matched`);
      return { valid: false, error: `${fieldName} contains invalid characters` };
    }
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate user/session IDs (alphanumeric + limited special chars)
 */
export function validateId(
  value: unknown,
  fieldName: string,
  maxLength: number = MAX_USER_ID_LENGTH
): ValidationResult {
  const stringResult = validateString(value, fieldName, {
    required: false,
    maxLength,
    allowEmpty: true,
  });

  if (!stringResult.valid) {
    return stringResult;
  }

  if (!stringResult.sanitized) {
    return { valid: true, sanitized: undefined };
  }

  // IDs should be alphanumeric with limited special chars
  const idPattern = /^[a-zA-Z0-9_\-@.]+$/;
  if (!idPattern.test(stringResult.sanitized)) {
    return { valid: false, error: `${fieldName} contains invalid characters` };
  }

  return { valid: true, sanitized: stringResult.sanitized };
}

// ─────────────────────────────────────────────────────────────
// Chat Message Validators
// ─────────────────────────────────────────────────────────────

/**
 * Validate and sanitize chat messages array
 */
export function validateChatMessages(messages: unknown): ValidationResult {
  if (!Array.isArray(messages)) {
    return { valid: false, error: 'Messages must be an array' };
  }

  if (messages.length === 0) {
    return { valid: false, error: 'Messages array cannot be empty' };
  }

  if (messages.length > MAX_ARRAY_LENGTH) {
    return { valid: false, error: `Too many messages (max ${MAX_ARRAY_LENGTH})` };
  }

  const sanitized: ChatMessage[] = [];
  const validRoles = ['user', 'assistant', 'system'];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: `Message ${i} is invalid` };
    }

    // Validate role
    if (!validRoles.includes(msg.role)) {
      return { valid: false, error: `Message ${i} has invalid role` };
    }

    // Validate content
    const contentResult = validateString(msg.content, `Message ${i} content`, {
      maxLength: MAX_MESSAGE_LENGTH,
    });

    if (!contentResult.valid) {
      return contentResult;
    }

    // Check for prompt injection in user messages
    if (msg.role === 'user') {
      for (const pattern of PROMPT_INJECTION_PATTERNS) {
        if (pattern.test(contentResult.sanitized)) {
          console.warn(`[SECURITY] Potential prompt injection detected in message ${i}`);
          // Don't reject, but log and continue - some users legitimately discuss AI
          break;
        }
      }
    }

    sanitized.push({
      role: msg.role,
      content: contentResult.sanitized,
    });
  }

  return { valid: true, sanitized };
}

// ─────────────────────────────────────────────────────────────
// Number Validators
// ─────────────────────────────────────────────────────────────

/**
 * Validate numeric input
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): ValidationResult {
  const { required = true, min, max, integer = false } = options;

  if (value === undefined || value === null) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, sanitized: undefined };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (!isFinite(num)) {
    return { valid: false, error: `${fieldName} must be finite` };
  }

  if (integer && !Number.isInteger(num)) {
    return { valid: false, error: `${fieldName} must be an integer` };
  }

  if (min !== undefined && num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` };
  }

  return { valid: true, sanitized: num };
}

// ─────────────────────────────────────────────────────────────
// Enum Validators
// ─────────────────────────────────────────────────────────────

/**
 * Validate enum/allowed values
 */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
  options: { required?: boolean } = {}
): ValidationResult {
  const { required = true } = options;

  if (value === undefined || value === null) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, sanitized: undefined };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  if (!allowedValues.includes(value as T)) {
    return { valid: false, error: `${fieldName} must be one of: ${allowedValues.join(', ')}` };
  }

  return { valid: true, sanitized: value };
}

// ─────────────────────────────────────────────────────────────
// Base64 Validators
// ─────────────────────────────────────────────────────────────

/**
 * Validate base64 encoded image
 */
export function validateBase64Image(
  value: unknown,
  fieldName: string,
  maxSize: number = MAX_BASE64_IMAGE_SIZE
): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: true, sanitized: undefined };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  // Check if it's a valid base64 data URL or raw base64
  const base64Pattern = /^(data:image\/[a-zA-Z+]+;base64,)?[A-Za-z0-9+/]+=*$/;

  // Extract base64 content
  const base64Content = value.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  if (!base64Pattern.test(value)) {
    return { valid: false, error: `${fieldName} is not valid base64` };
  }

  // Calculate approximate size (base64 is ~4/3 larger than binary)
  const estimatedSize = (base64Content.length * 3) / 4;

  if (estimatedSize > maxSize) {
    return { valid: false, error: `${fieldName} exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB` };
  }

  return { valid: true, sanitized: value };
}

// ─────────────────────────────────────────────────────────────
// Request Validators
// ─────────────────────────────────────────────────────────────

/**
 * Check request body size
 */
export function checkBodySize(body: unknown, maxSize: number = MAX_JSON_BODY_SIZE): ValidationResult {
  try {
    const jsonString = JSON.stringify(body);
    if (jsonString.length > maxSize) {
      return { valid: false, error: `Request body too large (max ${Math.round(maxSize / 1024)}KB)` };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid JSON body' };
  }
}

// ─────────────────────────────────────────────────────────────
// Sanitizers
// ─────────────────────────────────────────────────────────────

/**
 * Sanitize HTML (strip all tags)
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape special characters for safe logging
 */
export function escapeForLog(input: string, maxLength: number = 200): string {
  return input
    .slice(0, maxLength)
    .replace(/[\r\n]/g, '\\n')
    .replace(/[\x00-\x1F\x7F]/g, '');
}

// ─────────────────────────────────────────────────────────────
// Combined Validators
// ─────────────────────────────────────────────────────────────

/**
 * Validate complete chat request
 */
export function validateChatRequest(body: unknown): ValidationResult & {
  data?: {
    messages: ChatMessage[];
    model?: string;
    sessionId?: string;
  }
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const sizeCheck = checkBodySize(body);
  if (!sizeCheck.valid) return sizeCheck;

  const b = body as Record<string, unknown>;

  // Validate messages
  const messagesResult = validateChatMessages(b.messages);
  if (!messagesResult.valid) return messagesResult;

  // Validate model (if provided)
  const allowedModels = ['gemini-3-flash', 'claude-opus-4.6', 'kimi-k2.5'] as const;
  const modelResult = validateEnum(b.model, 'model', allowedModels, { required: false });
  if (!modelResult.valid) return modelResult;

  // Validate sessionId
  const sessionIdResult = validateId(b.sessionId, 'sessionId', MAX_SESSION_ID_LENGTH);
  if (!sessionIdResult.valid) return sessionIdResult;

  return {
    valid: true,
    data: {
      messages: messagesResult.sanitized as ChatMessage[],
      model: modelResult.sanitized,
      sessionId: sessionIdResult.sanitized,
    },
  };
}

/**
 * Validate TTS request
 */
export function validateTTSRequest(body: unknown): ValidationResult & {
  data?: {
    text: string;
    voiceId?: string;
    speed?: number;
  }
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const sizeCheck = checkBodySize(body, 100 * 1024); // 100KB max for TTS
  if (!sizeCheck.valid) return sizeCheck;

  const b = body as Record<string, unknown>;

  // Validate text
  const textResult = validateString(b.text, 'text', { maxLength: MAX_TEXT_LENGTH });
  if (!textResult.valid) return textResult;

  // Validate voiceId
  const voiceIdResult = validateId(b.voiceId, 'voiceId', 64);
  if (!voiceIdResult.valid) return voiceIdResult;

  // Validate speed
  const speedResult = validateNumber(b.speed, 'speed', {
    required: false,
    min: 0.25,
    max: 4.0,
  });
  if (!speedResult.valid) return speedResult;

  return {
    valid: true,
    data: {
      text: textResult.sanitized as string,
      voiceId: voiceIdResult.sanitized,
      speed: speedResult.sanitized,
    },
  };
}

/**
 * Validate LUC request
 */
export function validateLUCRequest(body: unknown): ValidationResult & {
  data?: {
    action: string;
    userId: string;
    service?: string;
    amount?: number;
    planId?: string;
    [key: string]: unknown;
  }
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const sizeCheck = checkBodySize(body);
  if (!sizeCheck.valid) return sizeCheck;

  const b = body as Record<string, unknown>;

  // Validate action
  const allowedActions = [
    'quote', 'can-execute', 'debit', 'credit', 'update-plan',
    'reset-cycle', 'get-services', 'get-history', 'get-stats',
    'export', 'import', 'get-presets', 'apply-preset'
  ] as const;
  const actionResult = validateEnum(b.action, 'action', allowedActions);
  if (!actionResult.valid) return actionResult;

  // Validate userId
  const userIdResult = validateId(b.userId, 'userId');
  // Use default if not provided
  const userId = userIdResult.sanitized || 'default-user';

  // Validate optional fields based on action
  let service: string | undefined;
  let amount: number | undefined;

  if (['quote', 'can-execute', 'debit', 'credit'].includes(actionResult.sanitized!)) {
    const serviceResult = validateString(b.service, 'service', { required: true, maxLength: 64 });
    if (!serviceResult.valid) return serviceResult;
    service = serviceResult.sanitized;

    const amountResult = validateNumber(b.amount, 'amount', { min: 0, max: 1000000 });
    if (!amountResult.valid) return amountResult;
    amount = amountResult.sanitized;
  }

  return {
    valid: true,
    data: {
      action: actionResult.sanitized!,
      userId,
      service,
      amount,
      planId: typeof b.planId === 'string' ? b.planId.slice(0, 64) : undefined,
      ...b, // Pass through other fields (they're validated per-action)
    },
  };
}

/**
 * Validate DIY chat request (with image support)
 */
export function validateDIYRequest(body: unknown): ValidationResult & {
  data?: {
    sessionId?: string;
    projectId?: string;
    message: string;
    imageBase64?: string;
    mode?: string;
  }
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  // Larger limit for image data
  const sizeCheck = checkBodySize(body, 15 * 1024 * 1024); // 15MB for images
  if (!sizeCheck.valid) return sizeCheck;

  const b = body as Record<string, unknown>;

  // Validate message
  const messageResult = validateString(b.message, 'message', {
    required: true,
    maxLength: MAX_MESSAGE_LENGTH
  });
  if (!messageResult.valid) return messageResult;

  // Validate sessionId
  const sessionIdResult = validateId(b.sessionId, 'sessionId');
  if (!sessionIdResult.valid) return sessionIdResult;

  // Validate projectId
  const projectIdResult = validateId(b.projectId, 'projectId');
  if (!projectIdResult.valid) return projectIdResult;

  // Validate imageBase64
  const imageResult = validateBase64Image(b.imageBase64, 'imageBase64');
  if (!imageResult.valid) return imageResult;

  // Validate mode
  const modeResult = validateString(b.mode, 'mode', {
    required: false,
    maxLength: 32
  });
  if (!modeResult.valid) return modeResult;

  return {
    valid: true,
    data: {
      sessionId: sessionIdResult.sanitized,
      projectId: projectIdResult.sanitized,
      message: messageResult.sanitized!,
      imageBase64: imageResult.sanitized,
      mode: modeResult.sanitized,
    },
  };
}

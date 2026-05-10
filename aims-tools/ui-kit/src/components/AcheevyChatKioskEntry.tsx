/**
 * AcheevyChatKioskEntry — the mode-transition handler.
 *
 * The chat IS the kiosk, not the destination. Per
 * project_chat_to_guide_me_transition.md + project_spinner_feature.md:
 * when the user expresses build intent, ACHEEVY transitions them to
 * Guide Me / Manage It instead of trapping them in a chat scroll.
 * Smaller intents (conversation, question) get an inline response
 * slot. This component owns that routing decision.
 *
 * Differentiated approach (per Open Mind's three-approach rule):
 * a single-shot textarea with live intent classification that
 * surfaces a subtle hint under the input as the user types. The
 * input is the primary affordance; any response is secondary. On
 * submit, build-intent or larger-project triggers transition-out
 * (the parent wires the HomeHero or 3-Consultant handoff); chatty
 * intents stay inline.
 *
 * Conventional (generic chat UI with ACHEEVY avatar + bubbles +
 *   typing indicator + "Hi, I'm ACHEEVY!" greeting) — REJECTED as
 *   it makes the chat a destination instead of a kiosk.
 * Experimental (voice-first kiosk with waveform) — REJECTED for
 *   out-of-scope mic + Inworld wiring.
 *
 * Pre-mortem blacklist the render must NOT match:
 *   - Generic chat UI with ACHEEVY avatar bubbles
 *   - Conversation history scroll
 *   - Typing indicator dots
 *   - "Hi, I'm ACHEEVY!" welcome greeting
 *   - Carousel of sample prompts
 *   - Auto-complete suggestions dropdown
 *
 * Uses @aims/brand-tokens classes.
 */

import * as React from 'react';

// ── Intent classification (subset of @aims/spinner/intent-classifier) ─

export type ChatKioskIntent =
  | 'build-intent'
  | 'larger-project'
  | 'question'
  | 'conversation';

interface IntentSignal {
  pattern: RegExp;
  intent: ChatKioskIntent;
  weight: number;
}

const INTENT_SIGNALS: IntentSignal[] = [
  // larger-project beats build-intent when both fire (escalation)
  { pattern: /\b(company|team of|enterprise|fully autonomous|whitelabel|white.?label|platform)\b/i, intent: 'larger-project', weight: 0.8 },
  // build-intent
  { pattern: /\bbuild\s+me\b/i, intent: 'build-intent', weight: 0.9 },
  { pattern: /\b(I\s+(?:want|need)\s+(?:to\s+)?(?:build|create|make|launch|deploy))/i, intent: 'build-intent', weight: 0.85 },
  { pattern: /\b(build|deploy|launch)\s+(?:a|an|my|the)\b/i, intent: 'build-intent', weight: 0.75 },
  { pattern: /\b(create|make)\s+(?:a|an|my|me)\b/i, intent: 'build-intent', weight: 0.65 },
  { pattern: /\bset\s*up\b/i, intent: 'build-intent', weight: 0.5 },
  // question
  { pattern: /^(how|what|when|where|why|who|which)\b/i, intent: 'question', weight: 0.6 },
  { pattern: /\?$/, intent: 'question', weight: 0.35 },
];

export function classifyIntent(message: string): {
  intent: ChatKioskIntent;
  confidence: number;
  triggers: string[];
} {
  if (!message.trim()) {
    return { intent: 'conversation', confidence: 0, triggers: [] };
  }
  const tally: Record<ChatKioskIntent, number> = {
    'build-intent': 0,
    'larger-project': 0,
    question: 0,
    conversation: 0.15,
  };
  const triggers: string[] = [];
  for (const sig of INTENT_SIGNALS) {
    if (sig.pattern.test(message)) {
      tally[sig.intent] += sig.weight;
      triggers.push(sig.pattern.source);
    }
  }
  // larger-project escalation: if both build and larger fire, pick larger
  if (tally['build-intent'] > 0 && tally['larger-project'] > 0) {
    tally['larger-project'] += tally['build-intent'];
    tally['build-intent'] = 0;
  }
  let best: ChatKioskIntent = 'conversation';
  let bestScore = tally.conversation;
  for (const key of Object.keys(tally) as ChatKioskIntent[]) {
    if (tally[key] > bestScore) {
      bestScore = tally[key];
      best = key;
    }
  }
  return { intent: best, confidence: Math.min(1, bestScore), triggers };
}

const INTENT_HINT: Record<ChatKioskIntent, string> = {
  'build-intent': 'We will walk you through this — Guide Me or Manage It.',
  'larger-project': '3-Consultant Engagement — ACHEEVY + NOON + a specialist will convene.',
  question: 'A direct answer, then we continue when you are ready.',
  conversation: 'ACHEEVY is listening. No build detected yet.',
};

const TRANSITIONING_INTENTS: ReadonlySet<ChatKioskIntent> = new Set(['build-intent', 'larger-project']);

// ── Props + types ──────────────────────────────────────────────────

export interface AcheevyChatKioskSubmission {
  message: string;
  intent: ChatKioskIntent;
  confidence: number;
  willTransition: boolean;
}

export interface AcheevyChatKioskEntryProps {
  /** Big framing question shown above the textarea. */
  prompt?: string;
  /** Placeholder text inside the textarea. */
  placeholder?: string;
  /** Focus the textarea on mount. Defaults to true. */
  autofocus?: boolean;
  /** Fires on every keystroke after intent re-classification. */
  onIntentChange?: (intent: ChatKioskIntent, confidence: number) => void;
  /** Fires on submit. Parent routes based on `willTransition` + `intent`. */
  onSubmit: (submission: AcheevyChatKioskSubmission) => void;
  /** Maximum input length (characters). Defaults to 2000. */
  maxLength?: number;
}

// ── Main component ─────────────────────────────────────────────────

export function AcheevyChatKioskEntry({
  prompt = 'What do you want built?',
  placeholder = 'Describe what you\'re here to make. One sentence is enough.',
  autofocus = true,
  onIntentChange,
  onSubmit,
  maxLength = 2000,
}: AcheevyChatKioskEntryProps): React.ReactElement {
  const [message, setMessage] = React.useState('');
  const [classification, setClassification] = React.useState(() => classifyIntent(''));
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    if (autofocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autofocus]);

  const onIntentChangeRef = React.useRef(onIntentChange);
  onIntentChangeRef.current = onIntentChange;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setMessage(next);
    const nextClass = classifyIntent(next);
    setClassification(nextClass);
    onIntentChangeRef.current?.(nextClass.intent, nextClass.confidence);
  };

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const finalClass = classifyIntent(trimmed);
    const willTransition = TRANSITIONING_INTENTS.has(finalClass.intent);
    onSubmit({
      message: trimmed,
      intent: finalClass.intent,
      confidence: finalClass.confidence,
      willTransition,
    });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl-Enter — plain Enter makes newlines.
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const willTransition = TRANSITIONING_INTENTS.has(classification.intent) && message.trim().length > 0;

  return (
    <section
      aria-label="Ask ACHEEVY"
      className="flex min-h-[60vh] w-full flex-col bg-deploy-bg-deep text-deploy-text font-body"
    >
      <div className="mx-auto flex w-full max-w-[64rem] flex-1 flex-col justify-center gap-8 px-6 py-12 md:px-10">
        <header className="flex flex-col gap-3">
          <span className="font-mono text-[0.625rem] tracking-[0.24em] text-deploy-text-muted uppercase">
            Kiosk · the chat is the entry, not the destination
          </span>
          <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[0.02em] uppercase text-deploy-text">
            {prompt}
          </h1>
        </header>

        <div className="flex flex-col gap-2">
          <label htmlFor="acheevy-kiosk-input" className="sr-only">
            Describe what you want built
          </label>
          <textarea
            id="acheevy-kiosk-input"
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKey}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={4}
            aria-describedby="acheevy-kiosk-hint"
            className="w-full resize-none border border-deploy-border-subtle bg-deploy-bg-surface px-5 py-4 font-body text-lg leading-relaxed text-deploy-text placeholder:text-deploy-text-subtle focus:border-deploy-neon focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon"
          />

          <div
            id="acheevy-kiosk-hint"
            className="flex flex-wrap items-baseline justify-between gap-3"
            aria-live="polite"
          >
            <span
              className={
                'font-mono text-[0.625rem] tracking-[0.18em] uppercase ' +
                (willTransition ? 'text-deploy-neon' : 'text-deploy-text-subtle')
              }
            >
              {INTENT_HINT[classification.intent]}
            </span>
            <span className="font-mono text-[0.625rem] tabular-nums text-deploy-text-subtle">
              {message.length} / {maxLength}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim()}
            className={
              'inline-flex items-center gap-3 border px-5 py-2 font-mono text-xs tracking-[0.18em] uppercase transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon ' +
              (message.trim()
                ? willTransition
                  ? 'border-deploy-neon text-deploy-neon hover:shadow-deploy-neon'
                  : 'border-deploy-border-subtle text-deploy-text hover:border-deploy-neon hover:text-deploy-neon'
                : 'border-deploy-border-subtle text-deploy-text-subtle cursor-not-allowed')
            }
          >
            {willTransition ? 'Transition →' : 'Ask'}
          </button>
          <span className="font-mono text-[0.625rem] tracking-[0.12em] text-deploy-text-subtle uppercase">
            ⌘/Ctrl + Enter to submit · Enter makes a new line
          </span>
        </div>
      </div>
    </section>
  );
}

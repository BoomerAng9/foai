'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types ─── */
interface OnboardingProfile {
  name: string;
  business_type: string;
  primary_goal: string;
  communication_style: string;
  language: string;
  experience_level: string;
  immediate_needs: string;
}

type StepKey = keyof OnboardingProfile;

interface Step {
  key: StepKey;
  question: string;
  type: 'text' | 'options' | 'dropdown';
  options?: { label: string; value: string }[];
  placeholder?: string;
  skipLabel?: string;
}

const STEPS: Step[] = [
  {
    key: 'name',
    question: "First things first — what should I call you?",
    type: 'text',
    placeholder: 'Your name or nickname...',
  },
  {
    key: 'business_type',
    question: "Nice. So tell me — what does your business do?",
    type: 'text',
    placeholder: 'E.g. Marketing agency, SaaS startup, freelance design...',
  },
  {
    key: 'primary_goal',
    question: "What are you trying to accomplish today?",
    type: 'text',
    placeholder: 'E.g. Build a website, automate content, manage clients...',
  },
  {
    key: 'communication_style',
    question: "How do you like to communicate?",
    type: 'options',
    options: [
      { label: 'Casual — like texting a friend', value: 'casual' },
      { label: 'Professional — clean and structured', value: 'professional' },
      { label: 'Mixed — professional but relaxed', value: 'mixed' },
    ],
  },
  {
    key: 'language',
    question: "What language do you prefer?",
    type: 'dropdown',
    options: [
      { label: 'English', value: 'English' },
      { label: 'Spanish', value: 'Spanish' },
      { label: 'French', value: 'French' },
      { label: 'Portuguese', value: 'Portuguese' },
      { label: 'German', value: 'German' },
      { label: 'Chinese (Simplified)', value: 'Chinese' },
      { label: 'Japanese', value: 'Japanese' },
      { label: 'Korean', value: 'Korean' },
      { label: 'Arabic', value: 'Arabic' },
      { label: 'Hindi', value: 'Hindi' },
      { label: 'Italian', value: 'Italian' },
      { label: 'Dutch', value: 'Dutch' },
      { label: 'Russian', value: 'Russian' },
      { label: 'Turkish', value: 'Turkish' },
      { label: 'Polish', value: 'Polish' },
    ],
  },
  {
    key: 'experience_level',
    question: "How experienced are you with AI tools?",
    type: 'options',
    options: [
      { label: 'Just getting started', value: 'beginner' },
      { label: 'I know my way around', value: 'intermediate' },
      { label: "I'm an expert", value: 'expert' },
    ],
  },
  {
    key: 'immediate_needs',
    question: "Anything you need right now? If not, we can skip this.",
    type: 'text',
    placeholder: 'E.g. Set up my workspace, import contacts...',
    skipLabel: 'Skip',
  },
];

/* ─── Bubble Components ─── */
function AcheevyBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex items-start gap-3 max-w-[85%]"
    >
      <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black font-bold text-xs mt-0.5">
        A
      </div>
      <div>
        <span className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider block mb-1">
          ACHEEVY
        </span>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl rounded-tl-sm px-4 py-3 text-white/90 text-[15px] leading-relaxed">
          {text}
        </div>
      </div>
    </motion.div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex justify-end"
    >
      <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl rounded-tr-sm px-4 py-3 text-white/90 text-[15px] leading-relaxed max-w-[75%]">
        {text}
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─── */
export function AcheevyInterview({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingProfile>>({});
  const [chatLog, setChatLog] = useState<{ from: 'acheevy' | 'user'; text: string }[]>([]);
  const [textInput, setTextInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const [skippedAll, setSkippedAll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show first question on mount
  useEffect(() => {
    setChatLog([{ from: 'acheevy', text: STEPS[0].question }]);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatLog, step]);

  function handleAnswer(value: string) {
    const currentStep = STEPS[step];
    const displayText = currentStep.type === 'options'
      ? currentStep.options?.find(o => o.value === value)?.label || value
      : currentStep.type === 'dropdown'
        ? value
        : value;

    const newAnswers = { ...answers, [currentStep.key]: value };
    setAnswers(newAnswers);

    const newLog = [
      ...chatLog,
      { from: 'user' as const, text: displayText },
    ];

    const nextStep = step + 1;

    if (nextStep < STEPS.length) {
      // Add next question after a short delay
      setChatLog(newLog);
      setTextInput('');
      setTimeout(() => {
        setChatLog(prev => [...prev, { from: 'acheevy', text: STEPS[nextStep].question }]);
        setStep(nextStep);
      }, 500);
    } else {
      // Final step — save and show closing message
      const userName = newAnswers.name || 'friend';
      setChatLog(newLog);
      setTextInput('');
      setFinished(true);
      setTimeout(() => {
        setChatLog(prev => [
          ...prev,
          { from: 'acheevy', text: `Perfect, ${userName}. I've got everything I need. Let's get to work.` },
        ]);
        saveProfile(newAnswers as OnboardingProfile);
      }, 600);
    }
  }

  function handleSkipStep() {
    handleAnswer('');
  }

  async function handleSkipAll() {
    setSkippedAll(true);
    setChatLog(prev => [
      ...prev,
      { from: 'acheevy', text: "No worries, we can do this later." },
    ]);
    // Mark as skipped in localStorage but don't save to DB
    localStorage.setItem('onboarding_skipped', 'true');
    setTimeout(() => onComplete(), 1200);
  }

  async function saveProfile(profile: OnboardingProfile) {
    setSaving(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        localStorage.setItem('onboarding_completed', 'true');
        setTimeout(() => onComplete(), 1500);
      }
    } catch (err) {
      console.error('Failed to save onboarding profile:', err);
      // Still let them through
      localStorage.setItem('onboarding_completed', 'true');
      setTimeout(() => onComplete(), 1500);
    } finally {
      setSaving(false);
    }
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleAnswer(textInput.trim());
  }

  const currentStepData = STEPS[step];
  const showInput = !finished && !skippedAll;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black font-bold text-sm">
            A
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">Welcome to The Deploy Platform</h1>
            <p className="text-white/40 text-xs">Quick setup with ACHEEVY</p>
          </div>
        </div>
        {showInput && (
          <button
            onClick={handleSkipAll}
            className="text-white/30 hover:text-white/60 text-xs transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <AnimatePresence mode="popLayout">
          {chatLog.map((entry, i) => (
            <div key={i}>
              {entry.from === 'acheevy' ? (
                <AcheevyBubble text={entry.text} />
              ) : (
                <UserBubble text={entry.text} />
              )}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input area */}
      {showInput && currentStepData && (
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="px-6 pb-6 pt-3 border-t border-[#1a1a1a]"
        >
          {currentStepData.type === 'text' && (
            <form onSubmit={handleTextSubmit} className="flex gap-3">
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={currentStepData.placeholder}
                autoFocus
                className="flex-1 bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-[15px] placeholder:text-white/25 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
              {currentStepData.skipLabel && (
                <button
                  type="button"
                  onClick={handleSkipStep}
                  className="px-4 py-3 text-white/40 hover:text-white/60 text-sm transition-colors"
                >
                  {currentStepData.skipLabel}
                </button>
              )}
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:text-white/30 text-black font-semibold rounded-xl px-5 py-3 text-sm transition-colors"
              >
                Send
              </button>
            </form>
          )}

          {currentStepData.type === 'options' && (
            <div className="flex flex-col sm:flex-row gap-2">
              {currentStepData.options?.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className="flex-1 bg-[#141414] border border-[#2a2a2a] hover:border-amber-500/50 hover:bg-amber-500/5 rounded-xl px-4 py-3 text-white/80 text-[14px] text-left transition-all"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {currentStepData.type === 'dropdown' && (
            <div className="flex gap-3">
              <select
                value={textInput || 'English'}
                onChange={e => setTextInput(e.target.value)}
                className="flex-1 bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-[15px] focus:outline-none focus:border-amber-500/50 transition-colors appearance-none cursor-pointer"
              >
                {currentStepData.options?.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleAnswer(textInput || 'English')}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl px-5 py-3 text-sm transition-colors"
              >
                Confirm
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pb-5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i < step ? 'bg-amber-500'
              : i === step ? 'bg-amber-400 scale-125'
              : 'bg-white/15'
            }`}
          />
        ))}
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-amber-400 text-sm animate-pulse">Setting up your profile...</div>
        </div>
      )}
    </div>
  );
}

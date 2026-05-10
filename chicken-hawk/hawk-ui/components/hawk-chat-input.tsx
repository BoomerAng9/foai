'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizontal, Lightbulb, Plus, Mic, MicOff, X, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MicPermissionHelp } from '@/components/mic-permission-help';

export interface Attachment {
  name: string;
  mime: string;
  kind: 'image' | 'text';
  data: string; // base64 (image) or plain text
  size: number;
}

interface Props {
  placeholder?: string;
  onSend: (message: string, attachments: Attachment[]) => void | Promise<void>;
  disabled?: boolean;
  ownerSession?: boolean;
}

type SR = {
  new (): {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: (e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void;
    onerror: (e: { error?: string }) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
  };
};

function getSR(): SR | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const TEXT_MIMES = new Set([
  'text/plain', 'text/markdown', 'text/csv', 'application/json',
  'text/x-python', 'text/javascript', 'text/typescript',
  'text/html', 'text/css', 'application/yaml', 'text/yaml',
]);
const MAX_TEXT_BYTES = 200_000;     // ~200 KB plaintext per file
const MAX_IMAGE_BYTES = 5_000_000;  // ~5 MB image per file
const MAX_ATTACHMENTS = 4;

function fileExtIsTextLike(name: string) {
  return /\.(md|txt|csv|json|ya?ml|py|js|ts|tsx|jsx|html|css|sh|sql|toml|ini|cfg|env|log)$/i.test(name);
}

export function HawkChatInput({
  placeholder = 'What do you want to build today?',
  onSend,
  disabled,
  ownerSession = false,
}: Props) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const [voiceBlocked, setVoiceBlocked] = useState(false);
  const [attachErr, setAttachErr] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<ReturnType<NonNullable<SR>['prototype']['constructor']> | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);

  useEffect(() => {
    setVoiceAvailable(!!getSR());
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [message]);

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed && attachments.length === 0) return;
    if (isPending || disabled) return;
    setIsPending(true);
    try {
      await onSend(trimmed, attachments);
      setMessage('');
      setAttachments([]);
    } finally {
      setIsPending(false);
    }
  };

  const startListening = async () => {
    setVoiceErr(null);
    const SRClass = getSR();
    if (!SRClass) {
      setVoiceErr('Voice input requires Chrome, Edge, or Safari (Firefox does not support it yet).');
      return;
    }

    // Some browsers silently fail SpeechRecognition without a prior mic-permission
    // grant. Explicitly trigger the permission prompt first via getUserMedia.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setVoiceErr('Microphone blocked — see the steps below to re-enable.');
        setVoiceBlocked(true);
      } else if (name === 'NotFoundError') {
        setVoiceErr('No microphone detected on this device.');
      } else {
        setVoiceErr(`Couldn't access the microphone (${name || 'unknown'}).`);
      }
      return;
    }

    const rec = new SRClass();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setMessage((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      setVoiceErr(
        e.error === 'not-allowed'
          ? 'Microphone permission was revoked. Re-enable in site settings.'
          : e.error === 'no-speech'
          ? "Didn't catch anything — try again."
          : `Voice error: ${e.error ?? 'unknown'}`,
      );
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    setListening(false);
  };

  const onPickFiles = () => fileInputRef.current?.click();

  const onFilesChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachErr(null);
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-picking same file
    if (!files.length) return;

    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setAttachErr(`Up to ${MAX_ATTACHMENTS} files at once.`);
      return;
    }

    const next: Attachment[] = [];
    for (const f of files) {
      const isImage = f.type.startsWith('image/');
      const isText = TEXT_MIMES.has(f.type) || fileExtIsTextLike(f.name);
      if (!isImage && !isText) {
        setAttachErr(`"${f.name}" — only images and text-like files (md, txt, json, csv, code) are supported here.`);
        continue;
      }
      if (isImage && f.size > MAX_IMAGE_BYTES) {
        setAttachErr(`"${f.name}" is larger than 5 MB.`);
        continue;
      }
      if (isText && f.size > MAX_TEXT_BYTES) {
        setAttachErr(`"${f.name}" is larger than 200 KB.`);
        continue;
      }

      try {
        if (isImage) {
          const data = await new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onerror = () => reject(fr.error);
            fr.onload = () => resolve((fr.result as string).split(',')[1] ?? '');
            fr.readAsDataURL(f);
          });
          next.push({ name: f.name, mime: f.type || 'image/png', kind: 'image', data, size: f.size });
        } else {
          const data = await f.text();
          next.push({ name: f.name, mime: f.type || 'text/plain', kind: 'text', data, size: f.size });
        }
      } catch {
        setAttachErr(`Couldn't read "${f.name}".`);
      }
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
  };

  const removeAttachment = (idx: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="relative w-full max-w-[720px] mx-auto">
      <div className="relative rounded-2xl bg-foai-surface border border-foai-border shadow-card-md focus-within:border-foai-gold/60 focus-within:shadow-card-lg transition-all">
        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <div
                key={`${a.name}-${i}`}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-foai-surface-2/70 border border-foai-border/50 text-xs"
              >
                {a.kind === 'image' ? (
                  <ImageIcon className="size-3.5 text-foai-cyan" />
                ) : (
                  <FileText className="size-3.5 text-foai-gold" />
                )}
                <span className="truncate max-w-[180px] text-foai-text">{a.name}</span>
                <span className="text-foai-muted text-[10px]">
                  {a.kind === 'image' ? `${Math.round(a.size / 1024)} KB` : `${a.data.length} chars`}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="text-foai-muted hover:text-foai-text"
                  aria-label="remove attachment"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={ref}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={listening ? 'Listening…' : placeholder}
          disabled={disabled || isPending}
          className="w-full resize-none bg-transparent text-[15px] text-foai-text placeholder-foai-muted px-5 pt-5 pb-3 focus:outline-none min-h-[88px] max-h-[200px] font-sans"
          style={{ height: '88px' }}
        />

        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,text/plain,text/markdown,text/csv,application/json,.md,.txt,.csv,.json,.yaml,.yml,.log,.py,.js,.ts,.tsx,.jsx,.html,.css,.sh,.sql,.toml,.ini,.cfg"
              onChange={onFilesChosen}
              className="hidden"
            />
            <button
              type="button"
              onClick={onPickFiles}
              title="Attach images or text files (max 4)"
              className="flex items-center justify-center size-8 rounded-md bg-foai-surface-2/40 hover:bg-foai-surface-2/70 text-foai-muted hover:text-foai-text transition-colors"
            >
              <Plus className="size-4" />
            </button>

            {voiceAvailable && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                title={listening ? 'Stop listening' : 'Start voice input'}
                className={cn(
                  'flex items-center justify-center size-8 rounded-md transition-colors',
                  listening
                    ? 'bg-foai-gold/20 text-foai-gold ring-gold animate-pulse'
                    : 'bg-foai-surface-2/40 text-foai-muted hover:text-foai-text hover:bg-foai-surface-2/70',
                )}
              >
                {listening ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              </button>
            )}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-foai-muted hover:text-foai-text hover:bg-foai-surface-2/50 transition-colors"
              title="Plan-first mode"
            >
              <Lightbulb className="size-4" />
              <span>Plan</span>
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={(!message.trim() && attachments.length === 0) || isPending || disabled}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-foai-gold hover:bg-foai-gold-hover text-white shadow-amber-soft hover:shadow-amber-press transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-foai-gold disabled:hover:shadow-amber-soft"
            >
              <span className="hidden sm:inline">{isPending ? 'Sending…' : 'Send'}</span>
              <SendHorizontal className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {(voiceErr || attachErr) && (
        <div className="mt-2 text-xs text-foai-gold/90 text-center">
          {voiceErr || attachErr}
        </div>
      )}

      <MicPermissionHelp forceShow={voiceBlocked} />
    </div>
  );
}

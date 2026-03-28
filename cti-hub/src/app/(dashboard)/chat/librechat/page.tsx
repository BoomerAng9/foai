'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Copy, Check, Paperclip, FileText, Link2, X, AtSign, Mic, Square, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
// Database access via API routes (postgres.js is server-only)
import { useAuth } from '@/hooks/useAuth';
import { type ChatAttachment, type NotebookSourceRecord, mapPersistedSourceRecord, type PersistedSourceRecord } from '@/lib/research/source-records';
import { sourceIcon } from '@/lib/research/source-icons';
import type { VoiceVendorConfig, VoiceOption, VoiceVendorId } from '@/lib/voice/vendors';

interface ChatMessage {
  id: string;
  role: 'agent' | 'user';
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  citations?: Array<{
    sourceId: string;
    sourceTitle: string;
    excerpt: string;
    pageNumber?: number;
  }>;
}

function decodeBase64ToBlob(base64: string, mimeType: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

const TEXT_MODEL = process.env.NEXT_PUBLIC_OPENROUTER_TEXT_MODEL || 'openai/gpt-4o-mini';
const VOICE_MODEL = process.env.NEXT_PUBLIC_OPENROUTER_VOICE_MODEL || TEXT_MODEL;

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface BrowserSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

const SYSTEM_PROMPT = `You are ACHEEVY, the assistant inside GRAMMAR. Your single purpose is to convert plain-language descriptions into structured technical prompts that the user can copy and paste into any AI tool (ChatGPT, Claude, Gemini, etc.).

When a user describes what they need in everyday language, you:
1. Ask one or two clarifying questions if the request is ambiguous (keep it brief).
2. Once you understand the intent, produce a structured prompt in a fenced code block labeled \`prompt\`.
3. The structured prompt should include: a clear role/persona, the task objective, key constraints, expected output format, and any relevant context.
4. After the prompt block, briefly explain what the prompt does and suggest which AI tool it works best with.

Rules:
- Always output the final prompt inside a fenced code block with the label \`prompt\`.
- Never refuse to produce a prompt. If the request is vague, ask a short clarifying question first.
- Do not manage work, projects, or workflows. You only produce prompts.
- Be concise and professional.`;

function PromptBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Structured Prompt</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap font-mono overflow-x-auto">
        {content}
      </pre>
    </div>
  );
}

function parseMessageContent(content: string) {
  const parts: { type: 'text' | 'prompt'; content: string }[] = [];
  const regex = /```prompt\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'prompt', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return parts;
}

export default function ChatWithAcheevyPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [activeProvider, setActiveProvider] = useState('OpenRouter');
  const [activeModel, setActiveModel] = useState(TEXT_MODEL);
  const [isAttachmentPickerOpen, setIsAttachmentPickerOpen] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceVendors, setVoiceVendors] = useState<VoiceVendorConfig[]>([]);
  const [voiceCatalogError, setVoiceCatalogError] = useState('');
  const [selectedVoiceVendor, setSelectedVoiceVendor] = useState<VoiceVendorId>('elevenlabs');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [selectedVoiceModelId, setSelectedVoiceModelId] = useState('');
  const [isVoiceReplyEnabled, setIsVoiceReplyEnabled] = useState(false);
  const [isSynthesizingVoice, setIsSynthesizingVoice] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [availableSources, setAvailableSources] = useState<NotebookSourceRecord[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<ChatAttachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const voiceSeedRef = useRef('');
  const lastInputModeRef = useRef<'text' | 'voice'>('text');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      setIsVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setVoiceError('');
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      voiceSeedRef.current = '';
    };

    recognition.onerror = (event) => {
      setVoiceError(event.error === 'not-allowed' ? 'Microphone permission was denied.' : 'Voice capture failed. Try again.');
      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();

      const seed = voiceSeedRef.current ? `${voiceSeedRef.current} ` : '';
      const nextValue = `${seed}${transcript}`.trim();
      setInterimTranscript(transcript);
      setQuery(nextValue);
    };

    recognitionRef.current = recognition;
    setIsVoiceSupported(true);

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    async function loadVoiceVendors() {
      try {
        setVoiceCatalogError('');
        const response = await fetch('/api/voice', { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load voice vendors.');
        }

        const vendors = Array.isArray(payload?.vendors) ? payload.vendors as VoiceVendorConfig[] : [];
        setVoiceVendors(vendors);

        const preferredVendor = vendors.find((vendor) => vendor.id === 'elevenlabs' && vendor.configured)
          || vendors.find((vendor) => vendor.configured)
          || vendors[0];

        if (preferredVendor) {
          setSelectedVoiceVendor(preferredVendor.id);
          setSelectedVoiceId(preferredVendor.defaultVoiceId || preferredVendor.voices[0]?.id || '');
          setSelectedVoiceModelId(preferredVendor.defaultModelId || preferredVendor.voices[0]?.defaultModelId || '');
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load voice vendors.';
        setVoiceCatalogError(message);
      }
    }

    void loadVoiceVendors();
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setIsVoiceReplyEnabled(false);
    }
  }, [user]);

  useEffect(() => {
    async function loadSources() {
      if (!user) {
        return;
      }

      try {
        const dsRes = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'select', table: 'data_sources', filters: { user_id: user.uid } }),
        });
        const { data } = await dsRes.json();

        if (Array.isArray(data)) {
          setAvailableSources((data as PersistedSourceRecord[]).map(mapPersistedSourceRecord));
        }
      } catch (loadError) {
        console.error('[Chat] Failed to load NotebookLM sources:', loadError);
      }
    }

    void loadSources();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const selectedVendor = voiceVendors.find((vendor) => vendor.id === selectedVoiceVendor);
    if (!selectedVendor) {
      return;
    }

    const nextVoiceId = selectedVendor.voices.find((voice) => voice.id === selectedVoiceId)?.id
      || selectedVendor.defaultVoiceId
      || selectedVendor.voices[0]?.id
      || '';
    const selectedVoice = selectedVendor.voices.find((voice) => voice.id === nextVoiceId);
    const nextModelIds = selectedVoice?.modelIds?.length
      ? selectedVoice.modelIds
      : selectedVendor.defaultModelId
        ? [selectedVendor.defaultModelId]
        : [];
    const nextModelId = nextModelIds.includes(selectedVoiceModelId)
      ? selectedVoiceModelId
      : selectedVoice?.defaultModelId
        || selectedVendor.defaultModelId
        || nextModelIds[0]
        || '';

    if (nextVoiceId !== selectedVoiceId) {
      setSelectedVoiceId(nextVoiceId);
    }

    if (nextModelId !== selectedVoiceModelId) {
      setSelectedVoiceModelId(nextModelId);
    }
  }, [selectedVoiceId, selectedVoiceModelId, selectedVoiceVendor, voiceVendors]);

  const selectedVendorConfig = voiceVendors.find((vendor) => vendor.id === selectedVoiceVendor);
  const selectedVoiceConfig = selectedVendorConfig?.voices.find((voice) => voice.id === selectedVoiceId);
  const availableModelIds = selectedVoiceConfig?.modelIds?.length
    ? selectedVoiceConfig.modelIds
    : selectedVendorConfig?.defaultModelId
      ? [selectedVendorConfig.defaultModelId]
      : selectedVoiceModelId
        ? [selectedVoiceModelId]
        : [];

  const toggleSourceAttachment = (source: NotebookSourceRecord) => {
    setSelectedAttachments((current) => {
      const exists = current.some((attachment) => attachment.id === source.id);
      if (exists) {
        return current.filter((attachment) => attachment.id !== source.id);
      }

      return [
        ...current,
        {
          id: source.id,
          title: source.title,
          kind: 'notebook-source',
          type: source.type,
          notebookId: source.notebookId,
          sourceId: source.id,
          notebookSourceId: source.metadata?.notebookSourceId,
          content: source.metadata?.content,
          url: source.metadata?.url,
        },
      ];
    });
  };

  const removeAttachment = (attachmentId: string) => {
    setSelectedAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const nextAttachments = await Promise.all(files.map(async (file) => {
      const text = await file.text();
      return {
        id: `upload-${file.name}-${file.lastModified}`,
        title: file.name,
        kind: 'upload' as const,
        type: 'text' as const,
        mimeType: file.type || 'text/plain',
        content: text.slice(0, 20000),
      };
    }));

    setSelectedAttachments((current) => {
      const deduped = current.filter((attachment) => !nextAttachments.some((nextAttachment) => nextAttachment.id === attachment.id));
      return [...deduped, ...nextAttachments];
    });

    event.target.value = '';
    toast.success(`${files.length} attachment${files.length > 1 ? 's' : ''} added.`);
  };

  const startListening = () => {
    if (!recognitionRef.current || isTyping) {
      return;
    }

    try {
      lastInputModeRef.current = 'voice';
      voiceSeedRef.current = query.trim();
      setVoiceError('');
      recognitionRef.current.start();
    } catch {
      setVoiceError('Voice capture is already running.');
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const toggleListening = () => {
    if (!isVoiceSupported) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    startListening();
  };

  const stopAudioPlayback = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setSpeakingMessageId(null);
  };

  const playVoiceReply = async (text: string, messageId: string) => {
    if (!user) {
      toast.error('Sign in to use premium voice replies.');
      return;
    }

    if (!selectedVendorConfig?.configured) {
      toast.error(selectedVendorConfig?.reason || 'The selected voice vendor is not configured.');
      return;
    }

    stopAudioPlayback();
    setIsSynthesizingVoice(true);
    setSpeakingMessageId(messageId);

    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: selectedVoiceVendor,
          voiceId: selectedVoiceId || undefined,
          modelId: selectedVoiceModelId || undefined,
          text,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Voice synthesis failed.');
      }

      const blob = decodeBase64ToBlob(payload.audioBase64, payload.mimeType || 'audio/mpeg');
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audioRef.current = audio;
      audioUrlRef.current = audioUrl;

      audio.onended = () => {
        setSpeakingMessageId(null);
      };

      audio.onerror = () => {
        stopAudioPlayback();
        toast.error('Voice playback failed in this browser.');
      };

      await audio.play();
    } catch (playbackError) {
      stopAudioPlayback();
      const message = playbackError instanceof Error ? playbackError.message : 'Voice playback failed.';
      toast.error(message);
    } finally {
      setIsSynthesizingVoice(false);
    }
  };

  const handleSend = async () => {
    const text = query.trim();
    if (!text || isTyping) return;

    const inputMode = isListening || interimTranscript ? 'voice' : lastInputModeRef.current;

    if (isListening) {
      stopListening();
    }

    setError('');
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
      attachments: selectedAttachments,
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setQuery('');
    setIsTyping(true);
    setIsAttachmentPickerOpen(false);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: inputMode === 'voice' ? VOICE_MODEL : TEXT_MODEL,
          inputMode,
          userId: user?.uid,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...updated.map(m => ({
              role: m.role === 'agent' ? 'assistant' as const : 'user' as const,
              content: m.content,
            })),
          ],
          attachments: selectedAttachments,
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Request failed');

      const reply = typeof payload?.reply === 'string' ? payload.reply.trim() : '';
      if (!reply) throw new Error('Empty response from AI engine');
      setActiveProvider(typeof payload?.provider === 'string' ? payload.provider : 'OpenRouter');
      setActiveModel(typeof payload?.model === 'string' ? payload.model : (inputMode === 'voice' ? VOICE_MODEL : TEXT_MODEL));
      lastInputModeRef.current = 'text';

      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'agent',
        content: reply,
        timestamp: new Date().toLocaleTimeString(),
        citations: Array.isArray(payload?.citations) ? payload.citations : [],
      }]);
      setSelectedAttachments([]);

      if (isVoiceReplyEnabled) {
        void playVoiceReply(reply, assistantMessageId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: `I hit an issue: ${msg}. Please try again.`,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
      {/* Top bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-white shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#0F172A] flex items-center justify-center shadow-md">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 tracking-tight">
          GRAMMAR
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-semibold">Chat w/ ACHEEVY</span>
        </div>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{activeProvider}</span>
          <span className="rounded-full border border-[#00A3FF22] bg-[#00A3FF0A] px-2.5 py-1 text-[10px] font-bold text-[#00A3FF]">
            {isListening ? `Voice: ${VOICE_MODEL}` : `Text: ${activeModel}`}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${selectedVendorConfig?.configured ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            {selectedVendorConfig ? `${selectedVendorConfig.label}${selectedVoiceModelId ? ` • ${selectedVoiceModelId}` : ''}` : 'Voice vendor'}
          </span>
        </div>
        {error && (
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Connection issue</span>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-slate-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Welcome to GRAMMAR</h2>
            <p className="text-slate-500 font-medium text-sm max-w-md">
              I&apos;m ACHEEVY. Where do we start?
            </p>
            <p className="text-slate-400 text-xs mt-4 max-w-sm">
              Speak or type what you need in plain language and GRAMMAR will convert it into a structured prompt.
            </p>
            {isVoiceSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${isListening ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-[#0F172A] text-white shadow-lg shadow-slate-900/20 hover:scale-105'}`}
              >
                {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening ? 'Stop listening' : 'Tap to speak'}
              </button>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold ${
                    msg.role === 'user'
                      ? 'bg-[#00A3FF]'
                      : 'bg-[#0F172A]'
                  }`}
                >
                  {msg.role === 'user' ? 'U' : <Sparkles className="w-4 h-4" />}
                </div>
                <div className={`max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#00A3FF] text-white rounded-tr-sm'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-sm'
                    }`}
                  >
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {msg.attachments.map((attachment) => (
                          <div key={attachment.id} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${msg.role === 'user' ? 'bg-white/20 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                            {attachment.kind === 'notebook-source' ? <Link2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                            {attachment.title}
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.role === 'agent' ? (
                      <>
                        {parseMessageContent(msg.content).map((part, i) =>
                          part.type === 'prompt' ? (
                            <PromptBlock key={i} content={part.content} />
                          ) : (
                            <p key={i} className="whitespace-pre-wrap">{part.content}</p>
                          )
                        )}
                        <div className="mt-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void playVoiceReply(msg.content, msg.id)}
                            disabled={!selectedVendorConfig?.configured || isSynthesizingVoice}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {speakingMessageId === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                            {speakingMessageId === msg.id ? 'Playing voice' : `Speak via ${selectedVendorConfig?.label || 'voice'}`}
                          </button>
                          {speakingMessageId === msg.id && (
                            <button
                              type="button"
                              onClick={stopAudioPlayback}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                            >
                              <Square className="w-3 h-3" />
                              Stop
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-200 pt-4">
                        {msg.citations.map((citation, index) => (
                          <div key={`${citation.sourceId}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600">
                            <span className="mr-2 text-[#00A3FF]">[{index + 1}]</span>
                            {citation.sourceTitle}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 block px-1">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-white shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  <span className="text-xs text-slate-400">ACHEEVY is thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0">
        {(isListening || voiceError || interimTranscript) && (
          <div className={`mb-3 flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-bold ${voiceError ? 'border-red-200 bg-red-50 text-red-600' : 'border-[#00A3FF22] bg-[#00A3FF0A] text-slate-700'}`}>
            <div className="flex items-center gap-2">
              {isListening ? <Mic className="w-4 h-4 text-[#00A3FF] animate-pulse" /> : <Sparkles className="w-4 h-4" />}
              <span>
                {voiceError || (isListening ? 'Listening now. Speak naturally.' : interimTranscript ? 'Voice transcript captured.' : 'Voice ready.')}
              </span>
            </div>
            {isListening && (
              <button type="button" onClick={stopListening} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50">
                Stop
              </button>
            )}
          </div>
        )}
        <div className="mb-3 grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Voice vendor
            <select
              value={selectedVoiceVendor}
              onChange={(event) => setSelectedVoiceVendor(event.target.value as VoiceVendorId)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold normal-case tracking-normal text-slate-700 focus:border-[#00A3FF] focus:outline-none"
            >
              {voiceVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id} disabled={!vendor.configured}>
                  {vendor.label}{vendor.configured ? '' : ' (unconfigured)'}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Voice
            <select
              value={selectedVoiceId}
              onChange={(event) => {
                const nextVoiceId = event.target.value;
                setSelectedVoiceId(nextVoiceId);
                const nextVoice = selectedVendorConfig?.voices.find((voice) => voice.id === nextVoiceId);
                if (nextVoice?.defaultModelId) {
                  setSelectedVoiceModelId(nextVoice.defaultModelId);
                }
              }}
              disabled={!selectedVendorConfig?.configured || selectedVendorConfig.voices.length === 0}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold normal-case tracking-normal text-slate-700 focus:border-[#00A3FF] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {(selectedVendorConfig?.voices || []).map((voice: VoiceOption) => (
                <option key={voice.id} value={voice.id}>{voice.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Voice model
            <select
              value={selectedVoiceModelId}
              onChange={(event) => setSelectedVoiceModelId(event.target.value)}
              disabled={!selectedVendorConfig?.configured || availableModelIds.length === 0}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold normal-case tracking-normal text-slate-700 focus:border-[#00A3FF] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {availableModelIds.map((modelId) => (
                <option key={modelId} value={modelId}>{modelId}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={isVoiceReplyEnabled}
              disabled={!user}
              onChange={(event) => setIsVoiceReplyEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#00A3FF] focus:ring-[#00A3FF]"
            />
            Auto speak replies
          </label>
        </div>
        {(voiceCatalogError || selectedVendorConfig?.reason) && (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
            {voiceCatalogError || selectedVendorConfig?.reason}
          </div>
        )}
        {!user && (
          <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
            Voice replies use premium vendor APIs. Sign in to enable playback and auto-speak.
          </div>
        )}
        {selectedAttachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedAttachments.map((attachment) => (
              <button
                key={attachment.id}
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
              >
                {attachment.kind === 'notebook-source' ? <Link2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                {attachment.title}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 transition-all focus-within:border-[#00A3FF] focus-within:ring-4 focus-within:ring-[#00A3FF]/5">
          <div className="flex items-center gap-2 border-b border-slate-200/80 px-4 py-3">
            <button
              type="button"
              title="Context and source attachments"
              onClick={() => setIsAttachmentPickerOpen((open) => !open)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold transition-all ${isAttachmentPickerOpen ? 'border-[#00A3FF] bg-white text-[#00A3FF]' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'}`}
            >
              <AtSign className="w-3.5 h-3.5" />
              Add context
            </button>
            <button
              type="button"
              title="Upload attachment files"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition-all hover:text-slate-900"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Upload file
            </button>
            <button
              type="button"
              title={isVoiceSupported ? (isListening ? 'Stop voice input' : 'Start voice input') : 'Voice input is unavailable in this browser'}
              onClick={toggleListening}
              disabled={!isVoiceSupported || isTyping}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold transition-all ${isListening ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isListening ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {isListening ? 'Listening' : 'Speak'}
            </button>
            <button
              type="button"
              title="Attach NotebookLM sources"
              onClick={() => setIsAttachmentPickerOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition-all hover:text-slate-900"
            >
              <Link2 className="w-3.5 h-3.5" />
              NotebookLM sources
            </button>
            <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.json,.csv,.html,.ts,.tsx,.js,.jsx,.py" title="Upload attachment files" className="hidden" onChange={handleFileSelection} />
          </div>

          <div className="flex items-center gap-3 px-4 py-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={isVoiceSupported ? 'Speak or type your request...' : 'Type your request...'}
              className="flex-1 bg-transparent py-2 text-sm text-slate-900 focus:outline-none placeholder:text-slate-400"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!query.trim() || isTyping}
              title="Send message"
              className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center hover:bg-slate-800 disabled:opacity-40 transition-all shrink-0 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        {isAttachmentPickerOpen && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Attachments</p>
                <p className="mt-1 text-sm font-bold text-slate-900">Attach files or NotebookLM sources</p>
              </div>
              <button type="button" onClick={() => setIsAttachmentPickerOpen(false)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100">
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">NotebookLM sources</p>
              {availableSources.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No NotebookLM sources yet. Add them in Research Lab, then attach them here.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {availableSources.map((source) => {
                    const isSelected = selectedAttachments.some((attachment) => attachment.id === source.id);
                    return (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => toggleSourceAttachment(source)}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${isSelected ? 'border-[#00A3FF] bg-[#00A3FF0A]' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isSelected ? 'bg-[#00A3FF] text-white' : 'bg-white text-[#00A3FF] border border-slate-200'}`}>
                          {sourceIcon(source.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-900">{source.title}</p>
                          <p className="text-[10px] text-slate-500">{source.type.toUpperCase()}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

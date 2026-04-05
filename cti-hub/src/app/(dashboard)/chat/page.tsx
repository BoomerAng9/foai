'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Send, CornerDownLeft, ArrowDown, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { RolodexVerb } from '@/components/chat/RolodexVerb';
import type { Message, Attachment, Conversation, TierId, AgentTier, ModelOption } from '@/lib/chat/types';
import { TIERS, MODELS } from '@/lib/chat/types';
import { ChevronDown } from 'lucide-react';
import { TaskView } from '@/components/chat/TaskView';
import { LucPopup } from '@/components/chat/LucPopup';
import type { LucEstimate } from '@/lib/luc/types';
import { AttachmentMenu } from '@/components/chat/AttachmentMenu';
import type { Skill } from '@/lib/skills/registry';
import { buildGrammarPrompt, buildConfirmationPrompt, isPassthrough, GRAMMAR_DISCLAIMER } from '@/lib/grammar/converter';
import { VoiceBar } from '@/components/voice/VoiceBar';
import { AcheevyInterview } from '@/components/onboarding/AcheevyInterview';

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function ChatWithACHEEVY() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const deployAgent = searchParams.get('deploy');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deployInitRef = useRef(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionCost, setSessionCost] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTier, setActiveTier] = useState<TierId>('premium');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [lucEstimate, setLucEstimate] = useState<LucEstimate | null>(null);
  const [lucPendingMsg, setLucPendingMsg] = useState<string | null>(null);
  const [lucPendingAttachments, setLucPendingAttachments] = useState<Attachment[]>([]);
  const [estimateCount, setEstimateCount] = useState(0);
  const [budgetRemaining, setBudgetRemaining] = useState<number | null>(null);
  const [budgetStarting, setBudgetStarting] = useState<number>(20);
  const [autoAccept, setAutoAccept] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // Voice ON by default
  const [grammarActive, setGrammarActive] = useState(false);
  const [grammarShownDisclaimer, setGrammarShownDisclaimer] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [streamingCost, setStreamingCost] = useState<{ tokens_in: number; tokens_out: number; cost: number } | null>(null);
  const [manageItInput, setManageItInput] = useState('');
  const [guideMode, setGuideMode] = useState(false);
  const defaultModel = MODELS.find(m => m.tag === 'DEFAULT')?.id || MODELS[0].id;
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [activeDispatch, setActiveDispatch] = useState<{
    tier: AgentTier;
    agents: string[];
    taskSummary: string;
    streamContent: string;
  } | null>(null);
  const [showScenarios, setShowScenarios] = useState(false);
  const [scenarioContext, setScenarioContext] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const currentTier = TIERS.find(t => t.id === activeTier) || TIERS[0];

  // Check onboarding status on first visit
  useEffect(() => {
    if (!user) return;
    // Skip if already completed or skipped this session
    if (localStorage.getItem('onboarding_completed') || localStorage.getItem('onboarding_skipped')) return;
    fetch('/api/onboarding')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && !data.completed) {
          setShowOnboarding(true);
        } else if (data?.completed) {
          localStorage.setItem('onboarding_completed', 'true');
        }
      })
      .catch(() => {});
  }, [user]);

  // Keep session alive — refresh token every 30 minutes
  useEffect(() => {
    if (!user) return;
    const refreshSession = async () => {
      try {
        const token = await user.getIdToken(true);
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: token }),
        });
      } catch {}
    };
    refreshSession(); // Refresh on mount
    const interval = setInterval(refreshSession, 30 * 60 * 1000); // Every 30 min
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return; // Don't fetch until authed
    fetch('/api/conversations')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.conversations) setConversations(d.conversations); })
      .catch(() => {});
    fetch('/api/budget')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.remaining != null) { setBudgetRemaining(d.remaining); setBudgetStarting(d.starting); } })
      .catch(() => {});
  }, [user]);

  const loadMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/conversations?id=${convId}`);
    const data = await res.json();
    setMessages((data.messages || []).map((m: Message) => ({ ...m })));
  }, []);

  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 300;
      if (isNearBottom) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Force scroll during active streaming so user stays at the bottom
  const isStreaming = messages.some(m => m.streaming);
  useEffect(() => {
    if (!isStreaming || !scrollRef.current) return;
    const el = scrollRef.current;
    const interval = setInterval(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    }, 80);
    return () => clearInterval(interval);
  }, [isStreaming]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-send deployment message when ?deploy=AgentName is in URL
  useEffect(() => {
    if (!deployAgent || deployInitRef.current || !user) return;
    deployInitRef.current = true;
    // Wait a tick for chat to initialize, then send the deployment prompt
    const timer = setTimeout(() => {
      const deployMsg = `I want to deploy ${deployAgent} for my business. Walk me through what ${deployAgent} can do for me and help me set it up.`;
      setInput(deployMsg);
      // Auto-send after a brief delay so user sees the message
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      }, 500);
    }, 1000);
    return () => clearTimeout(timer);
  }, [deployAgent, user]);

  // Close model dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    if (modelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [modelDropdownOpen]);

  // Group models by tag for the dropdown
  const modelsByTag = MODELS.reduce<Record<string, ModelOption[]>>((acc, m) => {
    const tag = m.tag || 'OTHER';
    if (!acc[tag]) acc[tag] = [];
    acc[tag].push(m);
    return acc;
  }, {});
  const tagOrder = ['DEFAULT', 'PREMIUM', 'FAST', 'REASON', 'CHEAP', 'OPEN', 'FREE', 'OTHER'];
  const selectedModelObj = MODELS.find(m => m.id === selectedModel);

  function scrollToBottom() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: Attachment[] = [];
    Array.from(files).forEach(file => {
      if (attachments.length + newAttachments.length >= 10) return;
      const att: Attachment = { name: file.name, type: file.type, size: file.size };
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments(prev => prev.map(a => a.name === file.name ? { ...a, url: reader.result as string } : a));
        };
        reader.readAsDataURL(file);
      }
      newAttachments.push(att);
    });
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  }

  function removeAttachment(name: string) {
    setAttachments(prev => prev.filter(a => a.name !== name));
  }

  async function executeSend(msg: string, currentAttachments: Attachment[]) {
    setSending(true);

    const tempUserMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: msg,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    let streamId = `a-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: streamId,
      role: 'acheevy',
      content: '',
      streaming: true,
      created_at: new Date().toISOString(),
    }]);

    try {
      // Get fresh token — send as Bearer to bypass stale cookie
      const idToken = user ? await user.getIdToken(true) : '';
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          message: msg,
          conversation_id: activeConvId,
          model: selectedModel,
          attachments: currentAttachments.map(a => ({ name: a.name, type: a.type, size: a.size })),
          skill_context: scenarioContext || activeSkill?.systemContext || undefined,
          mode: guideMode ? 'guide' : undefined,
        }),
      });

      const newConvId = res.headers.get('X-Conversation-Id');
      if (!activeConvId && newConvId) {
        setActiveConvId(newConvId);
        setConversations(prev => [
          { id: newConvId, title: msg.slice(0, 50), updated_at: new Date().toISOString() },
          ...prev,
        ]);
      }

      // Detect agent tier from response headers — activate split-screen
      const agentTier = parseInt(res.headers.get('X-Agent-Tier') || '0', 10) as AgentTier;
      const agentRoster = (res.headers.get('X-Agent-Roster') || '').split(',').filter(Boolean);
      if (agentTier > 0 && agentRoster.length > 0) {
        setActiveDispatch({
          tier: agentTier,
          agents: agentRoster,
          taskSummary: msg.slice(0, 80),
          streamContent: '',
        });
      }

      const contentType = res.headers.get('Content-Type') || '';

      if (!res.ok || !res.body || !contentType.includes('text/event-stream')) {
        // On 401, try to auto-refresh the session token and retry once
        if (res.status === 401 && user) {
          try {
            const freshToken = await user.getIdToken(true);
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken: freshToken }),
            });
            // Retry the original request
            const retryRes = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: msg,
                conversation_id: activeConvId,
                model: selectedModel,
                attachments: currentAttachments.map(a => ({ name: a.name, type: a.type, size: a.size })),
                skill_context: scenarioContext || activeSkill?.systemContext || undefined,
                mode: guideMode ? 'guide' : undefined,
              }),
            });
            if (retryRes.ok && retryRes.body) {
              // Swap to the retry response and continue with streaming below
              // Re-assign and fall through — but since we can't re-assign const, handle inline
              const retryContentType = retryRes.headers.get('Content-Type') || '';
              if (retryContentType.includes('text/event-stream')) {
                const reader = retryRes.body.getReader();
                const decoder = new TextDecoder();
                let buf = '';
                let voiceText = '';
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buf += decoder.decode(value, { stream: true });
                  const lines = buf.split('\n');
                  buf = lines.pop() || '';
                  for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (data.done) {
                        setStreamingCost(null);
                        setMessages(prev => prev.map(m =>
                          m.id === streamId ? { ...m, streaming: false, metadata: data.usage } : m
                        ));
                      } else if (data.content) {
                        voiceText += data.content;
                        setMessages(prev => prev.map(m =>
                          m.id === streamId ? { ...m, content: (m.content || '') + data.content } : m
                        ));
                      }
                      if (data.cost) setStreamingCost(data.cost);
                    } catch {}
                  }
                }
                return; // Successfully retried
              }
            }
          } catch (refreshErr) {
            console.error('[Chat] Token refresh failed:', refreshErr);
          }
        }

        let errorMsg = 'Connection error. Please try again.';
        try {
          const errData = await res.json();
          if (res.status === 401) {
            // Try one more silent refresh before showing error
            if (user) {
              try {
                const freshToken = await user.getIdToken(true);
                await fetch('/api/auth/session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accessToken: freshToken }),
                });
                errorMsg = 'Session refreshed. Please send your message again.';
              } catch {
                errorMsg = 'Session expired. Please sign out and sign back in.';
              }
            } else {
              errorMsg = 'Please sign in to chat with ACHEEVY.';
            }
          } else {
            errorMsg = errData.error || errorMsg;
          }
        } catch {}
        setMessages(prev => prev.map(m =>
          m.id === streamId ? { ...m, content: errorMsg, streaming: false } : m
        ));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullVoiceText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              setStreamingCost(null);
              // Mark dispatch as complete, then auto-dismiss after 3s
              setActiveDispatch(prev => prev ? { ...prev, streamContent: prev.streamContent + ' [complete]' } : null);
              setTimeout(() => setActiveDispatch(null), 5000);
              setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, streaming: false, metadata: data.usage } : m
              ));
              if (data.usage) {
                setSessionTokens(prev => prev + (data.usage.tokens_in || 0) + (data.usage.tokens_out || 0));
                setSessionCost(prev => prev + (data.usage.cost || 0));
              }
              if (data.budget) {
                setBudgetRemaining(data.budget.remaining);
                setBudgetStarting(data.budget.starting);
              }
              // Auto-voice: read ACHEEVY's response aloud (deferred to avoid side-effects in state updater)
              if (voiceEnabled && fullVoiceText) {
                const cleanText = fullVoiceText
                  .replace(/!\[.*?\]\(.*?\)/g, '')
                  .replace(/<!--[\s\S]*?-->/g, '')
                  .replace(/\*\*/g, '')
                  .slice(0, 500)
                  .trim();
                if (cleanText) {
                  fetch('/api/voice/synthesize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: cleanText }),
                  }).then(r => r.json()).then(d => {
                    if (d.audio) {
                      const audio = new Audio(d.audio);
                      audioRef.current = audio;
                      audio.play().catch(() => {});
                    }
                  }).catch(() => {});
                }
              }
            } else if (data.cost_update) {
              setStreamingCost(data.cost_update);
            } else if (data.thinking || data.thinking_partial) {
              const thinkText = data.thinking || data.thinking_partial;
              setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, thinking: thinkText } : m
              ));
            } else if (data.agent) {
              setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, activeAgent: data.agent } : m
              ));
            } else if (data.agent_working) {
              // ACHEEVY is processing — show indicator, start a new message for ACHEEVY's response
              const acheevyId = `acheevy-${Date.now()}`;
              setMessages(prev => [
                ...prev.map(m => m.id === streamId ? { ...m, streaming: false } : m),
                { id: acheevyId, role: 'acheevy' as const, content: '', streaming: true, activeAgent: 'ACHEEVY', created_at: new Date().toISOString() },
              ]);
              streamId = acheevyId; // Subsequent content goes to ACHEEVY's message
            } else if (data.content) {
              fullVoiceText += data.content;
              setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, content: m.content + data.content } : m
              ));
              // Feed content to active dispatch for process tracker
              setActiveDispatch(prev => prev ? { ...prev, streamContent: (prev.streamContent + data.content).slice(-500) } : null);
            }
          } catch {}
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection error. Try again.';
      setStreamingCost(null);
      setMessages(prev => prev.map(m =>
        m.id === streamId ? { ...m, content: errorMsg, streaming: false } : m
      ));
    } finally {
      setSending(false);
      setStreamingCost(null);
      inputRef.current?.focus();
    }
  }

  async function handleSend(text?: string, skipEstimate?: boolean) {
    let msg = text || input.trim();
    if (!msg || sending) return;

    // Grammar mode: wrap the message in a conversion prompt
    // ACHEEVY will convert, read back, and confirm before executing
    if (grammarActive && !isPassthrough(msg) && !msg.startsWith('[GRAMMAR')) {
      const grammarPrompt = buildGrammarPrompt(msg);
      const confirmPrompt = buildConfirmationPrompt(msg, grammarPrompt);
      // Send as a Grammar-wrapped message — ACHEEVY handles the confirmation
      msg = `[GRAMMAR ACTIVE]\n\n${confirmPrompt}`;
    }

    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    // LUC estimate only for job initiations (deploy, build, pipeline, launch, ship)
    // Regular chat, image model selections, and short replies skip the gate
    const isJobRequest = /\b(deploy|build|launch|ship|execute|run pipeline|start pipeline|provision|spin up|create.*app|create.*service|create.*api)\b/i.test(msg);
    const shouldEstimate = !skipEstimate && !autoAccept && isJobRequest && messages.length > 0;

    if (shouldEstimate) {
      try {
        const estRes = await fetch('/api/luc/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg,
            tier: activeTier,
            attachments: currentAttachments.map(a => ({ name: a.name, type: a.type })),
          }),
        });
        const estData = await estRes.json();

        if (estData.estimate) {
          setEstimateCount(prev => prev + 1);
          setLucEstimate(estData.estimate);
          setLucPendingMsg(msg);
          setLucPendingAttachments(currentAttachments);
          return;
        }
      } catch {}
    }

    await executeSend(msg, currentAttachments);
  }

  function handleLucAccept() {
    const msg = lucPendingMsg;
    const atts = lucPendingAttachments;
    setLucEstimate(null);
    setLucPendingMsg(null);
    setLucPendingAttachments([]);
    if (msg) executeSend(msg, atts);
  }

  function handleLucAdjust() {
    setLucEstimate(null);
    setLucPendingMsg(null);
    setLucPendingAttachments([]);
  }

  function handleLucStop() {
    setLucEstimate(null);
    setLucPendingMsg(null);
    setLucPendingAttachments([]);
  }

  function startNewConversation() {
    setActiveConvId(null);
    setMessages([]);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  }

  async function handleScreenshot() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const canvas = document.createElement('canvas');
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      track.stop();
      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      setAttachments(prev => [...prev, {
        name: `screenshot-${Date.now()}.png`,
        type: 'image/png',
        size: blob.size,
        url: dataUrl,
      }]);
    } catch {}
  }

  function handleGrammarToggle() {
    if (!grammarActive && !grammarShownDisclaimer) {
      // Show disclaimer as a system message
      setMessages(prev => [...prev, {
        id: `grammar-disclaimer-${Date.now()}`,
        role: 'acheevy',
        content: GRAMMAR_DISCLAIMER,
        created_at: new Date().toISOString(),
      }]);
      setGrammarShownDisclaimer(true);
    }
    setGrammarActive(!grammarActive);
  }

  function handleSkillSelect(skill: Skill) {
    if (!skill.id) {
      setActiveSkill(null);
      return;
    }
    setActiveSkill(skill);
    // Pre-fill with example prompt if input is empty
    if (!input.trim()) {
      setInput(skill.example);
      inputRef.current?.focus();
    }
  }

  function handleDeepResearch(mode: 'search' | 'crawl' | 'extract') {
    const prefixes: Record<string, string> = {
      search: '[Deep Research: Search] ',
      crawl: '[Deep Research: Crawl] ',
      extract: '[Deep Research: Extract] ',
    };
    setInput(prev => prefixes[mode] + prev);
    inputRef.current?.focus();
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full">
      {/* Onboarding overlay */}
      {showOnboarding && (
        <AcheevyInterview onComplete={() => setShowOnboarding(false)} />
      )}
      {/* Chat sidebar - slide-in on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`
        fixed inset-y-0 left-0 z-30 md:relative md:z-auto
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full hidden'}
      `}>
        <ChatSidebar
          conversations={conversations}
          activeConvId={activeConvId}
          sessionTokens={sessionTokens}
          sessionCost={sessionCost}
          onSelectConversation={setActiveConvId}
          onNewConversation={() => { startNewConversation(); setSidebarOpen(false); }}
        />
      </div>

      <div className="flex-1 flex flex-col relative bg-bg min-w-0">
        <div className="flex items-center px-2 sm:px-4 py-1 shrink-0 gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-bracket text-[10px]"
          >
            {sidebarOpen ? 'HIDE' : 'THREADS'}
          </button>

          {/* Model Switcher */}
          <div ref={modelDropdownRef} className="relative">
            <button
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-1 border border-border bg-bg-surface hover:border-accent/50 transition-colors text-[10px] font-mono text-fg-secondary"
            >
              <span className="truncate max-w-[140px] sm:max-w-[200px]">{selectedModelObj?.name || 'Select Model'}</span>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {modelDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-[300px] max-h-[400px] overflow-y-auto border border-border bg-bg-surface shadow-lg">
                {tagOrder.map(tag => {
                  const models = modelsByTag[tag];
                  if (!models?.length) return null;
                  return (
                    <div key={tag}>
                      <div className="px-3 py-1.5 text-[9px] font-mono font-bold tracking-widest text-fg-ghost uppercase bg-bg-elevated border-b border-border">
                        {tag}
                      </div>
                      {models.map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setSelectedModel(m.id); setModelDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 hover:bg-bg-elevated transition-colors border-b border-border/50 ${
                            m.id === selectedModel ? 'bg-accent/10 border-l-2 border-l-accent' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-mono text-[11px] ${m.id === selectedModel ? 'text-accent font-semibold' : 'text-fg'}`}>
                              {m.name}
                            </span>
                            <span className="font-mono text-[9px] text-fg-ghost">{m.context}</span>
                          </div>
                          <div className="font-mono text-[9px] text-fg-tertiary mt-0.5">
                            {m.provider}{m.price_in === 0 ? ' — free' : ` — $${m.price_in}/$${m.price_out} per 1M`}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {/* Agent Assembly + Process Tracker — split-screen during autonomous tasks */}
          <AnimatePresence>
            {activeDispatch && (
              <TaskView
                tier={activeDispatch.tier}
                agents={activeDispatch.agents}
                taskSummary={activeDispatch.taskSummary}
                streamContent={activeDispatch.streamContent}
                onDismiss={() => setActiveDispatch(null)}
              />
            )}
          </AnimatePresence>

          {isEmpty && !activeDispatch ? (
            <div className="flex flex-col items-center px-4 sm:px-6 md:px-8 py-4 md:py-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/acheevy-chat-hero.png"
                alt="ACHEEVY"
                className="w-32 h-32 sm:w-44 sm:h-44 object-contain mb-4 animate-materialize"
                style={{ filter: 'drop-shadow(0 8px 24px rgba(232,160,32,0.2))' }}
              />
              <h1 className="text-xl sm:text-2xl font-light tracking-tight mb-1 text-center">
                Chat w/ <span className="font-bold">ACHEEVY</span>
              </h1>
              <p className="text-fg-secondary text-sm text-center mb-6">
                What will we <RolodexVerb /> today?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                {/* LEFT — Autonomous path */}
                <div className="border border-border bg-bg-surface p-6 flex flex-col gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icon-manage-it.png" alt="" className="w-10 h-10 object-contain" />
                  <div>
                    <span className="label-mono text-accent">Let ACHEEVY Manage It</span>
                  </div>
                  <p className="text-xs text-fg-secondary leading-relaxed">
                    For quick, autonomous deployments. Provide a prompt and let ACHEEVY handle the orchestration. (2-5 minutes)
                  </p>
                  <textarea
                    value={manageItInput}
                    onChange={(e) => setManageItInput(e.target.value)}
                    placeholder="Describe what you want to deploy..."
                    rows={3}
                    className="input-field min-h-[80px] max-h-[120px] resize-none py-3 text-sm"
                  />
                  <button
                    onClick={() => {
                      if (manageItInput.trim()) {
                        handleSend(manageItInput.trim(), true);
                        setManageItInput('');
                      }
                    }}
                    disabled={!manageItInput.trim() || sending}
                    className="btn-solid self-start cursor-pointer"
                  >
                    Prompt It
                  </button>
                </div>

                {/* RIGHT — Interactive path */}
                <div className="border border-border bg-bg-surface p-6 flex flex-col gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icon-guide-me.png" alt="" className="w-10 h-16 object-contain object-left" />
                  <div>
                    <span className="label-mono text-accent">Let ACHEEVY Guide Me</span>
                  </div>
                  <p className="text-xs text-fg-secondary leading-relaxed">
                    For interactive deployments. Work with ACHEEVY through a Q&amp;A session to define and deploy your solution. (4-10 minutes)
                  </p>
                  <div className="flex-1" />
                  <button
                    onClick={() => { setGuideMode(true); handleSend('Help me figure out what I need to build.', true); }}
                    disabled={sending}
                    className="btn-solid self-start cursor-pointer"
                  >
                    Let&apos;s Begin
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-4 px-3 sm:py-6 sm:px-4 md:py-8 md:px-6 space-y-6">
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
            </div>
          )}
        </div>

        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 w-8 h-8 bg-accent text-bg flex items-center justify-center shadow-lg hover:bg-accent-hover transition-colors"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Voice Bar */}
        <VoiceBar
          onTranscript={(text) => handleSend(text)}
          voiceEnabled={voiceEnabled}
          onVoiceToggle={() => {
            if (voiceEnabled && audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
            }
            setVoiceEnabled(!voiceEnabled);
          }}
        />

        <div className="border-t border-border bg-bg-surface p-2 sm:p-3 md:p-4">
          <div className="max-w-3xl mx-auto">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 pl-2.5 pr-1 py-1 bg-bg-elevated border border-border group">
                    {att.type.startsWith('image/') && att.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={att.url} alt={att.name} className="w-6 h-6 object-cover" />
                    ) : att.type.startsWith('image/') ? (
                      <ImageIcon className="w-3.5 h-3.5 text-fg-tertiary" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-fg-tertiary" />
                    )}
                    <span className="font-mono text-[10px] text-fg-secondary truncate max-w-[100px]">{att.name}</span>
                    <span className="font-mono text-[9px] text-fg-ghost">{formatFileSize(att.size)}</span>
                    <button onClick={() => removeAttachment(att.name)} className="p-0.5 hover:bg-signal-error hover:text-white transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 sm:gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.csv,.json,.md,.doc,.docx,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <AttachmentMenu
                onFileSelect={() => fileInputRef.current?.click()}
                onScreenshot={handleScreenshot}
                onDeepResearch={handleDeepResearch}
                onSkillSelect={handleSkillSelect}
                activeSkillId={activeSkill?.id || null}
                activeTier={activeTier}
                onTierChange={setActiveTier}
                isSubscriber={true}
                grammarActive={grammarActive}
                onGrammarToggle={handleGrammarToggle}
              />

              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message ACHEEVY..."
                  rows={1}
                  className="input-field min-h-[44px] max-h-[160px] resize-none py-3 pr-12"
                  style={{ height: 'auto' }}
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-1 text-fg-ghost">
                  <CornerDownLeft className="w-3 h-3" />
                  <span className="font-mono text-[9px]">ENTER</span>
                </div>
              </div>
              <button
                onClick={() => handleSend(undefined, false)}
                disabled={!input.trim() || sending}
                className="btn-solid h-[44px] w-[44px] px-0 shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Scenarios toggle */}
            <div className="flex items-center mt-2 mb-1">
              <button
                onClick={() => setShowScenarios(!showScenarios)}
                className="font-mono text-[9px] text-fg-ghost hover:text-accent transition-colors flex items-center gap-1"
              >
                <span className="text-[11px] leading-none">{showScenarios ? '−' : '+'}</span>
                <span>scenarios &amp; plugins</span>
              </button>
              {scenarioContext && (
                <button
                  onClick={() => setScenarioContext(null)}
                  className="ml-2 font-mono text-[9px] text-accent border border-accent/30 px-1.5 py-0.5 hover:bg-accent/10 transition-colors flex items-center gap-1"
                >
                  {scenarioContext} <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Scenarios Panel — 27 tiles across 6 categories */}
            <AnimatePresence>
              {showScenarios && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="py-3 space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                    {([
                      { label: 'SKILLS', color: '#E8A020', tiles: [
                        { id: 'open-mind', name: 'Open Mind', desc: 'Innovation & brainstorming' },
                        { id: 'speakly', name: 'Speakly', desc: 'Presentation & pitch coaching' },
                        { id: 'broadcast', name: 'Broadcast Studio', desc: 'Video production suite' },
                        { id: 'pascal', name: 'Pascal Editor', desc: 'Document & content editing' },
                        { id: 'adaptive-lang', name: 'Adaptive Language', desc: 'Tone & dialect matching' },
                        { id: 'virtual-office', name: 'Virtual Office', desc: 'Workspace management' },
                      ]},
                      { label: 'STRATEGIC AGENTS', color: '#06B6D4', tiles: [
                        { id: 'scout-ang', name: 'Scout_Ang', desc: 'Research & web intelligence' },
                        { id: 'content-ang', name: 'Content_Ang', desc: 'Blog, social, email creation' },
                        { id: 'edu-ang', name: 'Edu_Ang', desc: 'Lesson plans & courses' },
                        { id: 'biz-ang', name: 'Biz_Ang', desc: 'Business strategy & ops' },
                        { id: 'ops-ang', name: 'Ops_Ang', desc: 'Process & workflow automation' },
                        { id: 'iller-ang', name: 'Iller_Ang', desc: 'Visual & cinematic direction' },
                        { id: 'cfo-ang', name: 'CFO_Ang', desc: 'Finance & budget analysis' },
                      ]},
                      { label: 'TACTICAL AGENTS', color: '#8B5CF6', tiles: [
                        { id: 'lil-scout', name: 'Lil_Scout', desc: 'Quick web lookups' },
                        { id: 'lil-writer', name: 'Lil_Writer', desc: 'Fast content drafts' },
                        { id: 'lil-coder', name: 'Lil_Coder', desc: 'Code snippets & fixes' },
                        { id: 'lil-designer', name: 'Lil_Designer', desc: 'Quick visual mockups' },
                        { id: 'lil-analyst', name: 'Lil_Analyst', desc: 'Data crunching' },
                        { id: 'lil-social', name: 'Lil_Social', desc: 'Social media posts' },
                        { id: 'lil-support', name: 'Lil_Support', desc: 'Customer support drafts' },
                        { id: 'lil-scheduler', name: 'Lil_Scheduler', desc: 'Calendar & task planning' },
                      ]},
                      { label: 'TOOLS', color: '#10B981', tiles: [
                        { id: 'research', name: 'Research', desc: 'Deep web research mode' },
                        { id: 'film-analysis', name: 'Film Analysis', desc: 'Video & media breakdown' },
                        { id: 'image-gen', name: 'Image Gen', desc: 'AI image generation' },
                        { id: 'video-gen', name: 'Video Gen', desc: 'AI video generation' },
                        { id: 'voice', name: 'Voice', desc: 'Text-to-speech & voice' },
                        { id: 'custom', name: 'Custom', desc: 'Define your own scenario' },
                      ]},
                    ] as { label: string; color: string; tiles: { id: string; name: string; desc: string }[] }[]).map(group => (
                      <div key={group.label}>
                        <p className="font-mono text-[9px] uppercase tracking-[0.2em] mb-2" style={{ color: group.color }}>{group.label}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {group.tiles.map(tile => (
                            <button
                              key={tile.id}
                              onClick={() => {
                                setScenarioContext(tile.name);
                                setShowScenarios(false);
                              }}
                              className="flex flex-col gap-1 p-2.5 border transition-all text-left hover:border-accent/50"
                              style={{
                                background: scenarioContext === tile.name
                                  ? 'rgba(232,160,32,0.10)'
                                  : 'rgba(255,255,255,0.02)',
                                borderColor: scenarioContext === tile.name
                                  ? 'rgba(232,160,32,0.5)'
                                  : 'rgba(255,255,255,0.08)',
                              }}
                            >
                              <span className="font-mono text-[10px] font-semibold tracking-wide" style={{
                                color: scenarioContext === tile.name ? '#E8A020' : 'rgba(255,255,255,0.85)',
                              }}>{tile.name}</span>
                              <span className="font-mono text-[8px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{tile.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2 font-mono text-[9px]">
                <span className="led" style={{ background: currentTier.color }} />
                <span className="font-semibold uppercase tracking-wider">{currentTier.name}</span>
                <span className="text-fg-ghost">|</span>
                <span className={`font-semibold ${
                  budgetRemaining === null ? 'text-fg-ghost' :
                  budgetRemaining > 10 ? 'text-signal-success' :
                  budgetRemaining > 3 ? 'text-signal-warning' :
                  'text-signal-error'
                }`}>
                  {budgetRemaining !== null ? `$${budgetRemaining.toFixed(2)} remaining` : 'Usage tracking on'}
                </span>
                {streamingCost && (
                  <>
                    <span className="text-fg-ghost">|</span>
                    <span className="text-signal-info">
                      ▸ ${streamingCost.cost < 0.0001 ? streamingCost.cost.toExponential(1) : streamingCost.cost.toFixed(4)} | {(streamingCost.tokens_in + streamingCost.tokens_out).toLocaleString()} tokens
                    </span>
                  </>
                )}
                {guideMode && (
                  <>
                    <span className="text-fg-ghost">|</span>
                    <button onClick={() => setGuideMode(false)} className="text-signal-live font-semibold hover:text-signal-live/70 transition-colors">
                      GUIDE ME ✓
                    </button>
                  </>
                )}
                {grammarActive && (
                  <>
                    <span className="text-fg-ghost">|</span>
                    <span className="text-accent font-semibold">GRAMMAR</span>
                  </>
                )}
                {activeSkill && (
                  <>
                    <span className="text-fg-ghost">|</span>
                    <span className="text-signal-info font-semibold">{activeSkill.alias}</span>
                  </>
                )}
              </div>
              <p className="font-mono text-[9px] text-fg-ghost">
                The Deploy Platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {lucEstimate && (
        <LucPopup
          estimate={lucEstimate}
          estimateCount={estimateCount}
          onAccept={handleLucAccept}
          onAdjust={handleLucAdjust}
          onStop={handleLucStop}
          onAutoAcceptChange={setAutoAccept}
          autoAcceptEnabled={autoAccept}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatWithACHEEVY />
    </Suspense>
  );
}

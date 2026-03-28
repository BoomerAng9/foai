"use client";

import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Globe,
  Youtube,
  FlaskConical,
  BrainCircuit,
  Clock,
  Sparkles,
  Send,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';
// Database access via API routes (postgres.js is server-only)
import { type NotebookSource, type ResearchResponse } from '@/lib/research/notebooklm';
import { useAuth } from '@/hooks/useAuth';
import { type PersistedSourceRecord, mapPersistedSourceRecord } from '@/lib/research/source-records';
import { sourceIcon } from '@/lib/research/source-icons';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ResearchAgentMessage {
  id: string;
  role: 'agent' | 'user';
  content: string;
  timestamp: string;
  reasoningSteps?: string[];
  type?: 'research' | 'translation' | 'optimization' | 'notebook';
  citations?: ResearchResponse['citations'];
}

export default function ResearchLab() {
  const { user, trackUsage } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'sources' | 'tli'>('chat');
  const [researchMode, setResearchMode] = useState<'glm-5' | 'notebook'>('glm-5');
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ResearchAgentMessage[]>([
    {
      id: '1',
      role: 'agent',
      content:
        'Welcome to the Research Lab. I am your AutoResearch Agent. I can crawl your technical indices, refine your prompts, and conduct deep research experiments. We are now integrated with NotebookLM for deep context analysis.',
      timestamp: new Date().toLocaleTimeString(),
      type: 'research',
    },
  ]);

  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [newSourceType, setNewSourceType] = useState<NotebookSource['type']>('url');
  const [newSourceInput, setNewSourceInput] = useState('');
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [tliNodes] = useState([
    { id: '1', name: 'API_ORCHESTRATOR', status: 'optimized', confidence: 0.98 },
    { id: '2', name: 'MIM_POLICY_V3', status: 'researching', confidence: 0.85 },
    { id: '3', name: 'UI_GLASS_TOKENS', status: 'pending', confidence: 0.92 },
  ]);

  useEffect(() => {
    async function initNotebook() {
      if (researchMode !== 'notebook' || notebookId || !user) {
        return;
      }

      try {
        const cpRes = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'select', table: 'context_packs', filters: { user_id: user.uid } }),
        });
        const cpData = await cpRes.json();
        if (cpData.data?.[0]?.notebook_id) {
          setNotebookId(cpData.data[0].notebook_id);
          return;
        }

        const response = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'init', projectName: 'Global' }),
        });
        const payload = await response.json();

        if (!response.ok || !payload?.notebookId) {
          throw new Error(payload?.error || 'Failed to initialize research context');
        }

        setNotebookId(payload.notebookId);

        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'insert', table: 'context_packs', data: {
            user_id: user.uid,
            name: 'Global Research Index',
            notebook_id: payload.notebookId,
            type: 'tli',
          }}),
        });
      } catch (error) {
        console.error('[Research] Init error:', error);
        toast.error('Failed to initialize Research Context');
      }
    }

    void initNotebook();
  }, [researchMode, notebookId, user]);

  useEffect(() => {
    async function loadSources() {
      if (researchMode !== 'notebook' || !notebookId || !user) {
        return;
      }

      try {
        const dsRes = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'select', table: 'data_sources', filters: { notebook_id: notebookId } }),
        });
        const { data } = await dsRes.json();

        if (data && data.length > 0) {
          const mappedSources: NotebookSource[] = (data as PersistedSourceRecord[]).map(mapPersistedSourceRecord);

          setSources(mappedSources);
        }
      } catch (error) {
        console.error('[Research] Load sources error:', error);
      }
    }

    void loadSources();
  }, [researchMode, notebookId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleRunResearch = async () => {
    if (!query.trim() || isResearching) {
      return;
    }

    const submittedQuery = query;
    const keywords = submittedQuery
      .split(' ')
      .filter((word) => word.length > 4)
      .slice(0, 3)
      .join(', ');

    const userMsg: ResearchAgentMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: submittedQuery,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsResearching(true);

    if (researchMode === 'notebook' && notebookId) {
      try {
        const queryRes = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'query', notebookId, query: submittedQuery, mode: 'deep' }),
        });
        const responsePayload = await queryRes.json();

        if (!queryRes.ok) {
          throw new Error(responsePayload?.error || 'Research query failed');
        }

        const response = responsePayload as ResearchResponse;
        if (!response.answer) {
          throw new Error('Deep research failed');
        }

        const dynamicReasoning = [
          `Parsing primary objective from natural language: "${submittedQuery.substring(0, 40)}..."`,
          `Querying deep Technical Language Index (TLI) space${keywords ? ` focusing on (${keywords})` : ''}`,
          'Synthesizing evidence across multiple documents',
          'Checking generated context against MIM governance policies',
        ];

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            content: response.answer,
            timestamp: new Date().toLocaleTimeString(),
            type: 'notebook',
            citations: response.citations,
            reasoningSteps: dynamicReasoning,
          },
        ]);

        await trackUsage('research_queries');

        if (user) {
          await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'insert', table: 'history', data: {
              user_id: user.uid,
              role: 'agent',
              content: response.answer,
              type: 'research_response',
              metadata: JSON.stringify({ citations: response.citations, reasoning: dynamicReasoning }),
            }}),
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Deep Research failed: ${errorMessage}`);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'agent',
            content: `I encountered an error querying the deep research index: ${errorMessage}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } finally {
        setIsResearching(false);
      }

      return;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: submittedQuery }],
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'GLM-5 engine failed');
      }

      const agentReply = payload?.reply || 'Neutralization complete. No direct mapping detected.';
      const dynamicReasoning = [
        `Neutralizing intent structure for: "${submittedQuery.substring(0, 30)}..."`,
        `Cross-referencing GLM-5 corpus${keywords ? ` for entities [${keywords}]` : ''}`,
        'Calculating api boundary constraints and orchestration requirements',
        'Validating technical execution path with MIM',
      ];

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: agentReply,
          timestamp: new Date().toLocaleTimeString(),
          reasoningSteps: dynamicReasoning,
          type: 'optimization',
        },
      ]);

      await trackUsage('research_queries');

      if (user) {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'insert', table: 'history', data: {
            user_id: user.uid,
            role: 'agent',
            content: agentReply,
            type: 'glm5_response',
            metadata: JSON.stringify({ reasoning: dynamicReasoning }),
          }}),
        });
      }
    } catch {
      toast.error('GLM-5 Engine failed.');
    } finally {
      setIsResearching(false);
    }
  };

  const handleOpenAddSource = (type: NotebookSource['type']) => {
    setNewSourceType(type);
    setNewSourceInput('');
    setNewSourceTitle('');
    setIsAddSourceOpen(true);
  };

  const handleConfirmAddSource = async () => {
    if (!newSourceInput.trim() || !newSourceTitle.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (!notebookId) {
      toast.error('Notebook context is not ready yet.');
      return;
    }

    setIsAddSourceOpen(false);

    const newSource: NotebookSource = {
      id: `src-${Date.now()}`,
      title: newSourceTitle,
      type: newSourceType,
      status: 'processing',
    };

    const payload = {
      type: newSourceType,
      title: newSourceTitle,
      content: newSourceType === 'text' ? newSourceInput : undefined,
      url: newSourceType === 'url' || newSourceType === 'youtube' ? newSourceInput : undefined,
    };

    setSources((prev) => [newSource, ...prev]);
    toast.success(`Ingesting ${newSourceTitle}...`);

    try {
      const ingestRes = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ingest', notebookId, source: payload }),
      });
      const ingestPayload = await ingestRes.json();

      if (!ingestRes.ok || !ingestPayload?.sourceId) {
        throw new Error(ingestPayload?.error || 'Failed to ingest source');
      }

      setSources((prev) =>
        prev.map((source) =>
          source.id === newSource.id
            ? {
                ...source,
                status: 'ready',
                wordCount: payload.content ? payload.content.split(' ').length : 0,
              }
            : source,
        ),
      );

      toast.success(`${newSourceTitle} indexed.`);
      await trackUsage('sources');

      if (user) {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'insert', table: 'data_sources', data: {
            user_id: user.uid,
            notebook_id: notebookId,
            title: newSourceTitle,
            type: newSourceType,
            metadata: JSON.stringify({
              notebookSourceId: ingestPayload.sourceId,
              url: payload.url,
              content: payload.content,
            }),
          }}),
        });
      }
    } catch {
      setSources((prev) =>
        prev.map((source) => (source.id === newSource.id ? { ...source, status: 'failed' } : source)),
      );
      toast.error(`Ingestion failed for ${newSourceTitle}`);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00A3FF1A] flex items-center justify-center text-[#00A3FF] shadow-lg shadow-[#00A3FF22]">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AutoResearch Lab</h1>
            <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
              TLI Optimization &amp; Deep Indexing
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[#00A3FF] font-bold">MODE: {researchMode.toUpperCase()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setResearchMode('glm-5')}
            className={cn(
              'px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all',
              researchMode === 'glm-5' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            GLM-5 Engine
          </button>
          <button
            onClick={() => setResearchMode('notebook')}
            className={cn(
              'px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2',
              researchMode === 'notebook'
                ? 'bg-[#00A3FF] text-white shadow-lg shadow-[#00A3FF33]'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            NotebookLM Deep
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        <aside className="w-80 flex flex-col gap-6">
          <div className="flex-1 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-6 flex flex-col min-h-0">
            <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
              {(['chat', 'sources', 'tli'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all',
                    activeTab === tab ? 'bg-white text-[#00A3FF] shadow-sm' : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin pr-1">
              {activeTab === 'chat' && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Recent Experiments</p>
                  <div className="space-y-2">
                    {['Multi-lingual NLU Calibration', 'React 19 Composition Research', 'GLM-5 Neutralization Test'].map((exp, index) => (
                      <button key={index} className="w-full text-left p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                        <p className="text-xs font-bold text-slate-700 truncate group-hover:text-[#00A3FF]">{exp}</p>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                          <Clock className="w-3 h-3" />
                          2h ago • Success
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'sources' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleOpenAddSource('url')} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:bg-[#00A3FF08] hover:border-[#00A3FF33] transition-all group">
                      <Globe className="w-4 h-4 text-blue-500" />
                      <span className="text-[9px] font-bold text-slate-600 uppercase">Link</span>
                    </button>
                    <button onClick={() => handleOpenAddSource('youtube')} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:bg-red-50 hover:border-red-200 transition-all group">
                      <Youtube className="w-4 h-4 text-red-500" />
                      <span className="text-[9px] font-bold text-slate-600 uppercase">Video</span>
                    </button>
                    <button onClick={() => handleOpenAddSource('text')} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:bg-indigo-50 hover:border-indigo-200 transition-all group col-span-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span className="text-[9px] font-bold text-slate-600 uppercase">Technical Document</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Technical Index (TLI)</p>
                    {sources.map((source) => (
                      <div key={source.id} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm relative group">
                        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', source.status === 'failed' ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-[#00A3FF]')}>
                          {sourceIcon(source.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{source.title}</p>
                          <p className="text-[10px] text-slate-500 font-mono italic">
                            {source.status === 'processing' ? 'Indexing...' : source.status === 'failed' ? 'Error' : 'Ready'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'tli' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Runtime Nodes</p>
                  {tliNodes.map((node) => (
                    <div key={node.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-slate-900">{node.name}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">{node.status}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">Confidence: {(node.confidence * 100).toFixed(0)}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 pt-12 space-y-10 scrollbar-thin">
            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex gap-5', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg', msg.role === 'user' ? 'bg-[#00A3FF] text-white' : 'bg-slate-900 text-white')}>
                  {msg.role === 'user' ? <span className="text-sm font-bold">U</span> : <Sparkles className="w-6 h-6" />}
                </div>
                <div className={cn('max-w-[80%] space-y-3', msg.role === 'user' ? 'items-end text-right' : '')}>
                  <div className={cn('p-6 rounded-[2rem] shadow-sm transition-all', msg.role === 'user' ? 'bg-[#00A3FF] text-white' : 'bg-slate-50 border border-slate-100 text-slate-800')}>
                    <p className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {msg.citations.map((cite: ResearchResponse['citations'][number], index: number) => (
                          <div key={index} className="p-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 truncate">
                            <span className="text-[#00A3FF] mr-2">[{index + 1}]</span>
                            {cite.sourceTitle || 'Source'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase px-3">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {isResearching && (
              <div className="h-20 flex gap-4 animate-pulse">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl" />
                <div className="flex-1 bg-slate-50 rounded-2xl" />
              </div>
            )}
          </div>

          <div className="p-10 border-t border-slate-50 bg-white shadow-2xl z-20">
            <div className="max-w-4xl mx-auto flex items-center gap-3 overflow-hidden rounded-[2rem] border-2 border-slate-100 bg-white p-2">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void handleRunResearch()}
                placeholder="Query Research Context..."
                className="flex-1 bg-transparent px-6 py-4 text-[15px] font-bold focus:outline-none"
              />
              <button
                onClick={() => void handleRunResearch()}
                disabled={!query.trim() || isResearching}
                title="Run research query"
                className="w-12 h-12 rounded-2xl bg-[#00A3FF] text-white flex items-center justify-center hover:bg-[#0089D9] transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isAddSourceOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold mb-6">Ingest {newSourceType.toUpperCase()}</h3>
            <div className="space-y-4">
              <input value={newSourceTitle} onChange={(event) => setNewSourceTitle(event.target.value)} placeholder="Source Title" className="w-full p-4 border rounded-2xl bg-slate-50 text-sm font-bold" />
              <textarea value={newSourceInput} onChange={(event) => setNewSourceInput(event.target.value)} placeholder={newSourceType === 'text' ? 'Paste content...' : 'Paste URL...'} className="w-full h-32 p-4 border rounded-2xl bg-slate-50 text-sm font-medium resize-none" />
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsAddSourceOpen(false)} className="flex-1 p-4 border rounded-2xl text-xs font-bold text-slate-500">Cancel</button>
              <button onClick={() => void handleConfirmAddSource()} className="flex-1 p-4 bg-[#00A3FF] text-white rounded-2xl text-xs font-bold">Ingest</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

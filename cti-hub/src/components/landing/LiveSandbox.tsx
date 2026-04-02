'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, TrendingUp, FileText, Activity, Crown,
  MessageSquare, CheckCircle, Loader2, ChevronRight,
  Zap, X,
} from 'lucide-react';

// ─── Agent definitions ───────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  color: string;
  department: string;
  status: 'working' | 'idle' | 'reporting';
}

const AGENTS: Agent[] = [
  { id: 'acheevy', name: 'ACHEEVY', role: 'Digital CEO', icon: <Crown className="w-4 h-4" />, color: '#E8A020', department: 'Executive', status: 'working' },
  { id: 'scout', name: 'Scout_Ang', role: 'Market Research', icon: <Search className="w-4 h-4" />, color: '#3B82F6', department: 'Research', status: 'working' },
  { id: 'biz', name: 'Biz_Ang', role: 'Lead Pipeline', icon: <TrendingUp className="w-4 h-4" />, color: '#10B981', department: 'Growth', status: 'working' },
  { id: 'content', name: 'Content_Ang', role: 'Content Ops', icon: <FileText className="w-4 h-4" />, color: '#8B5CF6', department: 'Content', status: 'working' },
  { id: 'ops', name: 'Ops_Ang', role: 'Health Monitor', icon: <Activity className="w-4 h-4" />, color: '#F43F5E', department: 'Operations', status: 'working' },
];

// ─── Task + message data ─────────────────────────────────────────────────────

interface TaskItem {
  id: string;
  agent: string;
  text: string;
  progress: number;
  status: 'active' | 'done';
}

interface ChatMsg {
  from: string;
  to: string;
  text: string;
  ts: number;
}

const TASK_POOL: Omit<TaskItem, 'id' | 'progress' | 'status'>[] = [
  { agent: 'scout', text: 'Scanning "autonomous AI workforce" market landscape' },
  { agent: 'scout', text: 'Extracting company profiles from Crunchbase data' },
  { agent: 'scout', text: 'Identifying Series A startups in AI operations' },
  { agent: 'scout', text: 'Mapping competitor pricing for autonomous agents' },
  { agent: 'biz', text: 'Scoring 12 new leads from Scout_Ang research' },
  { agent: 'biz', text: 'Updating AOS-10 prospect pipeline — 3 moved to warm' },
  { agent: 'biz', text: 'Drafting outreach sequences for enterprise segment' },
  { agent: 'biz', text: 'Calculating conversion rates for Q2 targets' },
  { agent: 'content', text: 'Writing blog: "Why Your AI Workforce Needs a CEO"' },
  { agent: 'content', text: 'Generating SEO brief for "autonomous company" keyword' },
  { agent: 'content', text: 'Creating LinkedIn post on agent accountability metrics' },
  { agent: 'content', text: 'Drafting case study: zero-employee revenue generation' },
  { agent: 'ops', text: 'Health check: all 5 agents responsive, latency < 200ms' },
  { agent: 'ops', text: 'Memory utilization: 47% — scaling not required' },
  { agent: 'ops', text: 'Token budget: 62% remaining for this cycle' },
  { agent: 'ops', text: 'Audit: 0 errors in last 24 hours' },
  { agent: 'acheevy', text: 'Reviewing Scout_Ang market findings for strategic fit' },
  { agent: 'acheevy', text: 'Directing Content_Ang to prioritize conversion content' },
  { agent: 'acheevy', text: 'Approving Biz_Ang outreach sequences' },
  { agent: 'acheevy', text: 'KPI review: pipeline value up 18% week-over-week' },
];

const MESSAGE_POOL: Omit<ChatMsg, 'ts'>[] = [
  { from: 'scout', to: 'biz', text: 'Found 8 companies running headless ops with >$1M ARR. Sending profiles.' },
  { from: 'biz', to: 'acheevy', text: '3 leads moved from cold → warm. Two requested demos this week.' },
  { from: 'acheevy', to: 'content', text: 'Prioritize the "autonomous company" blog post — aligns with Scout findings.' },
  { from: 'content', to: 'acheevy', text: 'Blog draft ready. 1,200 words. SEO score 92. Awaiting approval.' },
  { from: 'ops', to: 'acheevy', text: 'All systems green. Token spend at 38% of daily budget.' },
  { from: 'acheevy', to: 'scout', text: 'Expand research to European market. Focus on UK and Germany.' },
  { from: 'scout', to: 'content', text: 'Key stat: 73% of AI-first companies cite "agent governance" as top need.' },
  { from: 'biz', to: 'content', text: 'Need a one-pager for the enterprise segment. Pain point: compliance.' },
  { from: 'acheevy', to: 'ops', text: 'Run a full system audit before end of cycle. Priority: memory health.' },
  { from: 'ops', to: 'biz', text: 'CRM sync complete. 47 contacts enriched with new firmographic data.' },
  { from: 'content', to: 'scout', text: 'What are the top 3 objections prospects raise about autonomous agents?' },
  { from: 'scout', to: 'acheevy', text: 'Market size estimate for AOS: $4.2B by 2027. Growing 34% YoY.' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function LiveSandbox() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const taskCounter = useRef(0);
  const msgIndex = useRef(0);

  // Spawn a new task
  const spawnTask = useCallback(() => {
    const pool = TASK_POOL.filter(t =>
      !tasks.some(existing => existing.text === t.text && existing.status === 'active')
    );
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const newTask: TaskItem = {
      id: `t-${taskCounter.current++}`,
      agent: pick.agent,
      text: pick.text,
      progress: 0,
      status: 'active',
    };
    setTasks(prev => {
      const active = prev.filter(t => t.status === 'active');
      const done = prev.filter(t => t.status === 'done').slice(-6);
      return [...done, ...active, newTask];
    });
  }, [tasks]);

  // Post a new inter-agent message
  const postMessage = useCallback(() => {
    const msg = MESSAGE_POOL[msgIndex.current % MESSAGE_POOL.length];
    msgIndex.current++;
    setMessages(prev => [...prev.slice(-8), { ...msg, ts: Date.now() }]);
  }, []);

  // Progress tasks + complete them
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prev => prev.map(t => {
        if (t.status !== 'active') return t;
        const newProgress = Math.min(100, t.progress + Math.random() * 15 + 5);
        if (newProgress >= 100) {
          setTasksCompleted(c => c + 1);
          return { ...t, progress: 100, status: 'done' as const };
        }
        return { ...t, progress: newProgress };
      }));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Spawn tasks periodically
  useEffect(() => {
    spawnTask();
    spawnTask();
    spawnTask();
    const interval = setInterval(spawnTask, 3500);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Post messages periodically
  useEffect(() => {
    postMessage();
    const interval = setInterval(postMessage, 5000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const agentName = (id: string) => AGENTS.find(a => a.id === id)?.name || id;
  const agentColor = (id: string) => AGENTS.find(a => a.id === id)?.color || '#888';

  const filteredTasks = selectedAgent
    ? tasks.filter(t => t.agent === selectedAgent)
    : tasks;

  const filteredMessages = selectedAgent
    ? messages.filter(m => m.from === selectedAgent || m.to === selectedAgent)
    : messages;

  return (
    <div className="border border-white/10 bg-[#0D0D12] overflow-hidden">
      {/* Sandbox Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="font-mono text-[10px] text-white/60 tracking-wider uppercase">Live Sandbox — Autonomous Company</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-white/30">
          <span>{tasksCompleted} tasks completed</span>
          <span>{messages.length} messages</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] min-h-[420px]">
        {/* Left: Agent Cards */}
        <div className="border-b lg:border-b-0 lg:border-r border-white/10 p-3 space-y-2">
          <p className="font-mono text-[9px] text-white/30 uppercase tracking-wider mb-2 px-1">Agents</p>
          {AGENTS.map(agent => {
            const activeTasks = tasks.filter(t => t.agent === agent.id && t.status === 'active').length;
            const isSelected = selectedAgent === agent.id;

            return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
                className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'bg-white/10 border border-white/20'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="mt-0.5 shrink-0" style={{ color: agent.color }}>
                  {agent.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-white truncate">{agent.name}</span>
                    {activeTasks > 0 && (
                      <Loader2 className="w-3 h-3 animate-spin shrink-0" style={{ color: agent.color }} />
                    )}
                  </div>
                  <span className="text-[9px] text-white/30 block">{agent.role} · {agent.department}</span>
                  {activeTasks > 0 && (
                    <span className="text-[9px] mt-0.5 block" style={{ color: agent.color }}>
                      {activeTasks} task{activeTasks > 1 ? 's' : ''} active
                    </span>
                  )}
                </div>
                <ChevronRight className="w-3 h-3 text-white/20 mt-1 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Center: Task Feed */}
        <div className="border-b lg:border-b-0 lg:border-r border-white/10 p-3 overflow-y-auto max-h-[420px]">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="font-mono text-[9px] text-white/30 uppercase tracking-wider">
              {selectedAgent ? `${agentName(selectedAgent)} Tasks` : 'All Tasks'}
            </p>
            {selectedAgent && (
              <button onClick={() => setSelectedAgent(null)} className="text-[9px] text-white/30 hover:text-white flex items-center gap-1">
                <X className="w-3 h-3" /> Clear filter
              </button>
            )}
          </div>
          <div className="space-y-2">
            {filteredTasks.slice(-8).map(task => (
              <div
                key={task.id}
                className={`p-2.5 rounded-lg border transition-all ${
                  task.status === 'done'
                    ? 'border-white/5 bg-white/[0.01] opacity-60'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex items-start gap-2">
                  {task.status === 'done' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mt-0.5 shrink-0" style={{ color: agentColor(task.agent) }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-[9px] font-bold" style={{ color: agentColor(task.agent) }}>
                        {agentName(task.agent)}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed">{task.text}</p>
                    {task.status === 'active' && (
                      <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-linear"
                          style={{
                            width: `${task.progress}%`,
                            backgroundColor: agentColor(task.agent),
                            opacity: 0.6,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredTasks.length === 0 && (
              <p className="text-[10px] text-white/20 text-center py-8 font-mono">No tasks for this agent right now</p>
            )}
          </div>
        </div>

        {/* Right: Inter-Agent Chat */}
        <div className="p-3 overflow-y-auto max-h-[420px]">
          <p className="font-mono text-[9px] text-white/30 uppercase tracking-wider mb-2 px-1">
            <MessageSquare className="w-3 h-3 inline mr-1" />
            {selectedAgent ? `${agentName(selectedAgent)} Messages` : 'Inter-Agent Comms'}
          </p>
          <div className="space-y-2.5">
            {filteredMessages.slice(-8).map((msg, i) => (
              <div key={`${msg.ts}-${i}`} className="p-2.5 bg-white/[0.03] rounded-lg border border-white/5">
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-mono text-[9px] font-bold" style={{ color: agentColor(msg.from) }}>
                    {agentName(msg.from)}
                  </span>
                  <span className="text-[8px] text-white/20">→</span>
                  <span className="font-mono text-[9px]" style={{ color: agentColor(msg.to) }}>
                    {agentName(msg.to)}
                  </span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">{msg.text}</p>
              </div>
            ))}
            {filteredMessages.length === 0 && (
              <p className="text-[10px] text-white/20 text-center py-8 font-mono">No messages yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Sandbox Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-4">
          {AGENTS.map(a => (
            <div key={a.id} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: a.color }} />
              <span className="font-mono text-[8px] text-white/30">{a.name.split('_')[0]}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-[#E8A020]" />
          <span className="font-mono text-[9px] text-white/30">Learn how you can run this practically free.</span>
        </div>
      </div>
    </div>
  );
}

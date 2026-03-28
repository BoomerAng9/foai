"use client";

import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Search, 
  Download, 
  Trash2, 
  Play, 
  Square
} from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState([
    { id: 1, time: '14:52:01.203', level: 'INFO', module: 'NOTEBOOK-LM', message: 'Initialized notebook "GRAMMAR-CORE-KB"...' },
    { id: 2, time: '14:52:02.110', level: 'SUCCESS', module: 'TLI-SRVC', message: 'Successfully indexed "Architecture_v2.pdf" (14,200 tokens)' },
    { id: 3, time: '14:52:45.004', level: 'WARN', module: 'PICKER-ANG', message: 'Slow response from OpenRouter (1,240ms latency detected)' },
    { id: 4, time: '14:53:10.882', level: 'INFO', module: 'MIM-GOV', message: 'Applying Policy "Privacy Shield v4" to context pack "USER_42"' },
    { id: 5, time: '14:54:12.331', level: 'DEBUG', module: 'AUTH', message: 'Session validated for user "Alex Chen" (UID: abc-123)' },
  ]);

  const [isStreaming, setIsStreaming] = useState(true);

  // Mock streaming
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      const newLog = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('en-GB') + '.' + Math.floor(Math.random() * 999),
        level: Math.random() > 0.8 ? 'WARN' : 'INFO',
        module: ['AGENT-BMR', 'TLI-SRVC', 'RUNTIME', 'MIM-GOV'][Math.floor(Math.random() * 4)],
        message: 'System heart-beat check: All modules operational.'
      };
      setLogs(prev => [...prev.slice(-20), newLog]);
    }, 4000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-900">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <Terminal className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">System Logs</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#00A3FF] transition-colors" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00A3FF] transition-all w-64"
            />
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <button 
            onClick={() => setIsStreaming(!isStreaming)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isStreaming ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-600 border border-slate-100'
            }`}
          >
            {isStreaming ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {isStreaming ? 'STOP STREAM' : 'START STREAM'}
          </button>
          <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
            <Download className="w-5 h-5" />
          </button>
          <button className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors" onClick={() => setLogs([])}>
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col font-mono text-[11px]">
        {/* Terminal Header */}
        <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          </div>
          <span className="text-slate-500 tracking-wider font-bold">GRAMMAR-V1-LOGS</span>
          <div className="w-10" />
        </div>

        {/* Console Content */}
        <div className="flex-1 overflow-auto p-6 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-4 group hover:bg-white/5 py-0.5 px-2 rounded -mx-2 transition-colors">
              <span className="text-slate-500 select-none whitespace-nowrap">{log.time}</span>
              <span className={`font-bold whitespace-nowrap w-16 ${
                log.level === 'SUCCESS' ? 'text-green-400' : 
                log.level === 'WARN' ? 'text-amber-400' : 
                log.level === 'ERROR' ? 'text-red-400' : 'text-blue-400'
              }`}>
                [{log.level}]
              </span>
              <span className="text-slate-300 font-bold whitespace-nowrap">[{log.module}]</span>
              <span className="text-slate-400">{log.message}</span>
            </div>
          ))}
          {isStreaming && (
            <div className="flex items-center gap-2 text-slate-600 animate-pulse pt-2">
              <div className="w-1.5 h-3 bg-[#00A3FF]" />
              <span>Waiting for stream events...</span>
            </div>
          )}
        </div>

        {/* Console Input Bar */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/30 flex items-center gap-4">
          <span className="text-green-500 font-black tracking-widest leading-none mt-0.5">{'>'}</span>
          <input 
            type="text" 
            placeholder="Run system command or filter (e.g. /filter module:tli)..." 
            className="flex-1 bg-transparent text-slate-300 outline-none placeholder:text-slate-700" 
          />
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] font-bold">ALT</span>
            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] font-bold">ENTER</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from 'react';
import { 
  Settings, 
  Cpu, 
  Shield, 
  Brain, 
  Terminal, 
  ChevronRight,
  Globe,
  Lock,
  Eye,
  Type,
  Palette,
  Save,
  CheckCircle2,
  DollarSign,
  BarChart3,
  TrendingDown,
  Info,
  Zap,
  FileText
} from 'lucide-react';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { luc, MODELS, TASKS } from '@/lib/luc';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RuntimeNode {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  children?: RuntimeNode[];
  isAdminOnly?: boolean;
}

export default function ManagerPage() {
  const { config, updateConfig } = useWhiteLabel();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tree' | 'whitelabel' | 'luc' | 'ecosystem'>('tree');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [simTokens, setSimTokens] = useState({ input: 1000, output: 500 });

  const handleConfigChange = (key: string, value: string) => {
    updateConfig({ [key]: value });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const runtimeNodes: RuntimeNode[] = [
    {
      id: 'core-runtime',
      name: 'GRAMMAR Core',
      type: 'core',
      status: 'active',
      children: [
        { id: 'ntntn-frame', name: 'NTNTN Intent Frame', type: 'core', status: 'active' },
        { id: 'mim-governor', name: 'MIM Governance', type: 'core', status: 'active' },
        { id: 'acheevy-orch', name: 'ACHEEVY Orchestrator', type: 'core', status: 'active' },
      ]
    },
    {
      id: 'roles',
      name: 'Runtime Roles',
      type: 'role',
      status: 'idle',
      children: [
        { id: 'boomer-ang-1', name: 'Boomer_Ang [Research]', type: 'role', status: 'idle' },
        { id: 'picker-ang', name: 'Picker_Ang', type: 'role', status: 'active' },
      ]
    },
    {
      id: 'internal-authority',
      name: 'Internal Function Tree [Admin-Only]',
      type: 'core',
      status: 'active',
      isAdminOnly: true,
      description: 'Internal operational mapping for the Backend Ecosystem. Restricted to Authority roles.',
      children: [
        { 
          id: 'gemini-emb-2', 
          name: 'Vector Engine (Embeddings 2)', 
          type: 'asset', 
          status: 'active',
          isAdminOnly: true,
          description: 'Multimodal vectorization for the Technical Language Index. Converts documents, code, and media into high-dimensional semantic space for retrieval.'
        },
        { 
          id: 'gemini-3-flash', 
          name: 'Function Gmma T3 (Flash)', 
          type: 'asset', 
          status: 'active',
          isAdminOnly: true,
          description: 'High-speed reasoning model specialized in function calling and tool orchestration. Drives parallel agent execution and rapid intent parsing.'
        },
        { 
          id: 'interactions-api', 
          name: 'Interaction Trace Layer', 
          type: 'asset', 
          status: 'active',
          isAdminOnly: true,
          description: 'Governs the conversational trace and evidence-backed response generation. Connects human intent to recorded ecosystem actions.'
        },
      ]
    }
  ];

  const findNode = (nodes: RuntimeNode[], id: string): RuntimeNode | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const selectedNode = selectedNodeId ? findNode(runtimeNodes, selectedNodeId) : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{config.systemName} Manager</h1>
          <p className="text-slate-500 mt-1 font-medium">Control the runtime & platform identity</p>
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl shadow-inner">
            <button
              onClick={() => setActiveTab('tree')}
              className={clsx(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'tree' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              Settings [Circuit Box]
            </button>
            <button
              onClick={() => setActiveTab('whitelabel')}
              className={clsx(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'whitelabel' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              White Labeling
            </button>
            <button
              onClick={() => setActiveTab('luc')}
              className={clsx(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'luc' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              LUC (Costs)
            </button>
            <button
              onClick={() => setActiveTab('ecosystem')}
              className={clsx(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'ecosystem' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              Ecosystem
            </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 h-[calc(100vh-280px)]">
        {/* Navigation / Tree */}
        <div className="col-span-4 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-sm">
          {activeTab === 'tree' ? (
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Circuit Box [Command Center]</h3>
              <div className="space-y-2">
                {runtimeNodes.map((node) => (
                   <div key={node.id} className="space-y-1">
                     <button 
                        onClick={() => setSelectedNodeId(node.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-2xl transition-all",
                          selectedNodeId === node.id ? "bg-slate-50 border border-slate-100 ring-1 ring-slate-200/50" : "hover:bg-slate-50/50 border border-transparent"
                        )}
                     >
                       <div className="flex items-center gap-3">
                         <div className={cn(
                            "w-2 h-2 rounded-full",
                            node.status === 'active' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                         )} />
                         <span className="text-xs font-bold text-slate-700">{node.name}</span>
                       </div>
                       <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                     </button>
                     {node.children && (
                       <div className="ml-5 border-l border-slate-100 pl-4 space-y-1 py-1">
                         {node.children.map(child => (
                           <button 
                            key={child.id}
                            onClick={() => setSelectedNodeId(child.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all",
                              selectedNodeId === child.id ? "bg-slate-50 text-slate-900" : "text-slate-500 hover:text-slate-700"
                            )}
                           >
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                             <span className="text-[11px] font-semibold">{child.name}</span>
                           </button>
                         ))}
                       </div>
                     )}
                   </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-8">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Branding Explorer</h3>
              <div className="space-y-6">
                <button className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-[#0089D933] hover:bg-[#00A3FF05] transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-[#00A3FF] transition-all">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">Theme Engine</p>
                    <p className="text-[10px] text-slate-500">Global tokens & colors</p>
                  </div>
                </button>
                <button className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-[#0089D933] hover:bg-[#00A3FF05] transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-[#00A3FF] transition-all">
                    <Type className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">Typography</p>
                    <p className="text-[10px] text-slate-500">Custom font sets</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Inspector Panel */}
        <div className="col-span-8 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
          {activeTab === 'tree' ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900">Node Inspector</h3>
                </div>
                {selectedNodeId && (
                   <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-wider">
                     Connected
                   </span>
                )}
              </div>
              <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                 {!selectedNodeId ? (
                   <div className="max-w-xs space-y-4">
                     <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                       <Eye className="w-8 h-8" />
                     </div>
                     <p className="text-sm text-slate-500 font-medium">Select a node from the tree to inspect its governed state and configuration.</p>
                   </div>
                 ) : (
                   <div className="w-full text-left space-y-8 animate-in fade-in duration-300">
                      <div className="grid grid-cols-2 gap-8">
                         <div className="space-y-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">General Settings</label>
                            <div className="space-y-3">
                               <div className="space-y-1.5">
                                 <div className="flex items-center justify-between">
                                   <p className="text-[11px] font-bold text-slate-700">Display Name</p>
                                   {selectedNode?.isAdminOnly && <Lock className="w-3 h-3 text-slate-400" />}
                                 </div>
                                 <input 
                                    className={cn(
                                      "w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00A3FF33] transition-all",
                                      selectedNode?.isAdminOnly && "opacity-60 cursor-not-allowed bg-slate-100"
                                    )}
                                    defaultValue={selectedNode?.name}
                                    disabled={selectedNode?.isAdminOnly}
                                 />
                               </div>
                               <div className="space-y-1.5">
                                 <div className="flex items-center justify-between">
                                   <p className="text-[11px] font-bold text-slate-700">Governance Level</p>
                                   {selectedNode?.isAdminOnly && <Lock className="w-3 h-3 text-slate-400" />}
                                 </div>
                                 <select 
                                    className={cn(
                                      "w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none transition-all",
                                      selectedNode?.isAdminOnly && "opacity-60 cursor-not-allowed bg-slate-100"
                                    )}
                                    defaultValue="Strict (Locked)"
                                    disabled={selectedNode?.isAdminOnly}
                                 >
                                    <option>Strict (Locked)</option>
                                    <option>Standard</option>
                                    <option>Advisory</option>
                                 </select>
                               </div>
                               {selectedNode?.description && (
                                 <div className="space-y-1.5 mt-4">
                                   <div className="flex items-center justify-between">
                                     <p className="text-[11px] font-bold text-slate-700">Function Description</p>
                                     <Shield className="w-3 h-3 text-blue-400" />
                                   </div>
                                   <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                      <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
                                        {selectedNode.description}
                                      </p>
                                      {selectedNode?.isAdminOnly && (
                                        <div className="mt-2 flex items-center gap-1.5 text-[9px] text-blue-600 font-bold uppercase tracking-wider">
                                          <Zap className="w-3 h-3" />
                                          System-Critical Resource
                                        </div>
                                      )}
                                   </div>
                                 </div>
                               )}
                            </div>
                         </div>
                         <div className="space-y-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metrics & Health</label>
                            <div className="space-y-2">
                               <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-500">Uptime</span>
                                  <span className="text-xs font-mono font-bold text-slate-900">99.99%</span>
                               </div>
                               <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-500">Total Credits</span>
                                  <span className="text-xs font-mono font-bold text-slate-900">1,240</span>
                               </div>
                            </div>
                         </div>
                      </div>
                      
                      <div className="space-y-4">
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Policy Constraints</label>
                         <div className="p-6 bg-slate-900 rounded-2xl overflow-hidden relative group">
                            <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <pre className="text-[10px] text-blue-400 font-mono">
{`{
  "governance": "${config.systemName}-v1",
  "isolation": "high",
  "allowed_roles": ["admin", "picker"],
  "max_memory": "4GB"
}`}
                            </pre>
                         </div>
                      </div>
                   </div>
                 )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#00A3FF] flex items-center justify-center text-white shadow-lg shadow-[#00A3FF33]">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">White Label Engine</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Customize the platform identity</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {saveStatus === 'saved' && (
                    <div className="flex items-center gap-1.5 text-emerald-600 animate-in fade-in slide-in-from-right-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">SAVED</span>
                    </div>
                  )}
                  <button className="flex items-center gap-2 bg-[#00A3FF] hover:bg-[#0089D9] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#00A3FF33]">
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10">
                <div className="max-w-2xl mx-auto space-y-12">
                   <div className="grid grid-cols-2 gap-12">
                     <div className="space-y-6">
                        <section className="space-y-4">
                           <div className="flex items-center gap-2 mb-2">
                             <Globe className="w-4 h-4 text-slate-400" />
                             <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">System Identity</h4>
                           </div>
                           <div className="space-y-4">
                             <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700">Project Name</label>
                                <input 
                                  value={config.systemName}
                                  onChange={(e) => handleConfigChange('systemName', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00A3FF33] transition-all"
                                  placeholder="e.g. GRAMMAR"
                                />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700">Tagline</label>
                                <input 
                                  value={config.tagline}
                                  onChange={(e) => handleConfigChange('tagline', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00A3FF33] transition-all"
                                  placeholder="e.g. Action Runtime"
                                />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700">Logo URL</label>
                                <input 
                                  value={config.logoUrl}
                                  onChange={(e) => handleConfigChange('logoUrl', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00A3FF33] transition-all"
                                  placeholder="https://..."
                                />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700">Favicon URL</label>
                                <input 
                                  value={config.faviconUrl}
                                  onChange={(e) => handleConfigChange('faviconUrl', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00A3FF33] transition-all"
                                  placeholder="https://..."
                                />
                             </div>
                           </div>
                        </section>

                        <section className="space-y-4">
                           <div className="flex items-center gap-2 mb-2">
                             <Palette className="w-4 h-4 text-slate-400" />
                             <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Color System</h4>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700">Primary</label>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="color"
                                    value={config.primaryColor}
                                    onChange={(e) => handleConfigChange('primaryColor', e.target.value)}
                                    className="w-10 h-10 rounded-lg overflow-hidden border-0 cursor-pointer"
                                  />
                                  <input 
                                    value={config.primaryColor}
                                    onChange={(e) => handleConfigChange('primaryColor', e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-mono font-bold"
                                  />
                                </div>
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700">Accent</label>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="color"
                                    value={config.accentColor}
                                    onChange={(e) => handleConfigChange('accentColor', e.target.value)}
                                    className="w-10 h-10 rounded-lg overflow-hidden border-0 cursor-pointer"
                                  />
                                  <input 
                                    value={config.accentColor}
                                    onChange={(e) => handleConfigChange('accentColor', e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-mono font-bold"
                                  />
                                </div>
                             </div>
                           </div>
                        </section>
                     </div>

                     <div className="space-y-6">
                        <section className="space-y-4">
                           <div className="flex items-center gap-2 mb-2">
                             <Eye className="w-4 h-4 text-slate-400" />
                             <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Live Preview</h4>
                           </div>
                           <div className="aspect-video bg-[#F8FAFC] rounded-[2rem] border border-slate-100 shadow-inner flex flex-col p-4">
                              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                                 <div 
                                    className="w-4 h-4 rounded shadow-sm"
                                    style={{ backgroundColor: config.primaryColor }}
                                 />
                                 <span className="text-[10px] font-bold text-slate-900">{config.systemName} preview</span>
                              </div>
                              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                                 <h5 className="text-sm font-black tracking-tight" style={{ color: config.primaryColor }}>{config.systemName}</h5>
                                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{config.tagline}</p>
                                 <button 
                                    className="mt-2 px-6 py-2 rounded-full text-[9px] font-bold text-white shadow-lg transition-transform active:scale-95"
                                    style={{ 
                                      backgroundColor: config.primaryColor,
                                      boxShadow: `0 8px 24px -6px ${config.primaryColor}88`
                                    }}
                                 >
                                    EXECUTE
                                 </button>
                              </div>
                           </div>
                        </section>

                        <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex gap-4">
                           <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                              <Lock className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="text-[11px] font-bold text-blue-900">Governance Lock</p>
                              <p className="text-[10px] text-blue-700/70 font-medium leading-relaxed mt-1">
                                White-label changes require **Acheevy Core** approval before being pushed to downstream roles.
                              </p>
                           </div>
                        </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* LUC Tab */}
          {activeTab === 'luc' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cost Simulation */}
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-gray-900 font-semibold">
                      <DollarSign className="w-5 h-5 text-primary" />
                      Cost Selection & Simulation
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Input Tokens</label>
                        <input 
                          type="number" 
                          value={simTokens.input} 
                          onChange={(e) => setSimTokens(prev => ({ ...prev, input: parseInt(e.target.value) || 0 }))}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Output Tokens</label>
                        <input 
                          type="number" 
                          value={simTokens.output}
                          onChange={(e) => setSimTokens(prev => ({ ...prev, output: parseInt(e.target.value) || 0 }))}
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Model Comparison</label>
                      <div className="space-y-2">
                        {luc.compareModels(simTokens.input, simTokens.output).map((m) => (
                          <div key={m.modelId} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">{m.name}</span>
                              <span className="text-xs text-gray-500">{m.provider}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-mono font-bold text-primary">${m.cost.toFixed(6)}</div>
                              <div className="text-[10px] text-gray-400">Total Est.</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Task Optimization Advice */}
                  <div className="bg-primary/5 rounded-xl border border-primary/10 p-6">
                    <div className="flex items-center gap-2 mb-4 text-primary font-semibold">
                      <TrendingDown className="w-5 h-5" />
                      Task Optimization (ACHEEVY Recommendation)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(TASKS).map(([key, task]) => {
                        const opt = luc.optimizeForTask(key);
                        const model = MODELS.find(m => m.id === opt.modelId);
                        return (
                          <div key={key} className="bg-white p-4 rounded-lg border border-primary/5 shadow-sm space-y-2">
                            <div className="text-xs font-bold text-gray-400 uppercase">{task.name}</div>
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-gray-900">{model?.name}</div>
                              <div className="text-xs font-bold text-green-600">-${((1 - opt.estimatedCost / (luc.calculateCost('gpt-4o', task.avgInputTokens, task.avgOutputTokens))) * 100).toFixed(0)}%</div>
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Estimated efficiency gain vs GPT-4o
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* LUC Info & Marketplace */}
                <div className="space-y-6">
                  <div className="bg-gray-900 rounded-xl p-6 text-white shadow-xl overflow-hidden relative">
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-4 text-primary">
                        <BarChart3 className="w-5 h-5" />
                        <span className="font-bold tracking-tight">LUC RUNTIME</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2">Cost Governance</h3>
                      <p className="text-sm text-gray-400 mb-6">
                        LUC automatically routes tasks to the most cost-effective provider based on real-time pricing and governance budget.
                      </p>
                      
                      <div className="space-y-4 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-end">
                          <span className="text-xs text-gray-500">Global Budget Utilization</span>
                          <span className="text-xs font-mono">12.4%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-[12.4%]"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Decorative element */}
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary/20 blur-3xl rounded-full"></div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold">
                      <Info className="w-5 h-5 text-gray-400" />
                      Runtime Stats
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Active Task Routers</span>
                        <span className="text-sm font-medium">14</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Latency Overhead</span>
                        <span className="text-sm font-medium text-green-600">&lt;2ms</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-500">Last Refresh</span>
                        <span className="text-sm font-medium">2m ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Ecosystem Tab */}
          {activeTab === 'ecosystem' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8">
                       <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                         <Globe className="w-6 h-6" />
                       </div>
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-xl font-black text-slate-900 mb-2">Google Cloud Platform</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Ecosystem Authority Layer</p>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Project ID</p>
                          <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3 text-emerald-500" />
                            <p className="text-sm font-mono font-bold text-slate-700">AUTHORIZED</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Project Number</p>
                          <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3 text-emerald-500" />
                            <p className="text-sm font-mono font-bold text-slate-700">PROVISIONED</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0F172A] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                       <Zap className="w-12 h-12 text-[#00A3FF]" />
                    </div>
                    <h3 className="text-xl font-black mb-2">Gemini AI Runtime</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">Intelligence Orchestration</p>
                    
                    <div className="space-y-4">
                       <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                          <span className="text-xs font-bold text-slate-400">API Status</span>
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-xs font-bold text-emerald-500">CONNECTED</span>
                          </div>
                       </div>
                       <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                          <span className="text-xs font-bold text-slate-400">Provider</span>
                          <span className="text-xs font-bold">Google DeepMind</span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 rounded-2xl bg-[#00A3FF1A] flex items-center justify-center text-[#00A3FF]">
                        <Brain className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900">AIMS Ecosystem Integration</h3>
                   </div>
                   
                   <div className="prose prose-slate prose-sm max-w-none">
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        GRAMMAR is currently bridged to the **Cloud Managed Infrastructure**. This connection provides:
                      </p>
                      <ul className="mt-4 space-y-4 list-none p-0">
                         {[
                           { title: 'Technical Language Index', desc: 'NotebookLM-powered vector indexing for deep research.', icon: FileText },
                           { title: 'Governance Guardrails', desc: 'Secure intent normalization through MIM protocols.', icon: Shield },
                           { title: 'Parallel Execution', desc: 'Scalable Boomer_Ang clusters within GCP compute.', icon: Cpu },
                         ].map((item, i) => (
                           <li key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                              <div className="shrink-0 w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-[#00A3FF]">
                                 <item.icon className="w-4 h-4" />
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-slate-900">{item.title}</p>
                                 <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                              </div>
                           </li>
                         ))}
                      </ul>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

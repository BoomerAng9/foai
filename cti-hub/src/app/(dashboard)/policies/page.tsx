'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { paywallService, MIMPolicy } from '@/lib/auth-paywall';
import { 
  Shield, 
  Settings, 
  Activity, 
  Plus, 
  AlertCircle, 
  Power,
  Gavel
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const POLICY_TYPES = [
  { id: 'technical', label: 'Technical', icon: Settings, color: 'blue' },
  { id: 'operational', label: 'Operational', icon: Activity, color: 'emerald' },
  { id: 'security', label: 'Security', icon: Shield, color: 'purple' },
 ] as const;

type PolicyType = (typeof POLICY_TYPES)[number]['id'];

interface NewPolicyState {
  name: string;
  description: string;
  type: PolicyType;
}

export default function PoliciesPage() {
  const { organization } = useAuth();
  const [policies, setPolicies] = useState<MIMPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newPolicy, setNewPolicy] = useState<NewPolicyState>({
    name: '',
    description: '',
    type: 'technical',
  });

  const loadPolicies = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const { data } = await paywallService.getPolicies(organization.id);
    if (data) setPolicies(data);
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    if (organization?.id) {
      void loadPolicies();
    }
  }, [organization?.id, loadPolicies]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;

    const { data } = await paywallService.createPolicy({
      organization_id: organization.id,
      name: newPolicy.name,
      description: newPolicy.description,
      type: newPolicy.type,
      rules: [],
      is_active: true,
    });

    if (data) {
      setPolicies([data, ...policies]);
      setIsCreating(false);
      setNewPolicy({ name: '', description: '', type: 'technical' });
    }
  };

  const togglePolicy = async (policy: MIMPolicy) => {
    const { data } = await paywallService.updatePolicy(policy.id, {
      is_active: !policy.is_active,
    });

    if (data) {
      setPolicies(policies.map(p => p.id === policy.id ? { ...p, is_active: !p.is_active } : p));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Gavel className="w-8 h-8 text-primary" />
            MIM Policy Manager
          </h1>
          <p className="text-muted-foreground mt-2">
            Govern agency execution within <strong>{organization?.name}</strong>. Establish laws for interpretative and operational roles.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-medium"
        >
          <Plus className="w-4 h-4" />
          New Policy
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {POLICY_TYPES.map((type) => {
          const count = policies.filter(p => p.type === type.id).length;
          const activeCount = policies.filter(p => p.type === type.id && p.is_active).length;
          
          return (
            <div key={type.id} className="relative group overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-6 transition-all hover:bg-white/[0.07]">
              <div className={cn(
                "absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full blur-3xl opacity-10",
                type.id === 'technical' && "bg-blue-500",
                type.id === 'operational' && "bg-emerald-500",
                type.id === 'security' && "bg-purple-500"
              )} />
              
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  type.id === 'technical' && "bg-blue-500/10 text-blue-400",
                  type.id === 'operational' && "bg-emerald-500/10 text-emerald-400",
                  type.id === 'security' && "bg-purple-500/10 text-purple-400"
                )}>
                  <type.icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{count}</div>
                  <div className="text-xs text-muted-foreground">{activeCount} Active</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white">{type.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {type.id === 'technical' && "Hardware, runtime, and provider constraints."}
                {type.id === 'operational' && "Agency workflows, approval gates, and sequencing."}
                {type.id === 'security' && "Governance, compliance, and risk thresholds."}
              </p>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white px-1">Active Governance</h2>
        
        {policies.length === 0 && !isCreating ? (
          <div className="p-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-white">No policies defined</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              Start by establishing your first policy. Policies are the &quot;goverance laws&quot; that Boomer_Angs must follow.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-6 text-primary hover:underline font-medium"
            >
              Define your first law
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {isCreating && (
              <form onSubmit={handleCreate} className="p-6 bg-white/5 border border-primary/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground ml-1">Policy Name</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. SOC-2 Agency Compliance"
                        className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-primary/50 text-white outline-none"
                        value={newPolicy.name}
                        onChange={e => setNewPolicy({...newPolicy, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground ml-1">Domain</label>
                      <select
                        title="Policy domain"
                        className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-primary/50 text-white outline-none"
                        value={newPolicy.type}
                        onChange={e => setNewPolicy({...newPolicy, type: e.target.value as PolicyType})}
                      >
                        {POLICY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">Manifest / Description</label>
                    <textarea
                      required
                      placeholder="Define what this policy enforces..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-primary/50 text-white outline-none resize-none"
                      value={newPolicy.description}
                      onChange={e => setNewPolicy({...newPolicy, description: e.target.value})}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all"
                    >
                      Establish Law
                    </button>
                  </div>
                </div>
              </form>
            )}

            {policies.map((policy) => (
              <div 
                key={policy.id} 
                className="group p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-lg",
                    policy.type === 'technical' && "bg-blue-500/10 text-blue-400",
                    policy.type === 'operational' && "bg-emerald-500/10 text-emerald-400",
                    policy.type === 'security' && "bg-purple-500/10 text-purple-400"
                  )}>
                    {policy.type === 'technical' && <Settings className="w-5 h-5" />}
                    {policy.type === 'operational' && <Activity className="w-5 h-5" />}
                    {policy.type === 'security' && <Shield className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">{policy.name}</h4>
                      {!policy.is_active && (
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-white/5 text-muted-foreground px-2 py-0.5 rounded">Draft</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{policy.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-muted-foreground">Established</div>
                    <div className="text-sm font-medium text-white/70">{new Date(policy.created_at).toLocaleDateString()}</div>
                  </div>
                  
                  <div className="h-8 w-[1px] bg-white/10" />

                  <button 
                    onClick={() => togglePolicy(policy)}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      policy.is_active 
                        ? "text-primary hover:bg-primary/10" 
                        : "text-muted-foreground hover:bg-white/10"
                    )}
                    title={policy.is_active ? "Deactivate" : "Activate"}
                  >
                    <Power className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

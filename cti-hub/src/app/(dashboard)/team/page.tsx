'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';
import { Key, Users, Copy, Check, Trash2, Plus, Shield } from 'lucide-react';

interface AccessKey {
  key: string;
  label: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
  redeemed_by: string | null;
  redeemed_at: string | null;
}

interface AllowedUser {
  email: string;
  display_name: string;
  access_key: string;
  granted_at: string;
  is_active: boolean;
}

export default function TeamPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ownerAccess = isOwner(user?.email);

  useEffect(() => {
    if (!ownerAccess) return;
    fetch('/api/access-keys')
      .then(r => r.json())
      .then(data => {
        setKeys(data.keys || []);
        setUsers(data.users || []);
      })
      .catch(() => {});
  }, [ownerAccess]);

  async function generateKey() {
    if (!newLabel.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/access-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel }),
      });
      const data = await res.json();
      if (data.key) {
        setKeys(prev => [{ ...data, created_by: user?.email || '', created_at: new Date().toISOString(), is_active: true, redeemed_by: null, redeemed_at: null }, ...prev]);
        setNewLabel('');
      }
    } catch {}
    setLoading(false);
  }

  async function revokeKey(key: string) {
    await fetch(`/api/access-keys?key=${key}`, { method: 'DELETE' });
    setKeys(prev => prev.map(k => k.key === key ? { ...k, is_active: false } : k));
    setUsers(prev => prev.map(u => u.access_key === key ? { ...u, is_active: false } : u));
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  if (!ownerAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Owner access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#00A3FF]/10 flex items-center justify-center text-[#00A3FF]">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Access</h1>
          <p className="text-sm text-slate-500">Generate access keys, manage who can use CTI HUB.</p>
        </div>
      </div>

      {/* Generate Key */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Generate Access Key</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Team member name or role..."
            className="flex-1 h-10 px-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF]"
          />
          <button
            onClick={generateKey}
            disabled={!newLabel.trim() || loading}
            className="px-5 h-10 rounded-lg bg-[#00A3FF] text-white text-sm font-bold hover:bg-[#0089D9] transition-all disabled:opacity-30 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Generate
          </button>
        </div>
      </div>

      {/* Keys */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Access Keys ({keys.length})</h2>
        <div className="space-y-3">
          {keys.map(k => (
            <div key={k.key} className={`flex items-center gap-3 p-3 rounded-lg border ${k.is_active ? 'border-slate-200' : 'border-red-200 bg-red-50/50 opacity-60'}`}>
              <Key className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-700">{k.key}</span>
                  <button onClick={() => copyKey(k.key)} className="text-slate-400 hover:text-[#00A3FF]">
                    {copiedKey === k.key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {k.label} &middot; {k.redeemed_by ? `Redeemed by ${k.redeemed_by}` : 'Unused'}
                </p>
              </div>
              {k.is_active && (
                <button onClick={() => revokeKey(k.key)} className="text-slate-400 hover:text-red-500 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {!k.is_active && <span className="text-[9px] font-bold text-red-500 uppercase">Revoked</span>}
            </div>
          ))}
          {keys.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No keys generated yet</p>
          )}
        </div>
      </div>

      {/* Active Users */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Team Members ({users.filter(u => u.is_active).length})</h2>
        <div className="space-y-2">
          {users.filter(u => u.is_active).map(u => (
            <div key={u.email} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                {u.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{u.display_name}</p>
                <p className="text-[10px] text-slate-500">{u.email}</p>
              </div>
              <span className="text-[9px] font-bold text-emerald-600 uppercase">Active</span>
            </div>
          ))}
          {users.filter(u => u.is_active).length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No team members yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

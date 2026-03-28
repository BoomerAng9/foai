'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Key, Check, AlertCircle } from 'lucide-react';

export default function RedeemPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleRedeem() {
    if (!key.trim()) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/access-keys/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Redemption failed');
      } else {
        setSuccess(true);
        setTimeout(() => router.replace('/'), 2000);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <p className="text-sm text-slate-400">Sign in first, then redeem your access key.</p>
          <a href="/auth/login" className="text-[#00A3FF] text-sm font-bold mt-2 inline-block">Sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-[#00A3FF] flex items-center justify-center text-white text-xl font-black">C</div>
          <span className="text-2xl font-bold text-white tracking-tight">CTI HUB</span>
        </div>

        <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-8">
          {success ? (
            <div className="text-center py-4">
              <Check className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-lg font-bold text-white">Access Granted</p>
              <p className="text-xs text-slate-500 mt-1">Redirecting to dashboard...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center mb-6">
                <Key className="w-8 h-8 text-[#00A3FF]" />
              </div>
              <h2 className="text-lg font-bold text-white text-center mb-2">Redeem Access Key</h2>
              <p className="text-xs text-slate-500 text-center mb-6">
                Enter the access key provided by the CTI HUB administrator.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <input
                type="text"
                value={key}
                onChange={e => setKey(e.target.value.toUpperCase())}
                placeholder="CTI-XXXX-XXXX-XXXX"
                maxLength={18}
                className="w-full h-12 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-center text-lg font-mono font-bold tracking-widest text-white focus:outline-none focus:border-[#00A3FF]/50 placeholder:text-slate-600 mb-4"
              />

              <button
                onClick={handleRedeem}
                disabled={key.length < 16 || loading}
                className="w-full h-12 rounded-xl bg-[#00A3FF] text-white text-sm font-bold hover:bg-[#0089D9] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Redeem Key'
                )}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-6">
          Signed in as {user.email}
        </p>
      </div>
    </div>
  );
}

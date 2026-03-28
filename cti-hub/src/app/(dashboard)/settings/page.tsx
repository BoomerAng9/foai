'use client';

import Link from 'next/link';
import { User, CreditCard, MessageSquare, Shield, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { profile, organization } = useAuth();
  const isOwner = profile?.role === 'admin' || profile?.role === 'operator';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="label-mono mb-2">Account</p>
        <h1 className="text-3xl font-light tracking-tight">
          Your <span className="font-bold">settings</span>
        </h1>
        <p className="text-fg-secondary text-sm mt-2">
          Profile, workspace, and billing. Everything else lives in the chat.
        </p>
      </div>

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-accent flex items-center justify-center text-bg font-mono text-lg font-bold">
            {profile?.display_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-bold text-lg">{profile?.display_name || 'Your account'}</p>
            <p className="font-mono text-xs text-fg-tertiary uppercase">{profile?.tier || 'free'} plan</p>
          </div>
        </div>

        <div className="space-y-0 border-t border-border">
          <div className="flex items-center justify-between py-4 border-b border-border">
            <span className="label-mono">Workspace</span>
            <span className="text-sm font-medium">{organization?.name || 'Personal'}</span>
          </div>
          <div className="flex items-center justify-between py-4 border-b border-border">
            <span className="label-mono">Plan</span>
            <span className="text-sm font-medium capitalize">{profile?.tier || 'free'}</span>
          </div>
          <div className="flex items-center justify-between py-4">
            <span className="label-mono">ID</span>
            <span className="font-mono text-xs text-fg-tertiary">{profile?.user_id?.slice(0, 16) || '—'}...</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="label-mono mb-3">Quick actions</p>
        <div className="space-y-px">
          {[
            { label: 'OPEN CHAT', desc: 'Talk to ACHEEVY', href: '/chat/librechat', icon: MessageSquare },
            { label: 'MANAGE BILLING', desc: 'Update plan and payment', href: '/pricing', icon: CreditCard },
            ...(isOwner ? [{ label: 'OPERATIONS', desc: 'Fleet monitoring', href: '/live', icon: Shield }] : []),
          ].map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-4 p-4 bg-bg-surface border border-border hover:border-fg-ghost transition-colors group"
            >
              <action.icon className="w-4 h-4 text-fg-tertiary" />
              <div className="flex-1">
                <p className="font-mono text-[11px] font-bold tracking-wider">{action.label}</p>
                <p className="text-xs text-fg-secondary">{action.desc}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-fg-ghost group-hover:text-fg transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

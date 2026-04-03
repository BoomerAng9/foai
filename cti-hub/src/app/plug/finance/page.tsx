'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, CreditCard,
  AlertTriangle, MessageSquare, RefreshCw, PiggyBank, Wallet,
  ShieldAlert, Calendar,
} from 'lucide-react';
import { PlugChat } from '@/components/plug/PlugChat';

// ─── Synthetic Data ──────────────────────────────────────────────────────────

const OVERVIEW = {
  totalBalance: 47_832.14,
  monthlySpending: 4_218.67,
  savingsRate: 32,
  monthlyIncome: 6_200.00,
};

const TRANSACTIONS = [
  { date: 'Apr 1', merchant: 'Whole Foods Market', category: 'Groceries', amount: -127.43, icon: '🛒' },
  { date: 'Mar 31', merchant: 'Shell Gas Station', category: 'Transportation', amount: -58.20, icon: '⛽' },
  { date: 'Mar 31', merchant: 'Spotify Premium', category: 'Subscription', amount: -10.99, icon: '🎵' },
  { date: 'Mar 30', merchant: 'Amazon.com', category: 'Shopping', amount: -89.99, icon: '📦' },
  { date: 'Mar 29', merchant: 'Freelance Payment — Acme Corp', category: 'Income', amount: 2_400.00, icon: '💰' },
  { date: 'Mar 28', merchant: 'Chipotle Mexican Grill', category: 'Dining', amount: -16.45, icon: '🍽️' },
  { date: 'Mar 27', merchant: 'Electric Company', category: 'Utilities', amount: -142.30, icon: '⚡' },
  { date: 'Mar 27', merchant: 'Planet Fitness', category: 'Health', amount: -24.99, icon: '💪' },
  { date: 'Mar 26', merchant: 'Target', category: 'Shopping', amount: -67.82, icon: '🏬' },
  { date: 'Mar 25', merchant: 'Venmo — Alex R.', category: 'Transfer', amount: 45.00, icon: '🔄' },
];

const SUBSCRIPTIONS = [
  { name: 'Netflix Standard', amount: 15.49, renewal: 'Apr 8', category: 'Entertainment' },
  { name: 'Spotify Premium', amount: 10.99, renewal: 'Apr 30', category: 'Music' },
  { name: 'iCloud+ 200GB', amount: 2.99, renewal: 'Apr 12', category: 'Storage' },
  { name: 'ChatGPT Plus', amount: 20.00, renewal: 'Apr 15', category: 'AI Tools' },
  { name: 'Adobe Creative Cloud', amount: 54.99, renewal: 'Apr 22', category: 'Software' },
  { name: 'NYT Digital', amount: 4.25, renewal: 'Apr 5', category: 'News' },
];

const ANOMALY = {
  merchant: 'CryptoSwap Exchange',
  amount: 499.00,
  date: 'Mar 31',
  reason: 'First-time transaction with a crypto exchange. Amount is 3x your average discretionary purchase. This was not in your planned budget.',
};

const WEEKLY_BRIEFING = `Good morning. Here's your weekly financial summary:

Your spending this week was $612.17, which is 8% under your weekly budget of $665. Groceries were the largest category at $127.43. Your savings rate held steady at 32%, putting you on track to hit your $15K emergency fund goal by August.

One concern: the $499 CryptoSwap charge on March 31st doesn't match your usual spending patterns. I've flagged it for your review.

Upcoming: your Adobe Creative Cloud renewal ($54.99) hits on April 22nd. You've used it 3 times in the past month — consider downgrading to the Photography plan at $9.99/mo to save $540/year.

Net worth trend: up $1,840 this month. Keep it going.`;

const CHAT_MESSAGES = [
  { role: 'acheevy' as const, text: 'I flagged the $499 CryptoSwap charge. Was this intentional? It doesn\'t match your spending profile.' },
  { role: 'user' as const, text: 'Yes, I bought some ETH. One-time thing.' },
  { role: 'acheevy' as const, text: 'Noted — I\'ve categorized it as "Investment" and won\'t flag crypto purchases under $500 going forward. That said, your discretionary budget is now $83 under for this month. Want me to adjust the forecast?' },
];

// ─── Page Component ──────────────────────────────────────────────────────────

export default function FinancePage() {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const [anomalyDismissed, setAnomalyDismissed] = useState(false);

  function handleSend() {
    if (!chatInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user' as const, text: chatInput },
      { role: 'acheevy' as const, text: 'Let me check the numbers... I\'ll update your dashboard with the latest analysis.' },
    ]);
    setChatInput('');
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/chat" className="text-white/40 hover:text-[#E8A020] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Wallet className="w-6 h-6 text-[#E8A020]" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Finance Command Center</h1>
            <p className="text-xs text-white/40 font-mono">Personal CFO Dashboard</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Anomaly Alert */}
        {!anomalyDismissed && (
          <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-red-400">Unusual Charge Detected</span>
                <button
                  onClick={() => setAnomalyDismissed(true)}
                  className="text-xs text-white/30 hover:text-white/60 font-mono"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-sm mt-1">
                <span className="font-mono text-red-300">${ANOMALY.amount.toFixed(2)}</span> at{' '}
                <span className="font-medium">{ANOMALY.merchant}</span> on {ANOMALY.date}
              </p>
              <p className="text-xs text-white/40 mt-1">{ANOMALY.reason}</p>
            </div>
          </div>
        )}

        {/* Overview Panel */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-[#E8A020]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Total Balance</span>
            </div>
            <p className="text-2xl font-bold">${OVERVIEW.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-green-400 font-mono mt-1">+$1,840 this month</p>
          </div>
          <div className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-[#E8A020]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Monthly Spend</span>
            </div>
            <p className="text-2xl font-bold">${OVERVIEW.monthlySpending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-yellow-400 font-mono mt-1">68% of budget used</p>
          </div>
          <div className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-4 h-4 text-[#E8A020]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Savings Rate</span>
            </div>
            <p className="text-2xl font-bold">{OVERVIEW.savingsRate}%</p>
            <div className="w-full bg-white/10 rounded-full h-2 mt-2">
              <div className="bg-[#E8A020] h-2 rounded-full" style={{ width: `${OVERVIEW.savingsRate}%` }} />
            </div>
          </div>
          <div className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#E8A020]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Monthly Income</span>
            </div>
            <p className="text-2xl font-bold">${OVERVIEW.monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-green-400 font-mono mt-1">On track</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-[#E8A020]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Recent Transactions</span>
            </div>
            <div className="space-y-1">
              {TRANSACTIONS.map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{tx.icon}</span>
                    <div>
                      <p className="text-sm">{tx.merchant}</p>
                      <p className="text-xs text-white/30 font-mono">{tx.date} &middot; {tx.category}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-mono font-medium ${tx.amount >= 0 ? 'text-green-400' : 'text-white'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Tracker */}
          <div className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-4 h-4 text-[#E8A020]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Subscriptions</span>
            </div>
            <div className="space-y-3">
              {SUBSCRIPTIONS.map((sub, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm">{sub.name}</p>
                    <p className="text-[10px] text-white/30 font-mono">Renews {sub.renewal} &middot; {sub.category}</p>
                  </div>
                  <span className="text-sm font-mono text-[#E8A020]">${sub.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-white/40 font-mono">Monthly total</span>
              <span className="text-sm font-mono font-bold text-[#E8A020]">
                ${SUBSCRIPTIONS.reduce((sum, s) => sum + s.amount, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Briefing */}
        <div className="border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-[#E8A020]" />
            <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Weekly Briefing from ACHEEVY</span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
            <div className="text-sm leading-relaxed whitespace-pre-line text-white/80">{WEEKLY_BRIEFING}</div>
          </div>
        </div>

        {/* Chat */}
        <div className="border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-[#E8A020]" />
            <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Chat with ACHEEVY</span>
          </div>
          <div className="h-80">
            <PlugChat
              agentName="LUC"
              agentRole="Financial Analyst"
              agentColor="#84CC16"
              systemPrompt="You are LUC, the financial analyst on The Deploy Platform. You help businesses understand their financial health and make data-driven decisions.\n\nYOU CAN:\n- Analyze cash flow patterns and identify trends\n- Create budget forecasts and projections\n- Evaluate pricing strategies and unit economics\n- Build financial models for growth scenarios\n- Flag financial risks and suggest mitigations\n- Compare revenue streams and cost centers\n- Explain financial concepts in plain language\n\nALWAYS give specific numbers, percentages, and actionable recommendations. Business owners need clarity, not jargon."
              placeholder="Ask about your finances..."
              welcomeMessage="I'm your financial analyst. I can help with cash flow analysis, budget forecasting, pricing strategy, or any financial question. What would you like to look at?"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-4 mt-8">
        <p className="text-center text-xs text-white/30 font-mono">
          Powered by The Deploy Platform
        </p>
      </footer>
    </div>
  );
}

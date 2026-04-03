'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, Eye, TrendingUp, MessageSquare,
  Send, Star, Users, BarChart3, Zap, FileText,
} from 'lucide-react';
import { PlugChat } from '@/components/plug/PlugChat';

// ─── Synthetic Data ──────────────────────────────────────────────────────────

const CALENDAR = [
  { day: 'Tue, Apr 1', title: 'Fresh Croissant Tuesday', platform: 'Instagram', type: 'Reel' },
  { day: 'Wed, Apr 2', title: '"Behind the Oven" — Meet Chef Amal', platform: 'TikTok', type: 'Video' },
  { day: 'Thu, Apr 3', title: 'Customer Spotlight: Maria\'s Wedding Cake', platform: 'Facebook', type: 'Story' },
  { day: 'Fri, Apr 4', title: 'Weekend Pre-Order Reminder', platform: 'Instagram', type: 'Post' },
  { day: 'Sat, Apr 5', title: 'Saturday Morning Bread Drop', platform: 'Instagram', type: 'Reel' },
  { day: 'Sun, Apr 6', title: 'Sunday Brunch Menu Reveal', platform: 'TikTok', type: 'Video' },
  { day: 'Mon, Apr 7', title: 'New: Lavender Honey Scones', platform: 'All', type: 'Launch' },
];

const COMPETITORS = [
  { name: 'Golden Crust Bakery', followers: '12.4K', lastPost: '2 days ago', trend: 'Pushing gluten-free line hard', threat: 'medium' },
  { name: 'Sweet Flour Co.', followers: '8.9K', lastPost: '5 hours ago', trend: 'Running 20% off promo this week', threat: 'high' },
  { name: 'Breadsmith Local', followers: '5.2K', lastPost: '1 week ago', trend: 'Inactive — possible rebrand', threat: 'low' },
];

const METRICS = {
  followers: { value: '14,832', change: '+342 this month', up: true },
  reach: { value: '89,400', change: '+18% vs last month', up: true },
  reviews: { value: '4.8 / 5', change: '127 reviews on Google', up: true },
  engagement: { value: '6.2%', change: '+0.8% vs last month', up: true },
};

const RECENT_CONTENT = [
  {
    platform: 'Instagram',
    type: 'Reel',
    title: 'Sourdough Time-Lapse',
    likes: 1243,
    comments: 87,
    shares: 34,
    posted: 'Mar 30',
    preview: '"Watch 24 hours of sourdough magic in 30 seconds. Our starter is 3 years old and still going strong..."',
  },
  {
    platform: 'TikTok',
    type: 'Video',
    title: 'Cake Decorating Fails vs. Wins',
    likes: 3891,
    comments: 214,
    shares: 156,
    posted: 'Mar 28',
    preview: '"POV: You asked for a unicorn cake and this is attempt #1 vs. attempt #5..."',
  },
  {
    platform: 'Facebook',
    type: 'Post',
    title: 'Easter Pre-Order Announcement',
    likes: 567,
    comments: 43,
    shares: 28,
    posted: 'Mar 27',
    preview: '"Easter is coming and so are our famous Hot Cross Buns! Pre-order now — we sold out in 2 hours last year..."',
  },
  {
    platform: 'Google',
    type: 'Reply',
    title: 'Review Response to Sarah M.',
    likes: 0,
    comments: 0,
    shares: 0,
    posted: 'Mar 26',
    preview: '"Thank you Sarah! Chef Amal was thrilled to hear you loved the pistachio baklava. See you next Saturday!"',
  },
];

const AGENTS = [
  { name: 'Content_Ang', status: 'Drafting Thursday post', color: 'bg-green-400' },
  { name: 'Scout_Ang', status: 'Monitoring Sweet Flour Co. promo', color: 'bg-yellow-400' },
  { name: 'Biz_Ang', status: 'Analyzing weekly engagement', color: 'bg-blue-400' },
];

const CHAT_MESSAGES = [
  { role: 'acheevy' as const, text: 'Good news: your Instagram reach is up 18% this month. The sourdough reel outperformed your average by 3x. I recommend doubling down on process videos -- your audience loves "behind the scenes" content.' },
  { role: 'user' as const, text: 'Sweet Flour is running a promo. Should we match it?' },
  { role: 'acheevy' as const, text: 'I wouldn\'t recommend a direct price war. Instead, Scout_Ang found that their promo is driving traffic but not engagement. I suggest we run a "Free Cookie Friday" loyalty play -- it costs less, builds repeat customers, and positions Sunrise as premium. Want me to draft the campaign?' },
];

// ─── Page Component ──────────────────────────────────────────────────────────

export default function SMBMarketingPage() {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(CHAT_MESSAGES);

  function handleSend() {
    if (!chatInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user' as const, text: chatInput },
      { role: 'acheevy' as const, text: 'Analyzing your request... I\'ll have Content_Ang draft options and get back to you shortly.' },
    ]);
    setChatInput('');
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/deploy-landing" className="text-white/40 hover:text-[#E8A020] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-2xl">🥐</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Sunrise Bakery &middot; Marketing Agency</h1>
            <p className="text-xs text-white/40 font-mono">Autonomous Marketing Dashboard</p>
          </div>
        </div>
      </header>

      {/* Agent Status Bar */}
      <div className="border-b border-white/10 px-6 py-2 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <span className="text-xs text-white/40 font-mono uppercase tracking-wider">Active Agents</span>
          {AGENTS.map((agent, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${agent.color} animate-pulse`} />
              <span className="text-xs font-mono text-white/60">{agent.name}</span>
              <span className="text-[10px] text-white/30">{agent.status}</span>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(METRICS).map(([key, data]) => (
            <div key={key} className="border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {key === 'followers' && <Users className="w-4 h-4 text-[#E8A020]" />}
                {key === 'reach' && <Eye className="w-4 h-4 text-[#E8A020]" />}
                {key === 'reviews' && <Star className="w-4 h-4 text-[#E8A020]" />}
                {key === 'engagement' && <TrendingUp className="w-4 h-4 text-[#E8A020]" />}
                <span className="font-mono text-xs text-white/40 uppercase tracking-wider">{key}</span>
              </div>
              <p className="text-2xl font-bold">{data.value}</p>
              <p className="text-xs text-green-400 font-mono mt-1">{data.change}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Content Calendar */}
          <div className="lg:col-span-2 border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-[#E8A020]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Content Calendar — Next 7 Days</span>
            </div>
            <div className="space-y-2">
              {CALENDAR.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/30 font-mono w-20">{item.day}</span>
                    <span className="text-sm">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 font-mono">{item.platform}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#E8A020]/10 text-[#E8A020] font-mono">{item.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competitor Watch */}
          <div className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-[#E8A020]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Competitor Watch</span>
            </div>
            <div className="space-y-4">
              {COMPETITORS.map((c, i) => {
                const threatColors: Record<string, string> = {
                  high: 'text-red-400 bg-red-400/10',
                  medium: 'text-yellow-400 bg-yellow-400/10',
                  low: 'text-green-400 bg-green-400/10',
                };
                return (
                  <div key={i} className="border-b border-white/5 last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${threatColors[c.threat]}`}>
                        {c.threat}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 font-mono">{c.followers} followers &middot; Last post: {c.lastPost}</p>
                    <p className="text-xs text-white/60 mt-1">{c.trend}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Content */}
        <div className="border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-[#E8A020]" />
            <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Recent Content</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RECENT_CONTENT.map((post, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#E8A020]/10 text-[#E8A020]">{post.platform}</span>
                    <span className="text-xs text-white/30 font-mono">{post.type}</span>
                  </div>
                  <span className="text-xs text-white/30 font-mono">{post.posted}</span>
                </div>
                <p className="text-sm font-medium mb-2">{post.title}</p>
                <p className="text-xs text-white/50 leading-relaxed mb-3">{post.preview}</p>
                {post.likes > 0 && (
                  <div className="flex gap-4 text-[10px] text-white/30 font-mono">
                    <span>{post.likes.toLocaleString()} likes</span>
                    <span>{post.comments} comments</span>
                    <span>{post.shares} shares</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat with ACHEEVY */}
        <div className="border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-[#E8A020]" />
            <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Chat with ACHEEVY — Campaign Strategy</span>
          </div>
          <div className="h-80">
            <PlugChat
              agentName="Biz_Ang"
              agentRole="Marketing Strategist"
              agentColor="#10B981"
              systemPrompt="You are Biz_Ang, the marketing strategist on The Deploy Platform. You help small and medium businesses plan and execute marketing campaigns.\n\nYOU CAN:\n- Create social media content calendars\n- Write ad copy for Google, Meta, LinkedIn\n- Analyze campaign performance metrics\n- Suggest audience targeting strategies\n- Build email marketing sequences\n- Design A/B testing frameworks\n\nKEEP RESPONSES ACTIONABLE. Give specific copy, specific numbers, specific next steps. SMB owners don't have time for theory."
              placeholder="Ask about campaign strategy..."
              welcomeMessage="I'm Biz_Ang, your marketing strategist. I can help you plan campaigns, write ad copy, build content calendars, or analyze what's working. What's your biggest marketing challenge right now?"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-4 mt-8">
        <p className="text-center text-xs text-white/30 font-mono">
          Powered by Content_Ang &middot; Scout_Ang &middot; Biz_Ang
        </p>
      </footer>
    </div>
  );
}

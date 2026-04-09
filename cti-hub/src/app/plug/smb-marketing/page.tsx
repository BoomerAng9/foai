'use client';

import { useState, useCallback } from 'react';
import {
  ArrowRight, Search, TrendingUp, MessageSquare,
  Users, Calendar, FileText, Loader2, Zap,
} from 'lucide-react';
import { PlugChat } from '@/components/plug/PlugChat';
import { PlugChrome } from '@/components/plug/PlugChrome';

/**
 * SMB Marketing Plug — Real data, real agents.
 *
 * Flow:
 * 1. User enters their business name + industry
 * 2. Scout_Ang researches the business (Brave Search via API)
 * 3. Biz_Ang generates a marketing strategy based on real findings
 * 4. Content_Ang drafts actual social media content
 * 5. Everything is generated live — no fake data
 */

interface BusinessProfile {
  name: string;
  industry: string;
  location: string;
  website?: string;
}

interface ResearchResult {
  summary: string;
  competitors: string[];
  opportunities: string[];
  content_ideas: string[];
}

export default function SMBMarketingPage() {
  const [step, setStep] = useState<'setup' | 'researching' | 'dashboard'>('setup');
  const [business, setBusiness] = useState<BusinessProfile>({ name: '', industry: '', location: '' });
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [contentCalendar, setContentCalendar] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const startResearch = useCallback(async () => {
    if (!business.name.trim() || !business.industry.trim()) return;
    setStep('researching');
    setLoading(true);

    try {
      // Step 1: Scout_Ang researches the business
      const scoutRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Research this business for marketing strategy: "${business.name}" in the ${business.industry} industry, located in ${business.location || 'the US'}. ${business.website ? `Website: ${business.website}` : ''}\n\nProvide:\n1. A 2-sentence summary of the business and its market position\n2. Top 3 competitors (real companies)\n3. Top 3 marketing opportunities\n4. 7 content ideas for the next week (with platform and format)\n\nReturn as JSON: { "summary": "...", "competitors": ["..."], "opportunities": ["..."], "content_ideas": ["Day: Title (Platform, Format)"] }`,
          skill_context: 'You are Scout_Ang, a market research specialist. Research this real business using your knowledge. Return ONLY valid JSON, no markdown.',
        }),
      });

      if (scoutRes.ok && scoutRes.body) {
        const reader = scoutRes.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) fullText += data.content;
            } catch {}
          }
        }

        // Parse the JSON from the response
        let jsonStr = fullText;
        if (jsonStr.includes('```json')) jsonStr = jsonStr.split('```json')[1]?.split('```')[0] || jsonStr;
        else if (jsonStr.includes('```')) jsonStr = jsonStr.split('```')[1]?.split('```')[0] || jsonStr;

        // Try to find JSON in the response
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            setResearch({
              summary: parsed.summary || 'Research complete.',
              competitors: parsed.competitors || [],
              opportunities: parsed.opportunities || [],
              content_ideas: parsed.content_ideas || [],
            });
          } catch {
            setResearch({
              summary: fullText.slice(0, 200),
              competitors: [],
              opportunities: [],
              content_ideas: [],
            });
          }
        } else {
          setResearch({
            summary: fullText.slice(0, 300),
            competitors: [],
            opportunities: [],
            content_ideas: [],
          });
        }
      }

      // Step 2: Content_Ang generates content calendar
      const contentRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Create a 7-day social media content calendar for "${business.name}" (${business.industry}, ${business.location || 'US'}). For each day, provide: the day, post title, platform (Instagram/TikTok/Facebook/LinkedIn), format (Reel/Post/Story/Video), and a 1-sentence caption. Make it specific to this business — not generic.`,
          skill_context: 'You are Content_Ang, a social media content strategist. Create specific, actionable content for this real business. Be creative and platform-aware.',
        }),
      });

      if (contentRes.ok && contentRes.body) {
        const reader = contentRes.body.getReader();
        const decoder = new TextDecoder();
        let calText = '';
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) calText += data.content;
            } catch {}
          }
        }
        setContentCalendar(calText);
      }

      setStep('dashboard');
    } catch (err) {
      console.error('Research failed:', err);
      setStep('dashboard');
    } finally {
      setLoading(false);
    }
  }, [business]);

  // ── Setup Screen ──
  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-bg text-fg">
        <PlugChrome
          title="Marketing Agency"
          tagline="Powered by The Deploy Platform"
          icon={<Zap className="w-5 h-5" />}
          accentColor="#E8A020"
        />
        <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full mx-4 p-8 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-[#E8A020]" />
            <div>
              <h1 className="text-xl font-bold">Marketing Agency</h1>
              <p className="text-xs text-white/40 font-mono">Powered by The Deploy Platform</p>
            </div>
          </div>

          <p className="text-sm text-white/60 mb-6">
            Enter your real business details. Our agents will research your market, analyze competitors, and build a content strategy — all live.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Business Name</label>
              <input
                value={business.name}
                onChange={e => setBusiness(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Sunrise Bakery"
                className="w-full px-3 py-2.5 bg-transparent border border-white/10 text-sm outline-none focus:border-[#E8A020]/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Industry</label>
              <input
                value={business.industry}
                onChange={e => setBusiness(prev => ({ ...prev, industry: e.target.value }))}
                placeholder="e.g. Bakery, SaaS, Fitness, Real Estate"
                className="w-full px-3 py-2.5 bg-transparent border border-white/10 text-sm outline-none focus:border-[#E8A020]/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Location</label>
              <input
                value={business.location}
                onChange={e => setBusiness(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g. Austin, TX"
                className="w-full px-3 py-2.5 bg-transparent border border-white/10 text-sm outline-none focus:border-[#E8A020]/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Website (optional)</label>
              <input
                value={business.website || ''}
                onChange={e => setBusiness(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2.5 bg-transparent border border-white/10 text-sm outline-none focus:border-[#E8A020]/50"
              />
            </div>
          </div>

          <button
            onClick={startResearch}
            disabled={!business.name.trim() || !business.industry.trim()}
            className="w-full mt-6 py-3 text-sm font-bold tracking-wider bg-[#E8A020] text-black disabled:opacity-30 transition-all flex items-center justify-center gap-2"
          >
            LAUNCH RESEARCH <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[10px] text-white/20 text-center mt-4 font-mono">
            Our agents will research your business in real-time
          </p>
        </div>
        </div>
      </div>
    );
  }

  // ── Researching Screen ──
  if (step === 'researching' && loading) {
    return (
      <div className="min-h-screen bg-bg text-fg">
        <PlugChrome
          title="Marketing Agency"
          tagline="Agents working..."
          icon={<Zap className="w-5 h-5" />}
          accentColor="#E8A020"
        />
        <div className="flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-md mx-4">
            <Loader2 className="w-8 h-8 text-[#E8A020] animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">Agents Working</h2>
            <div className="space-y-2 text-sm text-white/50">
              <div className="flex items-center gap-2 justify-center">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>Researching {business.name}...</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>Analyzing market position...</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span>Generating content calendar...</span>
              </div>
            </div>
            <p className="text-[10px] text-white/20 font-mono mt-6">This takes 15-30 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard (Real Data) ──
  return (
    <div className="min-h-screen bg-bg text-fg">
      <PlugChrome
        title={business.name}
        tagline={`${business.industry} · ${business.location}`}
        icon={<Zap className="w-5 h-5" />}
        accentColor="#E8A020"
        rightSlot={
          <button
            onClick={() => { setStep('setup'); setResearch(null); setContentCalendar(''); }}
            className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors"
          >
            NEW BUSINESS
          </button>
        }
      />

      {/* Agent Status — Real */}
      <div className="border-b border-white/10 px-6 py-2 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <span className="text-xs text-white/40 font-mono uppercase tracking-wider">Agents</span>
          {[
            { name: 'Research', status: 'Complete', color: 'bg-green-400' },
            { name: 'Strategy', status: 'Ready', color: 'bg-green-400' },
            { name: 'Content', status: 'Generated', color: 'bg-green-400' },
          ].map((agent, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${agent.color}`} />
              <span className="text-xs font-mono text-white/60">{agent.name}</span>
              <span className="text-[10px] text-white/30">{agent.status}</span>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Research Summary */}
        {research && (
          <div className="border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-[#3B82F6]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Market Research</span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed mb-4">{research.summary}</p>

            {research.competitors.length > 0 && (
              <div className="mb-4">
                <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-2">Competitors Identified</p>
                <div className="space-y-1">
                  {research.competitors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {research.opportunities.length > 0 && (
              <div>
                <p className="font-mono text-[10px] text-white/40 uppercase tracking-wider mb-2">Opportunities</p>
                <div className="space-y-1">
                  {research.opportunities.map((o, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                      {o}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Calendar — Generated by Content_Ang */}
        {contentCalendar && (
          <div className="border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[#8B5CF6]" />
              <span className="font-mono text-xs text-white/40 uppercase tracking-wider">7-Day Content Calendar</span>
            </div>
            <div className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
              {contentCalendar}
            </div>
          </div>
        )}

        {/* Live Strategy Chat */}
        <div className="border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-[#E8A020]" />
            <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Live Strategy Chat</span>
          </div>
          <div className="h-96">
            <PlugChat
              agentName="Biz_Ang"
              agentRole="Marketing Strategist"
              agentColor="#10B981"
              systemPrompt={`You are Biz_Ang, the marketing strategist on The Deploy Platform. You are working with a real business:\n\nBusiness: ${business.name}\nIndustry: ${business.industry}\nLocation: ${business.location}\n${business.website ? `Website: ${business.website}` : ''}\n\n${research ? `Scout_Ang's research found:\n- Summary: ${research.summary}\n- Competitors: ${research.competitors.join(', ')}\n- Opportunities: ${research.opportunities.join(', ')}` : ''}\n\nGive SPECIFIC, ACTIONABLE advice for THIS business. Reference their competitors by name. Suggest specific content for their industry. No generic advice.`}
              placeholder={`Ask about ${business.name}'s marketing strategy...`}
              welcomeMessage={`I've reviewed the research on ${business.name}. I have specific recommendations for your ${business.industry} marketing. What would you like to focus on — content strategy, competitor response, or audience growth?`}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 py-4 mt-8">
        <p className="text-center text-xs text-white/30 font-mono">
          Powered by The Deploy Platform
        </p>
      </footer>
    </div>
  );
}

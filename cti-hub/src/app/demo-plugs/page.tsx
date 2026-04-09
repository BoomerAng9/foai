'use client';

import Link from 'next/link';
import { PlugChrome } from '@/components/plug/PlugChrome';
import { Package } from 'lucide-react';

export default function PlugPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F' }}>
      <PlugChrome
        title="aiPLUG & Play"
        tagline="Autonomous demo agents — one click to launch"
        icon={<Package className="w-5 h-5" />}
        accentColor="#E8A020"
        backHref="/"
        backLabel="Home"
      />
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">
          Demo <span className="font-bold">Plugs</span>
        </h1>
        <p className="text-sm text-white/40 font-mono mb-12">AI-powered solutions for every vertical</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/plug/sqwaadrun" className="border border-white/10 p-6 text-left transition-all hover:border-opacity-40 block" style={{ background: '#F5A62308', borderColor: '#F5A62320' }}>
            <span className="text-2xl block mb-2">&#x1F985;</span>
            <span className="text-sm font-bold block" style={{ color: '#F5A623' }}>The Sqwaadrun</span>
            <span className="text-[10px] text-white/40 font-mono">17-Hawk web intelligence fleet</span>
          </Link>
          <a href="https://perform.foai.cloud" target="_blank" rel="noopener noreferrer" className="border border-white/10 p-6 text-left transition-all hover:border-opacity-40 block" style={{ background: '#E8A02008', borderColor: '#E8A02020' }}>
            <span className="text-2xl block mb-2">&#x1F3C8;</span>
            <span className="text-sm font-bold block" style={{ color: '#E8A020' }}>Per|Form</span>
            <span className="text-[10px] text-white/40 font-mono">Sports grading & ranking</span>
          </a>
          <Link href="/aiplug/smb-marketing" className="border border-white/10 p-6 text-left transition-all hover:border-opacity-40 block" style={{ background: '#E8A02008', borderColor: '#E8A02020' }}>
            <span className="text-2xl block mb-2">&#x1F4C8;</span>
            <span className="text-sm font-bold block" style={{ color: '#E8A020' }}>Marketing Agency</span>
            <span className="text-[10px] text-white/40 font-mono">Research + strategy + content</span>
          </Link>
          <Link href="/aiplug/finance-analyst" className="border border-white/10 p-6 text-left transition-all hover:border-opacity-40 block" style={{ background: '#E8A02008', borderColor: '#E8A02020' }}>
            <span className="text-2xl block mb-2">&#x1F4B0;</span>
            <span className="text-sm font-bold block" style={{ color: '#E8A020' }}>Finance Analyst</span>
            <span className="text-[10px] text-white/40 font-mono">Cash flow + budget + pricing</span>
          </Link>
          <Link href="/aiplug/teacher-twin" className="border border-white/10 p-6 text-left transition-all hover:border-opacity-40 block" style={{ background: '#E8A02008', borderColor: '#E8A02020' }}>
            <span className="text-2xl block mb-2">&#x1F393;</span>
            <span className="text-sm font-bold block" style={{ color: '#E8A020' }}>Digital Twin Teacher</span>
            <span className="text-[10px] text-white/40 font-mono">Multilingual classroom</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

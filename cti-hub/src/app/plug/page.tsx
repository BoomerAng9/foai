'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { PlugChrome } from '@/components/plug/PlugChrome';

export default function PlugPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F' }}>
      <PlugChrome
        title="aiPLUG & Play"
        tagline="Autonomous demo agents"
        icon={<Package className="w-5 h-5" />}
        backHref="/"
        backLabel="Home"
      />
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">
          Demo <span className="font-bold">Plugs</span>
        </h1>
        <p className="text-sm text-fg-tertiary font-mono mb-10">AI-powered solutions for every vertical</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { href: '/plug/sqwaadrun', name: 'The Sqwaadrun', desc: '17-Hawk web intelligence fleet', icon: '&#x1F985;', accent: '#F5A623', external: false },
            { href: 'https://perform.foai.cloud', name: 'Per|Form', desc: 'Sports grading & ranking', icon: '&#x1F3C8;', accent: '#E8A020', external: true },
            { href: '/aiplug/smb-marketing', name: 'Marketing Agency', desc: 'Research + strategy + content', icon: '&#x1F4C8;', accent: '#E8A020', external: false },
            { href: '/aiplug/finance-analyst', name: 'Finance Analyst', desc: 'Cash flow + budget + pricing', icon: '&#x1F4B0;', accent: '#E8A020', external: false },
            { href: '/aiplug/teacher-twin', name: 'Digital Twin Teacher', desc: 'Multilingual classroom', icon: '&#x1F393;', accent: '#E8A020', external: false },
          ].map(plug => (
            plug.external ? (
              <a key={plug.href} href={plug.href} target="_blank" rel="noopener noreferrer" className="border border-white/10 p-6 text-left transition-all hover:border-opacity-40" style={{ background: `${plug.accent}08`, borderColor: `${plug.accent}20` }}>
                <span className="text-2xl block mb-2" dangerouslySetInnerHTML={{ __html: plug.icon }} />
                <span className="text-sm font-bold block" style={{ color: plug.accent }}>{plug.name}</span>
                <span className="text-[10px] text-white/40 font-mono">{plug.desc}</span>
              </a>
            ) : (
              <Link key={plug.href} href={plug.href} className="border border-white/10 p-6 text-left transition-all hover:border-opacity-40" style={{ background: `${plug.accent}08`, borderColor: `${plug.accent}20` }}>
                <span className="text-2xl block mb-2" dangerouslySetInnerHTML={{ __html: plug.icon }} />
                <span className="text-sm font-bold block" style={{ color: plug.accent }}>{plug.name}</span>
                <span className="text-[10px] text-white/40 font-mono">{plug.desc}</span>
              </Link>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

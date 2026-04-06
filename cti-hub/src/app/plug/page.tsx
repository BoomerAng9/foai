'use client';

import Link from 'next/link';

export default function PlugPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">
          Demo <span className="font-bold">Plugs</span>
        </h1>
        <p className="text-sm text-white/40 font-mono mb-12">AI-powered solutions for every vertical</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { href: '/plug/sqwaadrun', name: 'The Sqwaadrun', desc: '17-Hawk web intelligence fleet', icon: '&#x1F985;', accent: '#F5A623' },
            { href: '/plug/perform', name: 'Per|Form', desc: 'Sports grading & ranking', icon: '&#x1F3C8;', accent: '#E8A020' },
            { href: '/plug/smb-marketing', name: 'Marketing Agency', desc: 'Research + strategy + content', icon: '&#x1F4C8;', accent: '#E8A020' },
            { href: '/plug/finance', name: 'Finance Analyst', desc: 'Cash flow + budget + pricing', icon: '&#x1F4B0;', accent: '#E8A020' },
            { href: '/plug/teacher', name: 'Digital Twin Teacher', desc: 'Multilingual classroom', icon: '&#x1F393;', accent: '#E8A020' },
          ].map(plug => (
            <Link key={plug.href} href={plug.href} className="border border-white/10 p-6 text-left transition-all hover:border-opacity-40" style={{ background: `${plug.accent}08`, borderColor: `${plug.accent}20` }}>
              <span className="text-2xl block mb-2" dangerouslySetInnerHTML={{ __html: plug.icon }} />
              <span className="text-sm font-bold block" style={{ color: plug.accent }}>{plug.name}</span>
              <span className="text-[10px] text-white/40 font-mono">{plug.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

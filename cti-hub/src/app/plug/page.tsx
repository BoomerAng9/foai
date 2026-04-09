'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PlugChrome } from '@/components/plug/PlugChrome';
import { Package } from 'lucide-react';

const plugs = [
  {
    href: '/plug/sqwaadrun',
    label: 'The Sqwaadrun',
    desc: '17-Hawk web intelligence fleet',
    image: '/plugs/sqwaadrun.webp',
    accent: '#F5A623',
  },
  {
    href: 'https://perform.foai.cloud',
    label: 'Per|Form',
    desc: 'Sports grading & ranking',
    image: '/plugs/perform.webp',
    accent: '#E8A020',
    external: true,
  },
  {
    href: '/aiplug/smb-marketing',
    label: 'Marketing Agency',
    desc: 'Research + strategy + content',
    image: '/plugs/smb-marketing.webp',
    accent: '#E8A020',
  },
  {
    href: '/aiplug/finance-analyst',
    label: 'Finance Analyst',
    desc: 'Cash flow + budget + pricing',
    image: '/plugs/finance.webp',
    accent: '#E8A020',
  },
  {
    href: '/aiplug/teacher-twin',
    label: 'Digital Twin Teacher',
    desc: 'Multilingual classroom',
    image: '/plugs/teacher.webp',
    accent: '#E8A020',
  },
];

export default function PlugPage() {
  return (
    <div className="min-h-screen bg-bg">
      <PlugChrome
        title="aiPLUG & Play"
        tagline="Autonomous demo agents — one click to launch"
        icon={<Package className="w-5 h-5" />}
        accentColor="#E8A020"
        backHref="/"
        backLabel="Home"
      />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-light tracking-tight text-fg mb-1">
          Demo <span className="font-bold">Plugs</span>
        </h1>
        <p className="text-sm text-fg-tertiary font-mono mb-10">AI-powered solutions for every vertical</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plugs.map((p) => {
            const card = (
              <div className="group border border-border hover:border-border-strong transition-all bg-bg-surface overflow-hidden">
                <div className="relative w-full h-36 bg-bg-elevated">
                  <Image
                    src={p.image}
                    alt={p.label}
                    fill
                    className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="p-4">
                  <span className="text-sm font-bold text-fg block">{p.label}</span>
                  <span className="text-[10px] text-fg-tertiary font-mono">{p.desc}</span>
                </div>
              </div>
            );
            return p.external ? (
              <a key={p.href} href={p.href} target="_blank" rel="noopener noreferrer">{card}</a>
            ) : (
              <Link key={p.href} href={p.href}>{card}</Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';

export default function MeetPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">
          Meet the <span className="font-bold">Team</span>
        </h1>
        <p className="text-sm text-white/40 font-mono mb-12">The workforce behind The Deploy Platform</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/meet/house-of-ang" className="border border-white/10 p-6 hover:border-[#E8A020]/40 transition-all" style={{ background: 'rgba(232,160,32,0.03)' }}>
            <span className="text-2xl block mb-2">&#x1F3E0;</span>
            <span className="text-sm font-bold text-[#E8A020] block">House of ANG</span>
            <span className="text-[10px] text-white/40 font-mono">12 Boomer_Angs</span>
          </Link>
          <Link href="/meet/chicken-hawk" className="border border-white/10 p-6 hover:border-[#E8A020]/40 transition-all" style={{ background: 'rgba(232,160,32,0.03)' }}>
            <span className="text-2xl block mb-2">&#x1F985;</span>
            <span className="text-sm font-bold text-[#E8A020] block">Chicken Hawk</span>
            <span className="text-[10px] text-white/40 font-mono">The Sqwaad</span>
          </Link>
          <Link href="/meet/the-tailor" className="border border-white/10 p-6 hover:border-[#E8A020]/40 transition-all" style={{ background: 'rgba(232,160,32,0.03)' }}>
            <span className="text-2xl block mb-2">&#x2702;&#xFE0F;</span>
            <span className="text-sm font-bold text-[#E8A020] block">The Tailor</span>
            <span className="text-[10px] text-white/40 font-mono">V.I.B.E. Shop</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

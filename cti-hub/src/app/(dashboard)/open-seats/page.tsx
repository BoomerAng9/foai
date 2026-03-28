'use client';

import { Search } from 'lucide-react';

export default function OpenSeatsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#00A3FF]/10 flex items-center justify-center text-[#00A3FF]">
          <Search className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Open Seats</h1>
          <p className="text-sm text-slate-500">Scraped university course data across the Savannah area.</p>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <p className="text-sm text-slate-400">Open Seat viewer wiring in next phase. Connects to Scout_Ang on Cloud Run.</p>
      </div>
    </div>
  );
}

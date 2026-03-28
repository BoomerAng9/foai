'use client';

import { TrendingUp } from 'lucide-react';

export default function EnrollmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#00A3FF]/10 flex items-center justify-center text-[#00A3FF]">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MindEdge Enrollments</h1>
          <p className="text-sm text-slate-500">Track affiliate links, campaigns, and enrollment revenue.</p>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <p className="text-sm text-slate-400">Enrollment tracking wiring in next phase. Connects to Edu_Ang on Cloud Run.</p>
      </div>
    </div>
  );
}

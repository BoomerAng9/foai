import Link from 'next/link';
import { ToolsNav } from '@/components/tools-nav';

export const metadata = {
  title: 'Tool Chest · Chicken Hawk',
  description: 'Operator surface for our Super Agent.',
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-foai-bg text-foai-text grid grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="hidden md:block bg-foai-surface/60 backdrop-blur border-r border-foai-border p-6">
        <Link href="/" className="flex items-center gap-3 mb-8">
          <span className="text-2xl text-foai-gold leading-none">⌬</span>
          <div>
            <div className="font-semibold tracking-wide">Chicken Hawk</div>
            <div className="text-[11px] uppercase tracking-wider text-foai-muted">Tool Chest · Operator</div>
          </div>
        </Link>
        <ToolsNav />
        <div className="mt-10 pt-6 border-t border-foai-border/50 text-xs text-foai-muted">
          Operator console · ACHIEVEMOR
        </div>
      </aside>
      <main className="px-6 py-10 md:px-10 md:py-12 max-w-5xl w-full">{children}</main>
    </div>
  );
}

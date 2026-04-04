'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getAnalyst } from '@/lib/analysts/personas';

interface Article {
  id: number;
  analyst_id: string;
  content_type: string;
  title: string;
  content: string;
  created_at: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="font-outfit text-lg font-bold text-white/90 mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-outfit text-xl font-bold text-white/90 mt-6 mb-3">$2</h2>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br/>');
}

export default function AnalystFeedPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const analyst = getAnalyst(name);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      try {
        const res = await fetch(`/api/analysts/${name}/feed`);
        const data = await res.json();
        setArticles(data.articles || []);
      } catch {
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, [name]);

  if (!analyst) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-outfit text-2xl font-bold text-white/60 mb-4">
              Analyst not found
            </h1>
            <Link
              href="/analysts"
              className="text-xs font-mono tracking-wider transition-colors hover:text-white/70"
              style={{ color: '#D4A853' }}
            >
              BACK TO ANALYST DESK
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      <main className="flex-1 px-6 py-16 max-w-3xl mx-auto w-full">
        {/* Back link */}
        <Link
          href="/analysts"
          className="inline-flex items-center gap-2 text-xs font-mono tracking-wider mb-10 transition-colors hover:text-white/70"
          style={{ color: '#D4A853' }}
        >
          &larr; ANALYST DESK
        </Link>

        {/* Analyst Header */}
        <div className="mb-12 pb-8" style={{ borderBottom: `2px solid ${analyst.color}` }}>
          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: analyst.color }}
            />
            <h1 className="font-outfit text-3xl md:text-4xl font-extrabold tracking-wide text-white">
              {analyst.name}
            </h1>
          </div>
          <p
            className="text-sm font-mono italic mb-1"
            style={{ color: analyst.color }}
          >
            {analyst.archetype}
          </p>
          <p className="text-xs font-mono text-white/40">
            {analyst.specialty}
          </p>
        </div>

        {/* Feed */}
        {loading && (
          <div className="flex items-center gap-3 py-12">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: analyst.color }}
            />
            <span className="text-sm font-mono text-white/30">Loading feed...</span>
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-lg font-outfit text-white/40 mb-2">
              Content publishing soon
            </p>
            <p className="text-xs font-mono text-white/20">
              Check back shortly
            </p>
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div className="space-y-16">
            {articles.map((article) => (
              <article key={article.id}>
                <div className="mb-4">
                  <span
                    className="text-[10px] font-mono tracking-widest font-bold uppercase"
                    style={{ color: analyst.color }}
                  >
                    {article.content_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-white/20 ml-3">
                    {formatDate(article.created_at)}
                  </span>
                </div>
                <h2 className="font-outfit text-xl md:text-2xl font-bold text-white/90 mb-6 leading-tight">
                  {article.title}
                </h2>
                <div
                  className="text-sm font-mono text-white/60 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: `<p class="mb-4">${renderMarkdown(article.content)}</p>` }}
                />
                <div
                  className="mt-8 h-px"
                  style={{ background: `linear-gradient(to right, ${analyst.color}33, transparent)` }}
                />
              </article>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

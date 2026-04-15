'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getAnalyst } from '@/lib/analysts/personas';
import { SpeakButton } from '@/components/analysts/SpeakButton';

const cardReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

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

function renderTextSegments(text: string): React.ReactNode[] {
  // Split by bold and italic markers, returning React elements
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Match bold first (**)
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Match italic (*)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

    const boldIndex = boldMatch?.index ?? Infinity;
    const italicIndex = italicMatch?.index ?? Infinity;

    if (boldIndex === Infinity && italicIndex === Infinity) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (boldIndex <= italicIndex && boldMatch) {
      if (boldMatch.index! > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index!)}</span>);
      }
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index! + boldMatch[0].length);
    } else if (italicMatch) {
      if (italicMatch.index! > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, italicMatch.index!)}</span>);
      }
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch.index! + italicMatch[0].length);
    }
  }

  return parts;
}

function SafeMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);
  return (
    <>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Heading h2
        const h2Match = trimmed.match(/^## (.+)$/m);
        if (h2Match) {
          return (
            <h2 key={i} className="font-outfit text-xl font-bold text-white/90 mt-6 mb-3">
              {renderTextSegments(h2Match[1])}
            </h2>
          );
        }

        // Heading h3
        const h3Match = trimmed.match(/^### (.+)$/m);
        if (h3Match) {
          return (
            <h3 key={i} className="font-outfit text-lg font-bold text-white/90 mt-6 mb-2">
              {renderTextSegments(h3Match[1])}
            </h3>
          );
        }

        // Regular paragraph — split internal single newlines into <br/>
        const lines = trimmed.split('\n');
        return (
          <p key={i} className="mb-4">
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {renderTextSegments(line)}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
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
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)' }}>
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)' }}>
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
              <motion.article
                key={article.id}
                variants={cardReveal}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="rounded-lg p-6"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderLeft: `3px solid ${analyst.color}`,
                }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="text-[10px] font-mono tracking-widest font-bold uppercase"
                    style={{ color: analyst.color }}
                  >
                    {article.content_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-white/20">
                    {formatDate(article.created_at)}
                  </span>
                  <span className="text-[10px] font-mono text-white/20 ml-auto">
                    {estimateReadTime(article.content)} min read
                  </span>
                </div>
                <h2 className="font-outfit text-xl md:text-2xl font-bold text-white/90 mb-4 leading-tight">
                  {article.title}
                </h2>
                <div className="mb-6">
                  <SpeakButton
                    analystId={analyst.id}
                    text={article.content}
                    color={analyst.color}
                    label="Play Podcast"
                  />
                </div>
                <div className="text-sm font-mono text-white/60 leading-relaxed">
                  <SafeMarkdown text={article.content} />
                </div>
                <div
                  className="mt-8 h-px"
                  style={{ background: `linear-gradient(to right, ${analyst.color}33, transparent)` }}
                />
              </motion.article>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

'use client';

// Renders Chicken Hawk's chat replies with proper markdown — code blocks
// formatted as monospace cards (light-theme palette), inline code, lists,
// tables, blockquotes. Plain text falls through unchanged.
//
// Code blocks include a one-click "Copy" button so visitors can grab the
// HTML/CSS/JS that CH produces.

import { useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

interface Props {
  text: string;
}

function CodeBlock({ children, lang }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard not available */
    }
  };
  return (
    <div className="relative my-3 rounded-lg border border-foai-border bg-foai-surface-2 overflow-hidden group">
      {lang && (
        <div className="px-3 py-1.5 border-b border-foai-border text-[11px] font-mono uppercase tracking-wider text-foai-muted bg-foai-surface flex items-center justify-between">
          <span>{lang}</span>
        </div>
      )}
      <button
        type="button"
        onClick={onCopy}
        className="absolute top-2 right-2 z-10 px-2 py-1 rounded text-[11px] font-medium bg-foai-surface border border-foai-border text-foai-muted hover:text-foai-text hover:border-foai-gold/50 transition-colors opacity-0 group-hover:opacity-100"
        title={copied ? 'Copied' : 'Copy'}
      >
        {copied ? <Check className="size-3.5 text-foai-gold" /> : <Copy className="size-3.5" />}
      </button>
      <pre className="px-4 py-3 overflow-x-auto text-[13px] leading-relaxed font-mono text-foai-text">
        <code className={lang ? `language-${lang}` : undefined}>{children}</code>
      </pre>
    </div>
  );
}

const components: Components = {
  code({ className, children, ...props }) {
    const inline = !(className && className.startsWith('language-'));
    if (inline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-foai-surface-2 text-foai-gold font-mono text-[0.92em] border border-foai-border"
          {...props}
        >
          {children}
        </code>
      );
    }
    const lang = (className ?? '').replace(/^language-/, '') || undefined;
    return <CodeBlock lang={lang}>{String(children).replace(/\n$/, '')}</CodeBlock>;
  },
  pre({ children }) {
    // react-markdown wraps fenced code in <pre><code>; we render the styled
    // CodeBlock at the <code> level instead, so let <pre> pass through
    // without adding extra padding/borders.
    return <>{children}</>;
  },
  a({ href, children, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foai-gold hover:underline underline-offset-2"
        {...props}
      >
        {children}
      </a>
    );
  },
  ul({ children }) {
    return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-2 border-l-2 border-foai-gold/60 pl-3 text-foai-muted italic">
        {children}
      </blockquote>
    );
  },
  h1: ({ children }) => <h1 className="text-lg font-semibold mt-3 mb-1.5 text-foai-text">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1.5 text-foai-text">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2.5 mb-1 text-foai-text">{children}</h3>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-foai-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider font-semibold text-foai-muted bg-foai-surface-2 border-b border-foai-border">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-3 py-2 border-b border-foai-border/60">{children}</td>,
  hr: () => <hr className="my-4 border-foai-border" />,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
};

export function MarkdownReply({ text }: Props) {
  return (
    <div className="text-[15px] text-foai-text leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

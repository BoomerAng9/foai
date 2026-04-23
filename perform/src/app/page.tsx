import fs from 'node:fs';
import path from 'node:path';
import Script from 'next/script';

/**
 * Per|Form homepage — serves the multi-league landing prototype.
 *
 * The canonical source-of-truth design lives at `public/landing/index.html`
 * (+ league-data.js + render.js). This page reads the HTML at build time
 * and strips its surrounding <html>/<head>/<body> wrappers so the
 * content composes cleanly under the Next.js root layout — we keep one
 * auth-cookie-aware layout, one set of global headers, one <Header> and
 * one <BreakingBar>/<NewsTicker> instead of doubling them up.
 *
 * The two JS files load via next/script with strategy="afterInteractive"
 * — league-data.js defines window.SEASON_PULSE + window.LEAGUE_DATA,
 * render.js wires them into the DOM and fetches live /api/players rows
 * (see public/landing/render.js :: fetchRealBoards).
 */

export const dynamic = 'force-static';
export const revalidate = 300;

function extractLandingBody(): { head: string; body: string } {
  const filePath = path.join(process.cwd(), 'public', 'landing', 'index.html');
  const raw = fs.readFileSync(filePath, 'utf8');

  // Pull out the contents between <body> ... </body>. We drop the two
  // trailing <script src="..."> tags — they load via next/script below
  // so Next can manage strategy + CSP instead of letting the HTML inject
  // them mid-stream.
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyInner = (bodyMatch ? bodyMatch[1] : raw)
    .replace(/<script\s+src=["']league-data\.js[^"']*["'][^>]*>\s*<\/script>/i, '')
    .replace(/<script\s+src=["']render\.js[^"']*["'][^>]*>\s*<\/script>/i, '')
    .trim();

  // Pull the <style> blocks + <link> font loads from <head> so the
  // landing's visual system applies. (Font preconnects are harmless if
  // duplicated with layout.tsx; the <style> block is the important one.)
  const headMatch = raw.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headInner = headMatch ? headMatch[1] : '';
  const styleBlock = (headInner.match(/<style[\s\S]*?<\/style>/i) || [''])[0];
  const fontLink = (headInner.match(/<link[^>]*fonts\.googleapis\.com[^>]*>/i) || [''])[0];
  const headPieces = [styleBlock, fontLink].filter(Boolean).join('\n');

  return { head: headPieces, body: bodyInner };
}

export default function HomePage(): React.JSX.Element {
  const { head, body } = extractLandingBody();

  return (
    <>
      {/* Landing <style> + Google Fonts link injected inline so the
          broadcast-style design system renders without a flash */}
      <div dangerouslySetInnerHTML={{ __html: head }} />
      {/* Landing body markup (top bar, season pulse, hero, grid, engine
          rail, built-for, pipeline, tweaks panel) */}
      <div dangerouslySetInnerHTML={{ __html: body }} />
      {/* league-data.js must run before render.js — next/script preserves
          declaration order when both use the same strategy */}
      <Script src="/landing/league-data.js?v=3" strategy="afterInteractive" />
      <Script src="/landing/render.js?v=4" strategy="afterInteractive" />
    </>
  );
}

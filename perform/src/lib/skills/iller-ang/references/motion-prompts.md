# Motion Prompts Library — Iller_Ang

## How to Use These Prompts

Each prompt below is a complete, structured directive designed to be pasted into Claude, Cursor, Lovable, or any AI coding tool. They produce production-grade React + Tailwind artifacts with cinematic animation.

**Stack for all prompts**: React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui + Framer Motion (or CSS keyframes for HTML-only)

**Shared dependencies** (include in all):
```
@fontsource/geist-sans (weights 400, 500, 600, 700)
@fontsource/bebas-neue (sports display)
lucide-react (icons)
framer-motion (animation)
```

---

## PROMPT 1: Sports Trading Card Showcase — NFT Mint Page

**Vertical**: Sports / NFT / Web3
**Inspired by**: Player cards (Zion Risher Comets, Syracuse DL, Colorado Baseball), holographic pass cards

```
Build a dark-themed NFT mint landing page for a fictional sports card collection called "GRIDIRON LEGENDS" — premium digital trading cards for college football prospects. The design uses a holographic/prismatic aesthetic with ultra-dark backgrounds, iridescent glassmorphic card previews, and magenta/cyan accent colors.

GLOBAL DESIGN SYSTEM
Font: Geist Sans (install @fontsource/geist-sans, weights 400, 500, 600, 700). Sports display: Bebas Neue for card names and stats. Apply via font-family on body.
Colors as CSS variables:
  --background: #050507
  --foreground: #E8E8E9
  --accent-magenta: #FF00FF
  --accent-cyan: #00F0FF
  --accent-gold: #FFD700
  --glass-bg: rgba(255,255,255,0.04)
  --glass-border: rgba(255,255,255,0.08)
Border radius: 1.5rem for cards, 0.75rem for buttons, 9999px for pills.
Grain overlay: pseudo-element with SVG noise filter at opacity 0.03 on body.

SECTION 1: NAVBAR
Fixed top, z-50, bg-background/80 backdrop-blur-xl border-b border-glass-border.
Left: "GRIDIRON LEGENDS" wordmark in Bebas Neue, letter-spacing 0.1em, text-accent-gold.
Center: nav links "Collection" | "Mint" | "Rarity" | "Roadmap" in text-foreground/60 text-sm, hover:text-foreground transition.
Right: "Connect Wallet" button — liquid-glass background, border-accent-cyan/30, text-accent-cyan, hover:bg-white/[0.06], rounded-full px-6 py-2.
Below navbar: full-width 1px gradient divider from-transparent via-foreground/15 to-transparent.

SECTION 2: HERO
Full viewport height, relative overflow-hidden.
Background: animated gradient mesh — two radial gradients (magenta at 20% opacity top-left, cyan at 15% opacity bottom-right) slowly rotating via CSS animation (60s infinite linear).
Center content: flex flex-col items-center justify-center gap-8.
Badge: pill shape, liquid-glass, text "SERIES 1 — NOW MINTING" in text-xs uppercase tracking-widest text-accent-gold, with a pulsing dot indicator.
Headline: "Collect The" on line 1 in text-foreground/60 text-2xl, then "Future Legends" in text-[120px] md:text-[180px] font-normal leading-none tracking-tight, Bebas Neue, with background-clip:text transparent + linear-gradient from accent-gold via white to accent-gold.
Subtext: "Premium holographic digital trading cards. Each card is a unique NFT with verifiable stats, rarity tiers, and on-chain ownership." max-w-lg text-center text-foreground/50 text-lg leading-relaxed.
CTA row: Two buttons side by side gap-4.
  Button 1: "Mint Now — 0.08 ETH" — bg-accent-gold text-background font-semibold px-8 py-4 rounded-full, hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transition.
  Button 2: "View Collection" — liquid-glass border-accent-cyan/20 text-accent-cyan px-8 py-4 rounded-full.
Below CTAs: Stats row — three items inline, separated by vertical dividers: "2,847 / 5,000 Minted" | "142 Holders" | "0.12 ETH Floor" — text-foreground/40 text-sm.

SECTION 3: FEATURED CARDS — Horizontal Scroll
py-32, overflow-x visible for dramatic card presentation.
Section header: "Featured Prospects" in Bebas Neue text-5xl text-center, with a gradient underline bar (gold→magenta→cyan, h-1, w-32, mx-auto, rounded-full).
Card row: flex gap-8 justify-center, perspective: 1000px on container.
Each card (show 3-5):
  Outer wrapper: w-[300px] h-[420px], preserve-3d, hover:rotateY(5deg) rotateX(-3deg) transition-transform duration-500.
  Card face: rounded-3xl overflow-hidden relative.
  Holographic border: 2px animated border using conic-gradient(from var(--angle), #FF00FF, #00F0FF, #FFD700, #FF00FF) with @property --angle animating 0deg→360deg over 3s.
  Card interior: bg-gradient-to-b from-[#0a0a0f] to-[#12121a].
  Top 60%: Player image zone — dark gradient overlay from transparent to card-bg at bottom. Use placeholder gradient silhouette.
  Player name: Bebas Neue text-2xl text-foreground, absolute bottom of image zone.
  Stats grid: 2x2 grid below image, each stat in liquid-glass rounded-xl p-3 — "SPD 94" | "STR 87" | "AGI 91" | "AWR 88" — number in text-accent-gold text-xl font-bold, label in text-foreground/40 text-xs uppercase.
  Bottom bar: team name left in text-xs text-foreground/30, rarity badge right — "LEGENDARY" in text-xs uppercase, bg-accent-gold/20 text-accent-gold px-2 py-0.5 rounded-full.
  Shimmer effect: pseudo-element absolute inset-0, bg-gradient-to-br from-transparent via-white/5 to-transparent, animate-shimmer (translateX -100% to 100% over 3s, infinite).

SECTION 4: RARITY BREAKDOWN
py-32, max-w-5xl mx-auto.
Header: "Rarity Tiers" centered, Bebas Neue text-5xl.
Five tier cards in a horizontal row, each liquid-glass rounded-2xl p-8 text-center.
  Mythic (1%): border-accent-gold/40, glow shadow gold, "👑" emoji large.
  Legendary (4%): border-accent-magenta/30, glow magenta.
  Rare (10%): border-accent-cyan/30, glow cyan.
  Uncommon (25%): border-foreground/10, subtle.
  Common (60%): border-foreground/5, minimal.
Each shows: tier name in respective accent color, percentage, and a short description.

SECTION 5: MINT INTERFACE
py-32, centered max-w-md.
Large liquid-glass card, rounded-3xl p-8.
Header: "Mint Your Card" in Bebas Neue text-3xl.
Supply bar: progress bar showing 2847/5000, gradient fill gold→magenta, bg-foreground/5 rounded-full h-3.
Price display: "0.08 ETH" large, "≈ $245.00" smaller below in text-foreground/40.
Quantity selector: - / number / + buttons, liquid-glass, inline.
Mint button: full width, bg-gradient-to-r from-accent-gold via-accent-magenta to-accent-cyan, text-background font-bold text-lg py-4 rounded-full, hover:shadow-[0_0_40px_rgba(255,0,255,0.3)].
Below: "Connect wallet to mint" helper text in text-foreground/30 text-sm.

SECTION 6: FOOTER
py-16, border-t border-glass-border.
Left: "GRIDIRON LEGENDS" wordmark.
Center: links "Twitter" | "Discord" | "OpenSea" in text-foreground/30, hover:text-foreground.
Right: "© 2026 ACHIEVEMOR" in text-foreground/20.

ANIMATIONS
Page load: sections stagger in with opacity 0→1, translateY 30→0, delay increases per section (0.1s increments).
Cards: floating animation — translateY 0→-8px→0 over 4s, each card offset by 0.5s.
Holographic border: continuous rotation of conic-gradient angle.
Shimmer: continuous diagonal sweep across card faces.
Gradient mesh: slow 60s rotation in hero background.
Scroll: IntersectionObserver triggers fade-up for each section at threshold 0.15.

RESPONSIVE
Mobile: cards stack vertically, headline drops to text-[72px], rarity tiers become 2-column grid then single column, mint card goes full-width with px-4 margins. All hover effects become tap-friendly with active states.
```

---

## PROMPT 2: Sneaker / Product Drop Showcase

**Vertical**: E-Commerce / Streetwear / Product Launch
**Inspired by**: Jordan 6 Infrared image, merchandise displays

```
Build a dark, cinematic product launch page for a fictional sneaker brand called "SOLE PROTOCOL" — a Web3-native sneaker collective. The aesthetic is luxury streetwear meets cyberpunk: ultra-dark backgrounds, dramatic product photography lighting, and infrared/red accent colors.

GLOBAL DESIGN SYSTEM
Font: 'Clash Display' from CDN (or fallback Bebas Neue). Body: Geist Sans.
Colors:
  --background: #0a0a0a
  --foreground: #f5f5f5
  --accent-infrared: #FF3366
  --accent-ice: #B8E0F0
  --glass-bg: rgba(255,255,255,0.03)
  --glass-border: rgba(255,255,255,0.06)
Grain overlay: subtle noise at 0.02 opacity.

HERO SECTION
Full viewport, split layout: left 55% content, right 45% product.
Left side:
  Small "DROP 001" pill badge, liquid-glass, pulsing red dot, text-accent-infrared text-xs uppercase tracking-[0.3em].
  Headline: "AIR" in text-[200px] Clash Display font-bold, text-foreground, then "PROTOCOL" on next line in same size but text-accent-infrared. Letters should have a subtle text-shadow glow in infrared.
  Subtext: "Limited to 300 pairs. Each pair comes with a paired NFT for authentication and resale royalties." text-foreground/50 text-lg max-w-md.
  Price: "0.5 ETH / $1,520" in text-foreground text-3xl font-bold.
  CTA: "Reserve Pair" — large button, bg-accent-infrared text-background rounded-none px-12 py-5 font-bold uppercase tracking-wider. Hover: shadow-[0_0_40px_rgba(255,51,102,0.5)].
  Below CTA: countdown timer "DROP IN 02:14:33:07" in monospace, text-foreground/30.
Right side:
  Large sneaker placeholder zone — dark gradient background with a spotlight cone (radial-gradient from white/5% center to transparent), as if the shoe is lit from above.
  Floating animation: shoe zone gently rotates Y-axis 5deg back and forth, translateY bobs 10px, over 6s ease-in-out infinite.
  Particle effect: tiny white dots (8-12) float upward around the product zone with varying speeds and opacity, simulating dust in a spotlight.

FEATURE STRIP
Horizontal bar below hero, bg-foreground/[0.02] py-6, border-y border-glass-border.
Four features inline with dividers: "🔗 NFT-Paired Authentication" | "🏭 300 Units Only" | "💰 Resale Royalties Built-In" | "📦 Physical + Digital Drop"
All in text-foreground/40 text-sm uppercase tracking-wider. Icons are emoji, not imported.

PRODUCT DETAIL SECTION
py-32, max-w-6xl, grid lg:grid-cols-2 gap-20.
Left: Product image zone with 4 thumbnail selectors below (different angles). Active thumbnail has infrared border. Click switches main image zone (use state).
Right: Product details stack:
  Name: "SP-6 INFRARED" in Clash Display text-4xl.
  Colorway: "Black / Infrared / Ice Blue" in text-foreground/40.
  Description paragraph in text-foreground/60 leading-relaxed.
  Size selector: horizontal row of liquid-glass pills (7-13), selected gets bg-accent-infrared text-background.
  "Add to Vault" button — full width, same infrared styling as hero CTA.
  Authenticity badge: liquid-glass card with chain icon, "NFT Certificate Included" text, contract address preview in mono.

COLLECTION GRID
py-32, "More from the Vault" header.
4-column grid of product cards, each liquid-glass rounded-2xl.
  Product image zone (dark gradient placeholder), name, price, "SOLD OUT" or "AVAILABLE" badge.
  Hover: scale 1.02, border transitions to infrared/20, shadow glow.

FOOTER
Minimal, py-16. Brand name left, socials center, "Powered by ACHIEVEMOR" right in text-foreground/15.

ANIMATIONS
Hero headline: letters stagger in from bottom, 40ms delay per character.
Product float: continuous Y-bob + subtle Y-rotation.
Particles: CSS @keyframes floating upward with random horizontal drift.
Section reveals: scroll-triggered fade-up with 0.1s stagger.
Size pills: tap/click triggers a subtle scale bounce (0.95→1.05→1).
```

---

## PROMPT 3: Sports Podcast / Media Hub

**Vertical**: Podcast / Media / Sports Content
**Inspired by**: AIR P.O.D. studio image, ESPN broadcast graphics

```
Build a dark-themed landing page for "AIR P.O.D." — a premium sports podcast network. The design channels ESPN broadcast studio energy: dark backgrounds, purple/blue ambient lighting, bold 3D-style typography, and a professional broadcast feel.

GLOBAL DESIGN SYSTEM
Font: Bebas Neue for display/headlines, Geist Sans for body.
Colors:
  --background: #08080C
  --foreground: #E8E8E9
  --accent-purple: #6B5CE7
  --accent-blue: #3B82F6
  --ambient-glow: rgba(107,92,231,0.15)
  --glass-bg: rgba(255,255,255,0.04)
  --glass-border: rgba(255,255,255,0.08)

HERO SECTION
Full viewport, centered content, background has a radial-gradient spotlight effect (accent-purple at 20% opacity in center) plus subtle animated noise.
Logo/wordmark: "AIR" in Bebas Neue text-[160px] text-foreground, "P.O.D." below in same size but text-accent-purple. Both with text-shadow: 0 0 60px rgba(107,92,231,0.4).
Tagline: "Where the Game Speaks" in text-foreground/40 text-xl uppercase tracking-[0.4em].
Two CTAs: "Listen Now" (bg-accent-purple text-foreground px-10 py-4 rounded-full font-bold) and "Subscribe" (liquid-glass border-accent-purple/30 text-accent-purple).
Below: audio waveform visualization — a row of 40+ thin vertical bars of varying heights, animated with a wave-like oscillation using CSS animation delays. Bars are accent-purple with lower opacity on shorter bars.

LATEST EPISODES SECTION
py-32, "Latest Episodes" in Bebas Neue text-5xl centered.
3-column grid of episode cards, each liquid-glass rounded-2xl p-6:
  Top: episode number badge ("EP. 47") in accent-purple pill.
  Title: Bebas Neue text-2xl text-foreground.
  Guest line: "with [Guest Name]" in text-foreground/40.
  Description: 2 lines, text-foreground/50 text-sm, line-clamp-2.
  Bottom row: duration "1:23:45" left, play button right — circular bg-accent-purple w-10 h-10 with play triangle icon.
  Hover: card lifts (translateY -4px), border lightens, play button pulses.

HOSTS SECTION
py-32, two large cards side by side (or stacked mobile).
Each card: liquid-glass rounded-3xl, interior has a subtle purple radial glow behind the "host image zone."
  Image zone: dark gradient placeholder with silhouette, aspect-square rounded-2xl.
  Name: Bebas Neue text-3xl.
  Role: "Co-Host & Lead Analyst" in text-foreground/40.
  Bio: 3-4 lines in text-foreground/50.
  Social icons row: Twitter, Instagram, YouTube — text-foreground/30 hover:text-accent-purple.

STATS SECTION
py-24, horizontal row of 4 stats, no cards, just large numbers:
  "2.4M+" Downloads | "180+" Episodes | "50K+" Subscribers | "#1" Sports Pod NJ
  Numbers in Bebas Neue text-7xl text-accent-purple, labels in text-foreground/30 text-sm uppercase.
  Each stat animates counting up from 0 on scroll entry (use state + IntersectionObserver).

NEWSLETTER CTA
py-24, centered max-w-lg.
Liquid-glass card rounded-3xl p-8.
  Headline: "Never Miss an Episode" in Bebas Neue text-3xl.
  Input + button inline: email input (bg-transparent border-b border-foreground/20, text-foreground) and "Subscribe" button (bg-accent-purple rounded-full px-6).

FOOTER
py-16. "AIR P.O.D." left. Platform links center: "Spotify | Apple | YouTube | RSS". "A ACHIEVEMOR Production" right.

ANIMATIONS
Waveform: continuous bar height oscillation with staggered delays.
Stats: count-up animation triggered by scroll.
Episode cards: stagger fade-in on scroll.
Hero text: scale 0.9→1 with opacity 0→1 on load, 0.5s duration.
Play buttons: pulse ring animation on hover (expanding circle at low opacity).
```

---

## PROMPT 4: Football Recruiting & Team Portal

**Vertical**: Sports Recruiting / Team Branding
**Inspired by**: Hillside All-Conference graphic, On3 RPM prediction, Read & React broadcast

```
Build a dark, high-energy recruiting portal landing page for a fictional high school football program called "HILLSIDE COMETS." The design channels the intensity of On3/247Sports recruiting graphics with team branding, player showcase, and commitment announcements.

GLOBAL DESIGN SYSTEM
Font: Bebas Neue display, Geist Sans body.
Colors (Hillside Comets brand):
  --background: #0C0A0F
  --foreground: #E8E8E9
  --team-primary: #6B1D3A (maroon)
  --team-secondary: #C0C0C0 (silver)
  --accent-gold: #FFD700
  --glass-bg: rgba(107,29,58,0.08)
  --glass-border: rgba(107,29,58,0.15)

HERO SECTION
Full viewport, dramatic.
Background: layered — dark base, team-primary radial gradient at 10% opacity centered, subtle diagonal lines pattern (45deg, team-secondary at 2% opacity, 1px lines, 40px gap).
Left content (60%):
  Team badge: Comets logo placeholder — comet icon (lucide-react) in team-primary with a streaking tail effect (gradient line trailing behind), inside a liquid-glass circle w-16 h-16.
  Headline: "HILLSIDE" in Bebas Neue text-[140px] text-team-secondary leading-none, "COMETS" below in same size text-team-primary. Both with metallic text effect via background-clip:text + linear-gradient(to bottom, team-secondary, team-secondary/60).
  Tagline: "CONFERENCE CHAMPIONS · PATRIOT SILVER" in text-xs uppercase tracking-[0.5em] text-accent-gold.
  Stats bar: inline flex — "7-0 Conference" | "11-1 Overall" | "#3 State Ranking" — each in liquid-glass pill, text-sm.
  CTA: "View Roster" button — bg-team-primary text-foreground rounded-none px-10 py-4 uppercase tracking-wider font-bold, hover:shadow-[0_0_30px_rgba(107,29,58,0.5)].
Right (40%):
  Featured player zone — large dark gradient silhouette placeholder, dramatic uplight (radial-gradient from team-primary/20 at bottom), maroon vignette edges. Floating bob animation.

ALL-CONFERENCE SECTION
py-32, "1ST TEAM ALL-CONFERENCE" in Bebas Neue text-5xl centered, with gold accent underline.
Grid of 7 player cards in responsive layout (4-col desktop, 2-col tablet, 1-col mobile).
Each card: liquid-glass rounded-2xl, team-primary border on hover.
  Image zone: dark gradient placeholder, aspect-[3/4].
  Name: Bebas Neue text-xl text-foreground.
  Position: text-team-secondary text-sm uppercase.
  Jersey number: absolute top-right of image zone, text-4xl Bebas Neue text-team-primary/30.
  Hover: scale 1.03, border-team-primary/40, glow shadow.

PLAYER SPOTLIGHT / COMMITMENT CARD
py-32, centered max-w-2xl.
Large liquid-glass card rounded-3xl p-0 overflow-hidden.
  Top half: player image zone with diagonal team-color gradient overlay.
  Overlay text: "NEW PREDICTION" in accent-gold pill badge, animated pulse.
  Star rating: "★★★★" in accent-gold, "| QB" in text-foreground/40.
  Player name: Bebas Neue text-4xl.
  School prediction: large school logo placeholder with "65% CONFIDENCE" progress bar below, fill in accent-gold.
  Source credit: small text "Via Recruiting Prediction Engine" at bottom.

SCHEDULE SECTION
py-32, "2024 SEASON" header.
Vertical timeline of games:
  Each game: liquid-glass card inline with date left, matchup center ("Comets vs. Opponents"), score right.
  Wins: border-left-4 border-accent-gold. Losses: border-left-4 border-red-500/30.
  Upcoming games: border-left-4 border-team-primary/50, "UPCOMING" badge.

NEWSLETTER/RECRUIT CTA
py-24, "INTERESTED IN PLAYING FOR THE COMETS?" in Bebas Neue text-4xl centered.
Subtext about recruiting process.
"Submit Interest Form" button — bg-team-primary.

FOOTER
py-16. Comets branding left. "Powered by ACHIEVEMOR Sports" right.

ANIMATIONS
Hero player: floating bob + subtle left-right sway.
Conference cards: stagger cascade on scroll (left to right wave).
Spotlight card: entrance with scale 0.9→1 + blur 4px→0.
Timeline: each game card slides in from alternating left/right on scroll.
Star rating: stars fill in sequence with 0.15s delay each.
```

---

## PROMPT 5: Web3 Domain & Blockchain Identity

**Vertical**: Web3 / Blockchain / Domain Registration
**Inspired by**: .byachievemor domain registration image, Digital Money 2.0 word cloud, holographic pass card

```
Build a cyberpunk-themed landing page for ".BYACHIEVEMOR" — a blockchain domain registration service built on the ACHIEVEMOR protocol. The design is full cyberpunk: circuit board textures, holographic card previews, neon glows, and a dark matrix-inspired atmosphere.

GLOBAL DESIGN SYSTEM
Font: 'Orbitron' for display (futuristic geometric), Geist Sans for body.
Colors:
  --background: #03030A
  --foreground: #E0E0E4
  --neon-cyan: #00F0FF
  --neon-magenta: #FF00FF
  --neon-green: #00FF88
  --circuit-line: rgba(0,240,255,0.06)
  --glass-bg: rgba(0,240,255,0.03)
  --glass-border: rgba(0,240,255,0.08)
Background texture: repeating circuit-board pattern using CSS — thin lines forming a grid with occasional node circles at intersections, all in circuit-line color. Subtle animation: random nodes pulse brighter periodically.

HERO SECTION
Full viewport, centered.
Background: circuit texture base + floating particle field (tiny cyan dots drifting slowly, 30-50 particles) + two large blurred orbs (cyan top-left, magenta bottom-right, 30% viewport size, opacity 0.08).
Center content:
  Badge: "POWERED BY ACHIEVEMOR PROTOCOL" in liquid-glass pill, text-neon-cyan text-xs tracking-[0.4em].
  Headline: ".BYACHIEVEMOR" in Orbitron text-[80px] md:text-[120px] font-bold, text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-cyan, animate: background-size 200% with position sliding left-right over 4s.
  Subtext: "Your identity on the blockchain. Register your .byachievemor domain and own your digital presence forever." text-foreground/40 max-w-lg text-center text-lg.
  Search input: large centered input group — liquid-glass rounded-full, input "yourdomain" left side, ".byachievemor" fixed suffix in neon-cyan, "Search" button right side bg-neon-cyan text-background rounded-full px-8 font-bold. Full width max-w-xl.
  Below input: "Starting at 0.01 ETH / year" in text-foreground/20 text-sm.

DOMAIN CARD PREVIEW SECTION
py-32, "Your Domain, Your Card" header in Orbitron text-4xl.
Centered large holographic domain card (400x250):
  Outer frame: rounded-2xl, animated holographic border (conic-gradient rotation).
  Interior: bg-gradient-to-br from-[#0a0a1a] to-[#0f0f2a].
  Top-left: "YOUR LOGO" placeholder text in neon-cyan.
  Top-right: "PASS CARD" badge in neon-green pill.
  Center: Large domain "acheevy.byachievemor" in Orbitron text-xl text-foreground.
  Below: "ID NUMBER: 054810" | "PERMITTED: 300" in text-foreground/30 mono text-xs.
  Bottom: "SPECIAL ACCESS" in neon-green, QR code placeholder (grid of small squares), barcode line.
  Card floats and gently tilts on mouse position (or auto-tilts on mobile cycle).
  Holographic shimmer overlay: diagonal gradient sweep.

FEATURES SECTION
py-32, 3-column grid.
Each feature: liquid-glass rounded-2xl p-8.
  Icon: large Orbitron single character or lucide icon in neon-cyan, w-12 h-12 flex items-center justify-center rounded-xl bg-neon-cyan/10.
  Feature 1: "On-Chain Ownership" — Your domain is an NFT. Transfer, sell, or hold forever.
  Feature 2: "Universal Identity" — One name across DeFi, social, and payments.
  Feature 3: "Subdomain Control" — Issue subdomains: team.you.byachievemor.
  Feature 4: "Token-Gated Access" — Gate content, communities, and tools by domain ownership.
  Feature 5: "Human-Readable Wallet" — Replace 0x... addresses with your name.
  Feature 6: "ACHIEVEMOR Ecosystem" — Native integration with all ACHIEVEMOR tools and agents.
  Hover: border-neon-cyan/20, shadow-[0_0_20px_rgba(0,240,255,0.1)], icon glow.

PRICING SECTION
py-32, "Register Your Domain" centered.
3 pricing cards side by side:
  Basic (3-char): 0.1 ETH — liquid-glass, neon-green accent.
  Standard (4-7 char): 0.03 ETH — liquid-glass, neon-cyan accent, "POPULAR" badge.
  Extended (8+ char): 0.01 ETH — liquid-glass, foreground/20 accent.
  Each: character length, price, renewal rate, features list, "Register" button in respective accent color.

LIVE REGISTRATIONS FEED
py-24, horizontal scrolling marquee.
"acheevy.byachievemor registered 2m ago" | "vortex.byachievemor registered 5m ago" | etc.
Continuous smooth scroll, text-foreground/20 text-sm, with neon-cyan dot before each entry.

FOOTER
Circuit-board pattern continues. Links and ACHIEVEMOR branding. "Autoforming the Blockchain" tagline.

ANIMATIONS
Particle field: CSS or lightweight canvas, 30-50 particles drifting.
Headline gradient: sliding background-position animation.
Domain card: auto-tilt rotation cycle (rotateY -5 to 5, rotateX -3 to 3, 8s ease).
Holographic border: continuous conic-gradient rotation.
Circuit nodes: random pulse (opacity 0.06→0.2→0.06) at staggered intervals.
Registrations feed: infinite marquee scroll.
Search input: focus triggers glow ring animation (box-shadow expand in neon-cyan).
```

---

## PROMPT 6: Digital Currency / Fintech Hub

**Vertical**: Fintech / Crypto / Digital Economy
**Inspired by**: Digital Money 2.0 word cloud image

```
Build a premium fintech landing page for "DIGITAL MONEY 2.0" — a next-generation payment protocol by ACHIEVEMOR. The aesthetic is institutional fintech meets Web3: ultra-clean dark interface, data-dense yet elegant, with teal/blue accent colors and subtle grid patterns.

GLOBAL DESIGN SYSTEM
Font: Geist Sans all weights. Mono: Geist Mono for numbers/data.
Colors:
  --background: #06080C
  --foreground: #E2E4E8
  --accent-teal: #00D4AA
  --accent-blue: #3B82F6
  --data-green: #00FF88
  --data-red: #FF4444
  --glass-bg: rgba(0,212,170,0.03)
  --glass-border: rgba(0,212,170,0.08)

HERO SECTION
Full viewport, asymmetric layout.
Background: subtle dot-grid pattern (2px dots, 32px gap, foreground/3 opacity) + single large blurred teal orb right side.
Left (55%):
  Badge: "PROTOCOL V2.0 — LIVE ON MAINNET" in glass pill.
  Headline: "Money," line 1 in text-[100px] font-light text-foreground, "Reimagined." line 2 in same size but font-bold text-accent-teal.
  Paragraph: "Programmable payments, instant settlement, zero intermediaries. Digital Money 2.0 is the financial infrastructure layer for the autonomous economy."
  CTA: "Explore Protocol" — bg-accent-teal text-background, and "Read Whitepaper" — glass button.
Right (45%):
  Animated word cloud — 20+ finance terms ("P2P", "BITCOIN", "EXCHANGE", "DECENTRALIZED", "TRADING", "BANKING", "CURRENCY", "PROFITABILITY", etc.) floating in 3D space, varying sizes (text-lg to text-4xl), varying opacities (0.1 to 0.5), slowly drifting and rotating. The word "DIGITAL MONEY" largest and brightest at center. Use CSS transforms and animations for positions.

LIVE DATA STRIP
py-6, bg-foreground/[0.02], border-y border-glass-border.
Horizontal scroll of live data: "BTC $94,521 ↑2.3%" | "ETH $3,211 ↑1.1%" | "DM2.0 $0.84 ↑14.7%" | "TVL $2.4B" | "TPS 12,400"
Numbers in Geist Mono, positive=data-green, negative=data-red. Marquee scroll.

FEATURES as "Protocol Layers"
py-32, 4 large cards in 2x2 grid.
Each card: glass, rounded-2xl, p-8.
  Layer 1: "Settlement Layer" — instant finality, sub-second confirmation.
  Layer 2: "Identity Layer" — .byachievemor domain-based KYC-less verification.
  Layer 3: "Programmable Layer" — smart contract payment flows, escrow, splits.
  Layer 4: "Agent Layer" — AI agents execute financial operations autonomously.

METRICS DASHBOARD PREVIEW
py-32, centered glass card max-w-4xl, simulated dashboard:
  Top bar: "PROTOCOL DASHBOARD" with green status dot.
  Grid: total value locked (large number, counting up), daily transactions (chart placeholder — simple bar chart using CSS), active agents count, average settlement time "0.4s".
  This section should look like a screenshot of a real dashboard — data-dense, mono font numbers, subtle grid lines.

CTA
"Build on Digital Money 2.0" centered, "Get API Keys" button.

FOOTER
Minimal, institutional. Protocol links, ACHIEVEMOR branding, legal text.

ANIMATIONS
Word cloud: continuous drift with varying speeds and directions per word.
Data strip: marquee scroll.
Metrics: count-up on scroll entry.
Dashboard: subtle pulse on status indicators.
```

---

## PROMPT 7: Team Merchandise / Apparel Store

**Vertical**: E-Commerce / Sports Apparel
**Inspired by**: NFL Crucial Catch merchandise, team uniform concepts (green camo football uniform)

```
Build a dark e-commerce landing page for "ACHIEVEMOR ATHLETICS" — a sports apparel brand specializing in team merchandise with unique design treatments (camo, tie-dye, cause-themed collections). The aesthetic is Nike/NFL Shop quality: clean product photography emphasis, minimal UI, and bold team colors.

GLOBAL DESIGN SYSTEM
Font: Bebas Neue display, Geist Sans body.
Colors:
  --background: #0A0A0A
  --foreground: #F5F5F5
  --accent-multicolor: linear-gradient(135deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #9B59B6)
  --glass-bg: rgba(255,255,255,0.03)
  --glass-border: rgba(255,255,255,0.06)

HERO
Full width, "CRUCIAL COLLECTION — INTERCEPT CANCER" campaign header.
Hero product image zone — two jersey silhouettes flanking a hat, dramatic dark background with multicolor diagonal stripes from bottom-right.
"Shop the Collection" CTA.

PRODUCT GRID
py-32, filterable by team, category, size.
Filter bar: horizontal pills for teams (All, Chiefs, Eagles, Bears, etc.).
Product cards: clean, minimal — image top (dark bg), name, price, "Add to Cart" on hover reveal.
Quick-view modal on click: larger image, size selector, add to cart.

FEATURED COLLECTION
Full-width hero banner mid-page: camo-themed collection for a fictional team, showing uniform concept with matching merchandise. Bold "WARRIOR COLLECTION" headline.

FOOTER with newsletter signup.

ANIMATIONS
Product cards: hover lift + shadow increase.
Filter pills: active state slides underline indicator.
Quick-view: modal slides up from bottom with backdrop blur.
Hero stripes: slow diagonal drift animation.
```

---

## Usage Notes

Each prompt is self-contained and ready to paste. For ACHIEVEMOR-branded pages, always use the shared design tokens from the SKILL.md Design System section. For client/vertical work, adapt the color tokens to match the brand.

When building multiple pages for the same vertical (e.g., a full sports site), extract the shared design system into a `theme.css` or Tailwind config and reference it across pages for consistency.

Iller_Ang should always verify:
1. No generic AI slop — every page must have a distinct, premium visual identity
2. Animations are performant — 60fps, no layout thrash
3. Responsive — mobile-first, tested at 375px and 768px breakpoints
4. Accessible — proper contrast ratios, keyboard navigation, aria labels on interactive elements
5. Production-ready — no placeholder TODOs, no broken layouts, deployable as-is

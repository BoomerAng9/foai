# Design Tokens Reference — Iller_Ang

## Core ACHIEVEMOR Tokens

```css
:root {
  /* Backgrounds */
  --bg-void: #030305;
  --bg-dark: #050507;
  --bg-base: #0a0a0f;
  --bg-elevated: #12121a;
  --bg-surface: #1a1a24;
  
  /* Foregrounds */
  --fg-primary: #E8E8E9;
  --fg-secondary: #A0A0A8;
  --fg-muted: #6B6B75;
  --fg-ghost: #3A3A44;
  
  /* Brand */
  --brand-magenta: #FF00FF;
  --brand-cyan: #00F0FF;
  --brand-gold: #FFD700;
  --brand-green: #00FF88;
  
  /* Glass */
  --glass-bg: rgba(255,255,255,0.04);
  --glass-bg-hover: rgba(255,255,255,0.06);
  --glass-border: rgba(255,255,255,0.08);
  --glass-border-hover: rgba(255,255,255,0.12);
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
  --shadow-md: 0 8px 32px rgba(0,0,0,0.4);
  --shadow-lg: 0 16px 64px rgba(0,0,0,0.5);
  --shadow-glow-magenta: 0 0 30px rgba(255,0,255,0.3);
  --shadow-glow-cyan: 0 0 30px rgba(0,240,255,0.3);
  --shadow-glow-gold: 0 0 30px rgba(255,215,0,0.3);
  
  /* Radii */
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1.5rem;
  --radius-xl: 2rem;
  --radius-full: 9999px;
  
  /* Spacing Scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;
  --space-32: 8rem;
  
  /* Typography Scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;
  --text-hero: clamp(4rem, 10vw, 12rem);
  --text-mega: clamp(5rem, 15vw, 18rem);
  
  /* Animation */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-circ: cubic-bezier(0.85, 0, 0.15, 1);
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-reveal: 800ms;
}
```

## Vertical-Specific Token Overrides

### Sports — Football
```css
[data-vertical="football"] {
  --accent-primary: #FFD700;
  --accent-secondary: #FF3333;
  --display-font: 'Bebas Neue', sans-serif;
  --body-font: 'Geist Sans', sans-serif;
  --card-aspect: 320 / 440;
}
```

### Sports — Baseball
```css
[data-vertical="baseball"] {
  --accent-primary: #C41E3A;
  --accent-secondary: #002D62;
  --display-font: 'Bebas Neue', sans-serif;
  --card-border-style: double;
  --card-corner-treatment: 8px;
}
```

### Web3 / NFT
```css
[data-vertical="web3"] {
  --accent-primary: #00F0FF;
  --accent-secondary: #FF00FF;
  --display-font: 'Orbitron', sans-serif;
  --body-font: 'Geist Sans', sans-serif;
  --mono-font: 'Geist Mono', monospace;
  --bg-texture: circuit-board;
}
```

### Sneaker / Streetwear
```css
[data-vertical="streetwear"] {
  --accent-primary: #FF3366;
  --accent-secondary: #B8E0F0;
  --display-font: 'Clash Display', sans-serif;
  --letter-spacing-display: -0.02em;
  --button-radius: 0; /* squared-off streetwear aesthetic */
}
```

### Podcast / Media
```css
[data-vertical="media"] {
  --accent-primary: #6B5CE7;
  --accent-secondary: #3B82F6;
  --display-font: 'Bebas Neue', sans-serif;
  --ambient-color: rgba(107,92,231,0.15);
  --waveform-color: var(--accent-primary);
}
```

### Fintech / Digital Currency
```css
[data-vertical="fintech"] {
  --accent-primary: #00D4AA;
  --accent-secondary: #3B82F6;
  --data-positive: #00FF88;
  --data-negative: #FF4444;
  --display-font: 'Geist Sans', sans-serif;
  --mono-font: 'Geist Mono', monospace;
  --bg-texture: dot-grid;
}
```

## Font Loading

### CDN Sources (for React artifacts)
```html
<!-- Geist Sans + Mono -->
<link href="https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@latest/400.css" rel="stylesheet" />
<link href="https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@latest/500.css" rel="stylesheet" />
<link href="https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@latest/600.css" rel="stylesheet" />
<link href="https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@latest/700.css" rel="stylesheet" />

<!-- Bebas Neue (Sports Display) -->
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet" />

<!-- Orbitron (Web3/Cyberpunk) -->
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

<!-- Clash Display (Streetwear) — from CDNFonts -->
<link href="https://api.fontshare.com/v2/css?f[]=clash-display@200,300,400,500,600,700&display=swap" rel="stylesheet" />
```

## Animation Presets

### Liquid Glass Hover
```css
.glass-interactive {
  transition: background var(--duration-normal) ease,
              border-color var(--duration-normal) ease,
              box-shadow var(--duration-slow) var(--ease-out-expo);
}
.glass-interactive:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
  box-shadow: var(--shadow-md);
}
```

### Staggered Reveal (page load)
```css
.reveal-item {
  opacity: 0;
  transform: translateY(30px);
  animation: revealUp var(--duration-reveal) var(--ease-out-expo) forwards;
}
.reveal-item:nth-child(1) { animation-delay: 0.0s; }
.reveal-item:nth-child(2) { animation-delay: 0.1s; }
.reveal-item:nth-child(3) { animation-delay: 0.2s; }
.reveal-item:nth-child(4) { animation-delay: 0.3s; }
/* etc. */

@keyframes revealUp {
  to { opacity: 1; transform: translateY(0); }
}
```

### Floating Bob
```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
.float { animation: float 4s ease-in-out infinite; }
.float-slow { animation: float 6s ease-in-out infinite; }
.float-offset { animation-delay: -2s; }
```

### Holographic Border Rotation
```css
@property --holo-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
.holo-border {
  border: 2px solid transparent;
  background-image: 
    linear-gradient(var(--bg-base), var(--bg-base)),
    conic-gradient(from var(--holo-angle), #FF00FF, #00F0FF, #FFD700, #FF00FF);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  animation: holoRotate 3s linear infinite;
}
@keyframes holoRotate {
  to { --holo-angle: 360deg; }
}
```

### Gradient Text Slide
```css
.gradient-text-animated {
  background: linear-gradient(90deg, var(--brand-cyan), var(--brand-magenta), var(--brand-gold), var(--brand-cyan));
  background-size: 300% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradientSlide 4s ease infinite;
}
@keyframes gradientSlide {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

### Audio Waveform
```css
.waveform-bar {
  width: 3px;
  background: var(--accent-primary);
  border-radius: 9999px;
  animation: waveOscillate 1.2s ease-in-out infinite;
}
.waveform-bar:nth-child(odd) { animation-duration: 0.8s; }
.waveform-bar:nth-child(3n) { animation-duration: 1.5s; }

@keyframes waveOscillate {
  0%, 100% { height: 8px; opacity: 0.3; }
  50% { height: 32px; opacity: 1; }
}
```

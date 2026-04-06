# Sports Templates Reference — Iller_Ang

## Player Trading Card — React Component Pattern

```jsx
// PlayerCard.jsx — Holographic NFT Trading Card
// Usage: <PlayerCard player={playerData} rarity="legendary" />

const RARITY_COLORS = {
  common: { border: '#666', glow: 'rgba(102,102,102,0.2)', label: 'COMMON' },
  uncommon: { border: '#00F0FF', glow: 'rgba(0,240,255,0.2)', label: 'UNCOMMON' },
  rare: { border: '#3B82F6', glow: 'rgba(59,130,246,0.3)', label: 'RARE' },
  legendary: { border: '#FF00FF', glow: 'rgba(255,0,255,0.3)', label: 'LEGENDARY' },
  mythic: { border: '#FFD700', glow: 'rgba(255,215,0,0.4)', label: 'MYTHIC' },
};

const PlayerCard = ({ player, rarity = 'common' }) => {
  const colors = RARITY_COLORS[rarity];
  
  return (
    <div className="relative w-[320px] h-[440px] perspective-1000 group">
      {/* Holographic border - animated conic gradient */}
      <div 
        className="absolute inset-0 rounded-3xl animate-holo-spin"
        style={{
          background: `conic-gradient(from var(--angle, 0deg), ${colors.border}, #00F0FF, #FFD700, ${colors.border})`,
          padding: '2px',
        }}
      >
        <div className="w-full h-full rounded-3xl bg-[#0a0a0f] overflow-hidden relative">
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent animate-shimmer z-10 pointer-events-none" />
          
          {/* Player Image Zone - top 55% */}
          <div className="relative h-[55%] bg-gradient-to-b from-transparent to-[#0a0a0f]">
            {/* Player image or gradient placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
            {/* Jersey number watermark */}
            <span className="absolute top-4 right-4 text-6xl font-bold opacity-10 font-display">
              {player.number}
            </span>
            {/* Team badge */}
            <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-xs font-bold">
              {player.teamAbbr}
            </div>
          </div>
          
          {/* Name Plate */}
          <div className="px-4 py-2">
            <h3 className="font-display text-2xl text-white tracking-wide">
              {player.name}
            </h3>
            <p className="text-white/40 text-xs uppercase tracking-widest">
              {player.position} · {player.team}
            </p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2">
            {player.stats.map((stat) => (
              <div key={stat.label} className="bg-white/[0.04] rounded-xl p-2 text-center border border-white/[0.06]">
                <span className="text-lg font-bold" style={{ color: colors.border }}>
                  {stat.value}
                </span>
                <span className="block text-[10px] uppercase text-white/30 tracking-wider">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
          
          {/* Bottom Bar */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex justify-between items-center border-t border-white/[0.06]">
            <span className="text-[10px] text-white/20 uppercase">
              ACHIEVEMOR SPORTS · S1
            </span>
            <span 
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${colors.border}20`,
                color: colors.border 
              }}
            >
              {colors.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### Required CSS/Keyframes
```css
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
@keyframes holo-spin {
  to { --angle: 360deg; }
}
.animate-holo-spin { animation: holo-spin 3s linear infinite; }

@keyframes shimmer {
  0% { transform: translateX(-100%) rotate(15deg); }
  100% { transform: translateX(200%) rotate(15deg); }
}
.animate-shimmer { animation: shimmer 3s ease infinite; }
```

### Player Data Shape
```typescript
interface Player {
  name: string;          // "ZION RISHER"
  number: string;        // "7"
  position: string;      // "QB"
  team: string;          // "Hillside Comets"
  teamAbbr: string;      // "HC"
  stats: Array<{
    label: string;       // "SPD"
    value: number;       // 94
  }>;
  imageUrl?: string;
}
```

---

## Recruiting Prediction Graphic — Pattern

```jsx
// RecruitPrediction.jsx
// Mimics On3 RPM / 247Sports Crystal Ball style

const RecruitPrediction = ({ player, prediction }) => (
  <div className="w-[400px] bg-gradient-to-b from-[#0a0a0f] to-[#12121a] rounded-3xl overflow-hidden border border-white/[0.06]">
    {/* Header Bar */}
    <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.06] flex justify-between items-center">
      <span className="text-xs uppercase tracking-[0.3em] text-white/40">
        Recruiting Prediction
      </span>
      <span className="text-xs text-white/20">
        {prediction.date}
      </span>
    </div>
    
    {/* Player Image Zone */}
    <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-900">
      {/* Diagonal team color overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${prediction.teamColor}40 0%, transparent 60%)`
        }}
      />
      {/* Player image goes here */}
    </div>
    
    {/* Prediction Content */}
    <div className="p-6 text-center">
      <h2 className="font-display text-3xl text-white tracking-wide">
        {player.name}
      </h2>
      
      {/* Star Rating */}
      <div className="flex items-center justify-center gap-1 my-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <span 
            key={i}
            className={`text-lg ${i < player.stars ? 'text-yellow-400' : 'text-white/10'}`}
          >
            ★
          </span>
        ))}
        <span className="text-white/30 text-sm ml-2">| {player.position}</span>
      </div>
      
      {/* NEW PREDICTION Badge */}
      <div className="inline-block bg-yellow-400/20 text-yellow-400 text-xs uppercase tracking-widest px-3 py-1 rounded-full my-3 animate-pulse">
        New Prediction
      </div>
      
      {/* School Logo Zone */}
      <div className="w-20 h-20 mx-auto my-4 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: prediction.teamColor }}>
          {prediction.schoolAbbr}
        </span>
      </div>
      
      {/* Confidence Bar */}
      <div className="max-w-xs mx-auto">
        <div className="flex justify-between text-xs text-white/30 mb-1">
          <span>Confidence</span>
          <span>{prediction.confidence}%</span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000"
            style={{ 
              width: `${prediction.confidence}%`,
              background: `linear-gradient(90deg, ${prediction.teamColor}, ${prediction.teamColor}CC)`
            }}
          />
        </div>
      </div>
      
      {/* Source */}
      <p className="text-[10px] text-white/15 mt-4 uppercase tracking-wider">
        Via {prediction.analyst} · ACHIEVEMOR SPORTS
      </p>
    </div>
  </div>
);
```

---

## Broadcast Title Card — "Read & React" Pattern

```jsx
// BroadcastTitle.jsx
// ESPN-style 3D text with player cutout overlay

const BroadcastTitle = ({ title, subtitle, accentColor = '#C8FF00' }) => (
  <div className="relative w-full aspect-video bg-[#0a0a0a] overflow-hidden">
    {/* Background grid/field effect */}
    <div 
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage: `
          linear-gradient(${accentColor}15 1px, transparent 1px),
          linear-gradient(90deg, ${accentColor}15 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}
    />
    
    {/* Ambient glow */}
    <div 
      className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-20 blur-[100px]"
      style={{ backgroundColor: accentColor }}
    />
    
    {/* 3D Title Text */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <h1 
          className="font-display text-[120px] md:text-[180px] leading-none font-bold"
          style={{
            color: accentColor,
            textShadow: `
              0 2px 0 ${accentColor}CC,
              0 4px 0 ${accentColor}AA,
              0 6px 0 ${accentColor}88,
              0 8px 0 ${accentColor}66,
              0 12px 30px rgba(0,0,0,0.5)
            `,
          }}
        >
          {title.split('\n').map((line, i) => (
            <span key={i} className={i > 0 ? 'block text-white' : 'block'}>
              {line}
            </span>
          ))}
        </h1>
      </div>
    </div>
    
    {/* Player cutout zone - overlaps text */}
    <div className="absolute right-[10%] bottom-0 w-[40%] h-[90%]">
      {/* Player image would go here, positioned to overlap the text */}
      <div className="w-full h-full bg-gradient-to-t from-transparent to-transparent" />
    </div>
    
    {/* Network bug */}
    <div className="absolute top-4 right-4 text-white/30 text-xs font-bold uppercase tracking-wider">
      ACHIEVEMOR SPORTS
    </div>
    
    {/* Lower third ticker */}
    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm py-2 px-4 flex items-center">
      <span className="text-xs text-white/40 whitespace-nowrap animate-marquee">
        {subtitle}
      </span>
    </div>
  </div>
);
```

---

## Team Roster Composite — Pattern

```jsx
// RosterComposite.jsx
// Hillside All-Conference style group graphic

const RosterComposite = ({ team, players, achievement }) => (
  <div className="relative w-[800px] aspect-square bg-[#0a0a0f] overflow-hidden">
    {/* Particle/snow effect background */}
    <div className="absolute inset-0">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
    
    {/* Top corners: year split */}
    <div className="absolute top-6 left-6 font-display text-5xl text-white/80">20</div>
    <div className="absolute top-6 right-6 font-display text-5xl text-white/80">23</div>
    
    {/* Center top: team logo */}
    <div className="absolute top-4 left-1/2 -translate-x-1/2">
      <div className="w-16 h-16 flex items-center justify-center">
        <span className="font-display text-4xl" style={{ color: team.primaryColor }}>
          {team.logoLetter}
        </span>
      </div>
    </div>
    
    {/* Achievement banner */}
    <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center">
      <span className="text-xs text-white/30 uppercase tracking-[0.3em]">1st Team</span>
      <h2 
        className="font-display text-4xl tracking-wider"
        style={{ color: team.primaryColor }}
      >
        {achievement}
      </h2>
    </div>
    
    {/* Player silhouette grid - arranged in two rows */}
    <div className="absolute bottom-24 left-0 right-0 flex flex-wrap justify-center gap-2 px-8">
      {players.map((p, i) => (
        <div key={i} className="w-[100px] text-center">
          <div className="w-[100px] h-[140px] bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg" />
          <p className="text-white/60 text-xs mt-1 font-script italic">{p.name}</p>
        </div>
      ))}
    </div>
    
    {/* State map indicator */}
    <div className="absolute top-6 right-16 w-8 h-10 opacity-20">
      {/* SVG state outline placeholder */}
    </div>
    
    {/* Conference champion badge */}
    <div className="absolute top-6 left-16">
      <div className="bg-yellow-600/20 text-yellow-500 text-[10px] uppercase tracking-wider px-2 py-1 rounded">
        Conference Champions
      </div>
    </div>
  </div>
);
```

---

## Color Systems by Team

When building for specific teams, use these as base palettes:

| Team | Primary | Secondary | Accent |
|------|---------|-----------|--------|
| Hillside Comets | #6B1D3A (maroon) | #C0C0C0 (silver) | #FFD700 (gold) |
| LSU Tigers | #461D7C (purple) | #FDD023 (gold) | #FFFFFF |
| Alabama | #9E1B32 (crimson) | #FFFFFF | #828A8F (gray) |
| Syracuse | #D44500 (orange) | #002244 (navy) | #FFFFFF |
| Colorado | #CFB87C (gold) | #000000 | #A2A4A3 (silver) |
| Generic American | #002868 (blue) | #BF0A30 (red) | #FFFFFF |

---

## Export Patterns

### As React Artifact (Claude.ai)
Single .jsx file with all styles inline via Tailwind. Include @keyframes in a <style> tag within the component.

### As Image (PNG/WebP)
Use puppeteer or html-to-image to screenshot the React component at specific dimensions:
- Trading Card: 640x880 (2x for retina)
- Recruiting Graphic: 800x1000
- Broadcast Title: 1920x1080
- Roster Composite: 1600x1600

### As NFT Metadata
Pair the image export with ERC-721 metadata JSON. See SKILL.md NFT Metadata Standard section.

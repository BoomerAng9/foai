# Firebase Integration Reference — Iller_Ang

## Overview

All Iller_Ang outputs deploy to Firebase. This document covers project setup, hosting config, Cloud Functions for Web3 backends, Firestore for dynamic data, Auth for wallet-linked accounts, App Check for security, and integration with Firebase Agent Skills.

## Prerequisites

```bash
# Node.js 20+ required
nvm install 20 && nvm use 20

# Firebase CLI
npm install -g firebase-tools

# Verify
firebase --version
node --version

# Login
firebase login
```

## Installing Firebase Agent Skills

Firebase Agent Skills provide progressive-disclosure instructions that help AI agents write better Firebase code. Install them alongside Iller_Ang for maximum effectiveness.

```bash
# Option 1: Skills CLI (recommended — works with Claude Code, Cursor, Copilot)
npx skills add firebase/skills

# Option 2: Gemini CLI extension
gemini extensions install https://github.com/firebase/skills

# Option 3: Claude plugin
claude plugin marketplace add firebase/skills
claude plugin install firebase@firebase

# Option 4: Manual
git clone https://github.com/firebase/agent-skills.git
cp -r agent-skills/skills/* .claude/skills/
```

### Available Firebase Skills

After installation, these skills are available to your agent:

| Skill | Triggers On |
|-------|------------|
| `firebase-basics` | Project setup, CLI usage, init, login |
| `firebase-hosting-basics` | Static site deployment, SPA config, preview channels |
| `firebase-auth-basics` | Authentication setup, sign-in providers, session management |
| `firebase-firestore-basics` | Database design, queries, security rules |
| `firebase-functions-basics` | Cloud Functions, triggers, callable functions |
| `firebase-ai-basics` | Firebase AI Logic, Gemini/Nano Banana integration |
| `firebase-appcheck-basics` | Bot protection, attestation providers |
| `firebase-extensions-basics` | Pre-built extensions, installation, configuration |

### Skill + MCP Complementary Usage

Firebase Agent Skills and Firebase MCP are complementary:
- **Skills** = expertise (knowing HOW to do Firebase tasks)
- **MCP** = capability (having the TOOLS to actually do it)

Use both together. Skills guide the agent on best practices; MCP gives the agent programmatic access to Firebase services.

```bash
# Install Firebase MCP server for full programmatic access
# (Available as MCP connector in Claude.ai — enable in settings)
```

## Project Structure

```
achievemor-motion/
├── .firebaserc                 # Project aliases
├── firebase.json               # Hosting + Functions config
├── firestore.rules             # Security rules
├── firestore.indexes.json      # Composite indexes
├── src/                        # React app source
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── HeroSection.tsx
│   │   ├── MintSection.tsx
│   │   ├── PlayerCard.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── firebase.ts         # Firebase client SDK init
│   │   ├── web3.ts             # wagmi/viem config
│   │   └── contracts.ts        # Contract ABIs
│   └── styles/
│       └── globals.css         # Design tokens, animations
├── functions/                  # Cloud Functions (serverless)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── mint.ts             # Mint verification endpoint
│       ├── metadata.ts         # NFT metadata API
│       └── webhooks.ts         # Blockchain event webhooks
├── public/                     # Static assets
└── dist/                       # Vite build output
```

## Firebase Initialization

```bash
# Create project
firebase projects:create achievemor-motion --display-name "ACHIEVEMOR Motion"

# Initialize services
firebase init

# Select:
# ✅ Hosting: Configure files for Firebase Hosting
# ✅ Functions: Set up Cloud Functions
# ✅ Firestore: Set up Firestore
# ✅ Emulators: Set up local emulators

# Hosting config:
#   Public directory: dist
#   Configure as SPA: Yes
#   Set up automatic builds: No (we use Vite)

# Functions config:
#   Language: TypeScript
#   ESLint: Yes
#   Install dependencies: Yes

# Emulators:
#   ✅ Hosting, Functions, Firestore, Auth
```

## firebase.json Configuration

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|avif)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=86400" }
        ]
      }
    ]
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": ["node_modules", ".git"],
      "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
    }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "hosting": { "port": 5000 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "auth": { "port": 9099 },
    "ui": { "enabled": true }
  }
}
```

## Firebase Client SDK Setup

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// App Check — protect mint endpoints from bots
if (import.meta.env.PROD) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export default app;
```

## Cloud Functions — NFT & Web3 Backend

### Mint Verification Endpoint

```typescript
// functions/src/mint.ts
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

export const verifyMint = onRequest(
  { cors: true, enforceAppCheck: true },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const { txHash, walletAddress, tokenId } = req.body;

    // Verify transaction on-chain (use ethers or viem)
    // ... verification logic ...

    // Record mint in Firestore
    await db.collection('mints').doc(txHash).set({
      wallet: walletAddress,
      tokenId,
      timestamp: FieldValue.serverTimestamp(),
      verified: true,
    });

    // Update supply counter
    await db.collection('collections').doc('gridiron-legends').update({
      mintedCount: FieldValue.increment(1),
    });

    res.json({ success: true, tokenId });
  }
);
```

### NFT Metadata API

```typescript
// functions/src/metadata.ts
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const tokenMetadata = onRequest(async (req, res) => {
  const tokenId = req.path.split('/').pop();

  const doc = await db.collection('tokens').doc(tokenId!).get();

  if (!doc.exists) {
    res.status(404).json({ error: 'Token not found' });
    return;
  }

  const data = doc.data()!;

  // Return ERC-721 compliant metadata
  res.json({
    name: `Gridiron Legends #${tokenId}`,
    description: 'ACHIEVEMOR Sports Series 1',
    image: data.imageUri, // ipfs:// URI
    external_url: `https://achievemor-motion.web.app/cards/${tokenId}`,
    attributes: data.attributes,
  });
});
```

### Functions Index

```typescript
// functions/src/index.ts
export { verifyMint } from './mint';
export { tokenMetadata } from './metadata';
```

## Firestore Schema

### Collections

```
collections/{collectionId}
  ├── name: "Gridiron Legends"
  ├── maxSupply: 5000
  ├── mintedCount: 2847
  ├── price: "0.08"
  ├── isActive: true
  └── contractAddress: "0x..."

tokens/{tokenId}
  ├── collectionId: "gridiron-legends"
  ├── owner: "0x..."
  ├── imageUri: "ipfs://Qm.../001.png"
  ├── rarity: "legendary"
  ├── mintedAt: Timestamp
  └── attributes: [
        { trait_type: "Team", value: "Comets" },
        { trait_type: "Position", value: "QB" },
        ...
      ]

mints/{txHash}
  ├── wallet: "0x..."
  ├── tokenId: "001"
  ├── timestamp: Timestamp
  └── verified: true

users/{walletAddress}
  ├── displayName: "acheevy.byachievemor"
  ├── tokensOwned: ["001", "042", "187"]
  └── lastLogin: Timestamp
```

### Security Rules

```
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Collections — public read, admin write
    match /collections/{collectionId} {
      allow read: if true;
      allow write: if false; // Only Cloud Functions write
    }

    // Tokens — public read (metadata), no direct write
    match /tokens/{tokenId} {
      allow read: if true;
      allow write: if false; // Only Cloud Functions write
    }

    // Mints — no direct access (Functions only)
    match /mints/{txHash} {
      allow read, write: if false;
    }

    // Users — read own, write own
    match /users/{walletAddress} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.wallet == walletAddress;
    }
  }
}
```

## Deployment

### Standard Deploy

```bash
# Build React app
npm run build

# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# Deploy only rules
firebase deploy --only firestore:rules
```

### Preview Channels (for staging)

```bash
# Create a preview channel with 7-day expiry
firebase hosting:channel:deploy preview --expires 7d

# Get a temporary URL like:
# https://achievemor-motion--preview-abc123.web.app
```

### Environment Variables for Functions

```bash
# Set secrets for Cloud Functions
firebase functions:secrets:set ETHEREUM_RPC_URL
firebase functions:secrets:set CONTRACT_PRIVATE_KEY
firebase functions:secrets:set PINATA_API_KEY
```

### CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
```

## Firebase AI Logic — Nano Banana 2

Use Nano Banana 2 via Firebase AI Logic for client-side AI features:

```typescript
// src/lib/ai.ts
import { initializeApp } from 'firebase/app';
import { getAI, getGenerativeModel } from 'firebase/ai';

const app = initializeApp(firebaseConfig);
const ai = getAI(app);

// Use Nano Banana 2 for on-device inference
const model = getGenerativeModel(ai, {
  model: 'nano-banana-2', // On-device for speed
});

// Example: Generate card descriptions from stats
export async function generateCardDescription(playerStats: object) {
  const result = await model.generateContent(
    `Write a 2-sentence scouting report for this player: ${JSON.stringify(playerStats)}`
  );
  return result.response.text();
}
```

### Hybrid Inference Pattern

```typescript
// Use on-device (fast, private) for simple tasks
const nanoModel = getGenerativeModel(ai, { model: 'nano-banana-2' });

// Use cloud (powerful) for complex tasks
const cloudModel = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });

export async function smartGenerate(prompt: string, complexity: 'simple' | 'complex') {
  const model = complexity === 'simple' ? nanoModel : cloudModel;
  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

## A/B Testing for Web

Use Firebase A/B Testing to optimize landing page variants:

```typescript
// src/lib/experiments.ts
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';

const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour

await fetchAndActivate(remoteConfig);

// Check which hero variant to show
const heroVariant = getValue(remoteConfig, 'hero_variant').asString();
// Returns: 'cinematic' | 'minimal' | 'glassmorphic'
```

## Phone Number Verification

Use Firebase Phone Number Verification for non-crypto users:

```typescript
import { getAuth, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';

// Verify phone number without SMS OTP
// Uses device attestation for simplified onboarding
```

## Performance Checklist

Before deploying any Iller_Ang output to Firebase:

- [ ] `npm run build` produces optimized bundle under 300KB gzipped
- [ ] Images: WebP format, lazy-loaded, served from Firebase CDN
- [ ] Fonts: preloaded critical fonts, display=swap
- [ ] Animations: GPU-accelerated (transform/opacity only), no layout thrash
- [ ] Lighthouse: 90+ Performance, 90+ Accessibility
- [ ] App Check enabled for all API endpoints
- [ ] Security rules reviewed — no public write access
- [ ] Preview channel tested before production deploy
- [ ] Environment variables set (no secrets in client code)

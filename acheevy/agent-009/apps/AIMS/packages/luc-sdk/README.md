<p align="center">
  <img src="https://raw.githubusercontent.com/BoomerAng9/LUC-Locale-Universal-Calculator/main/assets/luc-logo.png" alt="LUC Logo" width="200" />
</p>

<h1 align="center">LUC - Locale Universal Calculator</h1>

<p align="center">
  <strong>Open-source usage tracking, quota gating, and cost estimation for any application</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@plugmein/luc-sdk"><img src="https://img.shields.io/npm/v/@plugmein/luc-sdk.svg" alt="npm version" /></a>
  <a href="https://github.com/BoomerAng9/LUC-Locale-Universal-Calculator/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <a href="https://github.com/BoomerAng9/LUC-Locale-Universal-Calculator/stargazers"><img src="https://img.shields.io/github/stars/BoomerAng9/LUC-Locale-Universal-Calculator.svg" alt="GitHub Stars" /></a>
  <a href="https://discord.gg/aims"><img src="https://img.shields.io/discord/1234567890?color=7289da&label=Discord&logo=discord&logoColor=white" alt="Discord" /></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-presets">Presets</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## What is LUC?

**LUC (Locale Universal Calculator)** is a lightweight, framework-agnostic library that helps you:

- **Track usage** across any service, API, or resource
- **Gate execution** with pre-flight quota checks
- **Calculate costs** with built-in overage pricing
- **Manage plans** with tiered quota limits
- **Export data** for billing, analytics, and compliance

Originally built for real estate applications, LUC has been completely re-engineered as a **universal solution** that works across any industry - from SaaS platforms to AI applications, e-commerce to healthcare.

### Why LUC?

| Problem | LUC Solution |
|---------|--------------|
| Users exceeding API limits | Pre-flight gating blocks requests before they happen |
| Surprise overage bills | Real-time cost estimation and warnings |
| Complex usage tracking | Simple debit/credit API with automatic accounting |
| Industry-specific needs | Customizable presets for any domain |
| Vendor lock-in | Framework-agnostic, works anywhere |

---

## 🚀 Quick Start

```bash
npm install @plugmein/luc-sdk
```

```typescript
import { quickStart, SAAS_PRESET } from '@plugmein/luc-sdk';

// Initialize with a preset
const { engine } = quickStart('user-123', 'startup', SAAS_PRESET);

// Check if action is allowed (pre-flight)
const check = engine.canExecute('api_calls', 100);

if (check.allowed) {
  // Execute your action...
  await callExternalAPI();

  // Debit usage after success
  engine.debit('api_calls', 100);
}

// Get usage summary
const summary = engine.getSummary();
console.log(`Usage: ${summary.overallPercentUsed.toFixed(1)}%`);
```

**That's it!** You now have usage tracking with quota gating.

---

## ✨ Features

### Core Capabilities

- **Pre-flight Gating** - Check quotas before executing expensive operations
- **Post-run Accounting** - Debit usage after successful operations
- **Rollback Support** - Credit back usage when operations fail
- **Overage Handling** - Configurable overage thresholds with cost calculation
- **Event System** - Subscribe to warnings, critical alerts, and blocks

### Developer Experience

- **TypeScript First** - Full type safety with generic service keys
- **Zero Dependencies** - Lightweight, no bloat
- **Framework Agnostic** - Works with React, Vue, Node, Deno, Bun, anywhere
- **Storage Adapters** - Memory, localStorage, or bring your own (Firebase, Redis, etc.)
- **Import/Export** - JSON and CSV for billing and analytics

### Industry Presets

Ready-to-use configurations for:

| Preset | Services Included |
|--------|-------------------|
| **Real Estate** | Listings, photos, virtual tours, leads, valuations |
| **SaaS / API** | API calls, users, storage, compute, webhooks |
| **AI Platform** | LLM tokens, embeddings, inference, fine-tuning |
| **E-Commerce** | Products, orders, inventory, shipping, payments |
| **Healthcare** | Patient records, appointments, prescriptions, claims |
| **Content Creator** | Video, audio, transcription, storage, social posts |

---

## 📦 Installation

### npm

```bash
npm install @plugmein/luc-sdk
```

### yarn

```bash
yarn add @plugmein/luc-sdk
```

### pnpm

```bash
pnpm add @plugmein/luc-sdk
```

### Deno

```typescript
import { LUCEngine } from 'npm:@plugmein/luc-sdk';
```

### CDN (Browser)

```html
<script type="module">
  import { quickStart, SAAS_PRESET } from 'https://esm.sh/@plugmein/luc-sdk';
</script>
```

---

## 📖 Documentation

### Basic Usage Pattern

```typescript
import { createAccount, createEngine, createConfig, defineService, definePlan } from '@plugmein/luc-sdk';

// 1. Define your services
type MyServices = 'api_calls' | 'storage_gb' | 'ai_tokens';

const config = createConfig<MyServices>({
  services: {
    api_calls: defineService('api_calls', 'API Calls', 'call', 0.0001),
    storage_gb: defineService('storage_gb', 'Storage', 'GB', 0.025),
    ai_tokens: defineService('ai_tokens', 'AI Tokens', 'K tokens', 0.002),
  },
  plans: {
    free: definePlan('free', 'Free', 0, 0, {
      api_calls: 1000,
      storage_gb: 1,
      ai_tokens: 100,
    }),
    pro: definePlan('pro', 'Pro', 29, 0.2, {  // 20% overage allowed
      api_calls: 100000,
      storage_gb: 100,
      ai_tokens: 5000,
    }),
  },
});

// 2. Create account and engine
const account = createAccount('user-456', 'pro', config);
const engine = createEngine(account, config);

// 3. Use it!
```

### Pre-flight Check (`canExecute`)

Always check before running expensive operations:

```typescript
const result = engine.canExecute('api_calls', 500);

if (!result.allowed) {
  // Handle blocked request
  console.log('Blocked:', result.reason);
  console.log('Would exceed by:', result.wouldExceedBy);
  return { error: 'Quota exceeded' };
}

// Check if this will incur overage
if (result.projectedCost && result.projectedCost > 0) {
  console.log('Warning: This will cost $', result.projectedCost);
}
```

### Debit Usage (`debit`)

After successful operation:

```typescript
const result = engine.debit('api_calls', 500);

console.log('New usage:', result.newUsed);
console.log('Quota %:', result.quotaPercent);

if (result.warning) {
  // Show warning to user (80% or 90% threshold)
  showNotification(result.warning);
}

if (result.overageCost > 0) {
  // Track for billing
  recordOverage(result.overageCost);
}
```

### Credit (Rollback)

When operations fail, credit back:

```typescript
try {
  await riskyOperation();
  engine.debit('api_calls', 100);
} catch (error) {
  // Operation failed, credit back
  engine.credit('api_calls', 100);
  throw error;
}
```

### Get a Quote

Estimate costs without debiting:

```typescript
const quote = engine.quote('ai_tokens', 10000);

console.log('Would exceed quota:', quote.wouldExceed);
console.log('Projected overage:', quote.projectedOverage);
console.log('Projected cost: $', quote.projectedCost);
console.log('Allowed:', quote.allowed);
```

### Event System

Subscribe to usage events:

```typescript
// Warning at 80%
engine.on('quota_warning', (event) => {
  sendSlackAlert(`⚠️ ${event.service} at ${event.data?.percentUsed}%`);
});

// Critical at 90%
engine.on('quota_critical', (event) => {
  sendPagerDuty(event.message);
});

// Blocked (quota exceeded)
engine.on('quota_blocked', (event) => {
  analytics.track('quota_blocked', event);
});

// Overage incurred
engine.on('overage_incurred', (event) => {
  billing.recordCharge(event.data?.cost);
});

// All events
engine.on('*', (event) => {
  logger.info('LUC Event', event);
});
```

### Import / Export

```typescript
import { exportToJSON, importFromJSON, summaryToCSV } from '@plugmein/luc-sdk';

// Export to JSON (for backup or migration)
const json = exportToJSON([engine.getAccount()]);
fs.writeFileSync('luc-backup.json', json);

// Import from JSON
const { accounts } = importFromJSON(json);

// Export summary to CSV (for billing/reports)
const csv = summaryToCSV(engine.getSummary());
fs.writeFileSync('usage-report.csv', csv);
```

### Storage Adapters

**In-Memory (Default)**
```typescript
import { createMemoryAdapter } from '@plugmein/luc-sdk';
const storage = createMemoryAdapter();
```

**Browser LocalStorage**
```typescript
import { createLocalStorageAdapter } from '@plugmein/luc-sdk';
const storage = createLocalStorageAdapter('myapp:luc:');
```

**Custom Adapter (Firebase Example)**
```typescript
import { LUCStorageAdapter, serializeAccount, deserializeAccount } from '@plugmein/luc-sdk';

class FirestoreAdapter implements LUCStorageAdapter {
  async get(id: string) {
    const doc = await db.collection('luc').doc(id).get();
    return doc.exists ? deserializeAccount(doc.data()) : null;
  }

  async set(account: LUCAccountRecord) {
    await db.collection('luc').doc(account.id).set(serializeAccount(account));
  }

  async delete(id: string) {
    await db.collection('luc').doc(id).delete();
  }
}
```

---

## 🏭 Presets

### Using a Preset

```typescript
import { quickStart, SAAS_PRESET, AI_PLATFORM_PRESET } from '@plugmein/luc-sdk';

// SaaS Application
const saas = quickStart('user-1', 'startup', SAAS_PRESET);
saas.engine.debit('api_calls', 1000);

// AI Platform
const ai = quickStart('user-2', 'builder', AI_PLATFORM_PRESET);
ai.engine.debit('llm_tokens', 500);
```

### Available Presets

<details>
<summary><strong>Real Estate</strong></summary>

```typescript
import { REAL_ESTATE_PRESET } from '@plugmein/luc-sdk';

// Services: property_listings, photo_uploads, virtual_tours,
//           lead_captures, crm_contacts, email_sends, sms_messages,
//           ai_valuations, market_reports, storage_gb

// Plans: agent_starter ($29), agent_pro ($79), brokerage ($299)
```
</details>

<details>
<summary><strong>SaaS / API</strong></summary>

```typescript
import { SAAS_PRESET } from '@plugmein/luc-sdk';

// Services: api_calls, active_users, storage_gb, bandwidth_gb,
//           compute_hours, database_queries, webhooks,
//           integrations, support_tickets

// Plans: free, startup ($49), business ($199), enterprise ($999)
```
</details>

<details>
<summary><strong>AI Platform</strong></summary>

```typescript
import { AI_PLATFORM_PRESET } from '@plugmein/luc-sdk';

// Services: llm_tokens, image_generations, embeddings,
//           fine_tuning_hours, model_deployments, inference_calls,
//           vector_storage, audio_minutes, video_minutes

// Plans: hobbyist (free), builder ($29), professional ($99), scale ($499)
```
</details>

<details>
<summary><strong>E-Commerce</strong></summary>

```typescript
import { ECOMMERCE_PRESET } from '@plugmein/luc-sdk';

// Services: products, orders, customers, inventory_updates,
//           shipping_labels, payment_transactions,
//           email_notifications, storage_gb, analytics_events

// Plans: starter ($29), growth ($79), scale ($249)
```
</details>

<details>
<summary><strong>Healthcare</strong></summary>

```typescript
import { HEALTHCARE_PRESET } from '@plugmein/luc-sdk';

// Services: patient_records, appointments, video_consultations,
//           prescriptions, lab_results, secure_messages,
//           document_storage_gb, insurance_claims, compliance_audits

// Plans: solo_practice ($99), clinic ($299), hospital ($999)
```
</details>

<details>
<summary><strong>Content Creator</strong></summary>

```typescript
import { CONTENT_CREATOR_PRESET } from '@plugmein/luc-sdk';

// Services: video_uploads, video_encoding_minutes, audio_uploads,
//           image_uploads, storage_gb, bandwidth_gb,
//           ai_transcriptions, ai_captions, social_posts

// Plans: creator ($19), professional ($49), studio ($149)
```
</details>

---

## 🤝 Contributing

We welcome contributions from the community! LUC is part of the [A.I.M.S.](https://github.com/BoomerAng9/AIMS) ecosystem - an AI-powered platform for builders.

### Ways to Contribute

- **Report bugs** - Open an issue with reproduction steps
- **Suggest features** - We love new ideas
- **Add presets** - Create presets for new industries
- **Improve docs** - Help us make LUC easier to use
- **Write tests** - Increase our coverage
- **Share** - Star the repo and tell others!

### Development Setup

```bash
# Clone the repo
git clone https://github.com/BoomerAng9/LUC-Locale-Universal-Calculator.git
cd LUC-Locale-Universal-Calculator

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Watch mode
npm run dev
```

### Code Style

- TypeScript strict mode
- ESLint for linting
- Prettier for formatting
- Conventional commits

---

## 🌟 Part of A.I.M.S.

<p align="center">
  <a href="https://github.com/BoomerAng9/AIMS">
    <img src="https://raw.githubusercontent.com/BoomerAng9/AIMS/main/assets/aims-banner.png" alt="A.I.M.S. Banner" width="600" />
  </a>
</p>

LUC is proudly part of **[A.I.M.S. (AI Managed Solutions)](https://github.com/BoomerAng9/AIMS)** - a comprehensive AI platform for the next generation of builders.

### What is A.I.M.S.?

> **Think It. Prompt It. Let's Build It.**

A.I.M.S. provides:

- **ACHEEVY** - AI executive assistant with voice I/O
- **House of Ang** - Marketplace of specialized AI agents (Boomer_Ang orchestration)
- **Model Garden** - 200+ AI models (Claude, GPT, Gemini, Llama, and more)
- **Circuit Box** - System management for wiring APIs and integrations
- **LUC Calculator** - Usage tracking and quota gating (this project!)

### Try A.I.M.S.

- **GitHub:** [github.com/BoomerAng9/AIMS](https://github.com/BoomerAng9/AIMS)
- **Website:** Coming soon at aims.plugmein.cloud

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

Use it, modify it, ship it. Just give credit where it's due.

---

## 💬 Community & Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/BoomerAng9/LUC-Locale-Universal-Calculator/issues)
- **Discord:** [Join the A.I.M.S. community](https://discord.gg/aims)
- **Twitter/X:** [@BoomerAng9](https://twitter.com/BoomerAng9)

---

<p align="center">
  <strong>Built with ❤️ by the A.I.M.S. team</strong>
  <br />
  <a href="https://github.com/BoomerAng9/AIMS">A.I.M.S.</a> •
  <a href="https://github.com/BoomerAng9/LUC-Locale-Universal-Calculator">LUC SDK</a>
</p>

<p align="center">
  If LUC helps your project, consider giving us a ⭐️
</p>

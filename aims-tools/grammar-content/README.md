# @aims/grammar-content

Staged content for the Grammar Skill library — prompt frameworks, templates, examples, glossaries, plugs.

> **Status:** Step 4 of 5 staging area. This content is destined for the GRAMMAR repo (`foai/GRAMMAR/`) but lives here in the foai monorepo until the GRAMMAR repo intake is run. Per Rish 2026-04-08: "b but Grammar needs to be on at all times to assist in user prompt efficiency."

## What's here

```
grammar-content/
├── prompts/
│   ├── psychology/        24 marketing/conversion frameworks
│   ├── content/           21 content creation frameworks
│   └── sales/             High-ticket prompts + closing principles
├── glossary/
│   ├── sigma-terms.md     Kaizen / Lean / Six Sigma vocabulary
│   └── translations/      Cross-industry terminology mapping
│       └── net-falcon-lean-to-medical.md
├── templates/
│   └── legal/             LOI + MOU reusable templates
├── examples/              EXAMPLE doc generation guides (per Rish)
│   ├── loi/               Letter of Intent examples
│   ├── mou/               MOU examples
│   ├── contracts/         Contractor agreement examples
│   ├── dev-package/       Developer integration guide example
│   ├── onboarding/        90-day onboarding checklist
│   └── forms/             Interview evaluation form
├── checklists/
│   └── user-journey-design.md
└── plugs/
    └── deploy-plug-market-entry-starter.md   (renamed from HIDT Planning)
```

## Ingestion rules

### Grammar always-on
Per `project_grammar_always_on_ntntn.md`:
- Grammar runs **ON by default** for every user prompt
- Improves prompt efficiency (intent classification, token saving, routing hints, scope filter)
- Users can toggle OFF in **Circuit Box → Settings → Grammar Filter → Off**
- Toggle is per-user, not per-session

### NTNTN file indexing
When users share/upload any file:
1. File received (PDF, DOCX, MD, image, audio, etc.)
2. Routes to **NTNTN engine** for intent-normalized indexing
3. Stored in user's private knowledge base (CMEK-isolated)
4. ACHEEVY queries this index BEFORE web search

### HIDT → A.I.M.S. rename rule
All ingested content has `HIDT` references rewritten to `A.I.M.S.` per `project_hidt_to_aims_rename.md`. This applies to ANY new doc Rish uploads going forward.

## Source provenance

| File | Source |
|---|---|
| `prompts/psychology/all-24-frameworks.md` | Rish's Notion library, ingested 2026-04-08 |
| `prompts/content/all-21-frameworks.md` | Notion `Content Creation Frameworks` (zip 6cc858af) |
| `prompts/sales/high-ticket-prompts.md` | Notion `Sales Metrics` (zip 25d4279a) |
| `prompts/sales/closing-principles.md` | Notion `Technical Sales` (zip 8d0efda1) |
| `glossary/sigma-terms.md` | Rish's Sigma Terms doc |
| `glossary/translations/net-falcon-lean-to-medical.md` | Notion `Legend for Business Terms` (zip 4455b548) |
| `templates/legal/letter-of-intent.md` | Distilled from CDL BookClub + Rider Academy LOIs |
| `templates/legal/mou.md` | Distilled from IELTS Examiners MOU |
| `examples/loi/cdl-bookclub-2023.md` | Original CDL BookClub LOI (2023) |
| `examples/loi/rider-academy-2023.md` | Original Rider Academy LOI (zip a04d2265) |
| `examples/mou/ielts-examiners.md` | Original IELTS Examiners MOU (zip a561c4cd) |
| `examples/contracts/contractor-agreement-ielts.md` | Original IELTS Examiners Agreement (zip 177ea612) |
| `examples/dev-package/aims-plug-developer-guide-outline.md` | Notion `Complete Developer Package` (zip cdeea7e2) |
| `examples/onboarding/90-day-checklist.md` | Notion `Onboarding Checklist` (zip 43518c7e) |
| `examples/forms/interview-evaluation.md` | Notion `HIDT Interview Evaluation Form` (zip 95e59ecc) |
| `checklists/user-journey-design.md` | Notion `User Journey` (zip 3ced9d49) |
| `plugs/deploy-plug-market-entry-starter.md` | Renamed from HIDT Planning doc |

## Three docs flagged as EXAMPLE doc generation guides

Per Rish 2026-04-08: these are not blank templates — they are **example outputs** that ACHEEVY/Boomer_CFO/Boomer_CTO read as canonical examples of "what good looks like" when generating new versions for users:

1. `examples/loi/rider-academy-2023.md`
2. `examples/mou/ielts-examiners.md`
3. `examples/dev-package/aims-plug-developer-guide-outline.md`

Templates in `templates/legal/` are blank-with-placeholders; examples in `examples/` are full original outputs.

## Future move to GRAMMAR repo

When the GRAMMAR repo intake is run, this entire `grammar-content/` tree gets copied into `foai/GRAMMAR/content/` (or wherever the GRAMMAR maintainers prefer). The structure stays the same. This staging directory is the canonical drafting area until then.

ACHIEVEMOR  ×  Per|Form

Per|Form for Podcasters

Platform Architecture & Implementation Directive  v1.0

Approved by ACHEEVY  |  April 2026  |  CONFIDENTIAL

# EXECUTIVE OVERVIEW

Per|Form for Podcasters is a dedicated SPORTS sub-vertical within the ACHIEVEMOR Per|Form platform. It extends the existing platform into a white-labeled, team-personalized content creation, curation, and autonomous distribution hub built exclusively for sports podcasters covering American professional and college sports leagues.

The product gives podcasters a personalized mission-control headquarters (the Circuit Box), a full content creation and editing studio (the Workbench), autonomous social distribution powered by YouTube Studio and social platform APIs, AI-driven video and audio segmentation using TwelveLabs and Google embeddings, and a branded audience-facing player. Underneath all of this runs a Hawks squadron layer that continuously scrapes and aggregates league data — rosters, player stats, coaching staff, draft information — feeding a dynamic per-user dataset that powers analytics, content recommendations, and show preparation.

This directive is written for the Claw-Code editor to implement directly within the BoomerAng9/foai monorepo. All implementation follows the existing Next.js 15 App Router architecture, Neon Postgres schema patterns, Firebase Auth, and Docker deployment on myclaw-vps.

Sprint Placement

# SECTION 1 — CURRENT PLATFORM STATE & INTEGRATION BASELINE

All implementation of Per|Form for Podcasters must treat the following as ground truth. No assumptions about existing integrations — use only what is confirmed live.

1.1  Confirmed Live Infrastructure

1.2  Existing Tables to Extend

The following Neon Postgres tables are already live and should be extended or referenced by Per|Form for Podcasters:

# SECTION 2 — VERTICAL ARCHITECTURE & COMPARTMENTALIZATION

## 2.1  Sub-Vertical Classification

Per|Form for Podcasters is a SPORTS sub-vertical within the TIE framework. It inherits the existing assertVertical() compartmentalization pattern from verticals.ts. Sports rankings, player grades, and TIE scores must never surface in non-sports contexts. The podcaster product has its own label space separate from the draft analysis tool.

## 2.2  Route Namespace

All Per|Form for Podcasters routes live under /podcasters/ to maintain clean separation from the core draft product:

## 2.3  Launch Verticals (Four at Launch)

Perform for Podcasters launches with four compartmentalized sport verticals. Each vertical has its own data schema, UI theme logic, Hawks squadron configuration, and route path. They do not share data surfaces.

### College Football

Data: FBS (134 teams) + FCS (125 teams) full rosters, player stats, coaching staff, transfer portal, recruiting

Existing tables: cfb_players (35,480 rows) — LIVE and ready to query

Add-on bundle: NFL (offered during onboarding for draft scouting pipeline)

Team theming: College team logo replaces wall asset in Circuit Box room

Coming Soon flag: UFL and other domestic football leagues

### NFL

Data: 32 team rosters, player stats, depth charts, draft history, coaching staff, cap data

Existing tables: perform_players, nfl_draft_picks, nfl_combine — all LIVE

Add-on bundle: College Football (offered during onboarding for incoming draft class tracking)

Team theming: Team helmet fathead replaces wall asset — 32 preloaded renders required

Coming Soon flag: UFL and other domestic football leagues

### NBA

Data: 30 team rosters, player stats, depth charts, coaching staff, historical season data

New tables required: nba_teams, nba_players, nba_rosters — scaffold from existing Neon pattern

No add-on at launch — standalone vertical

Team theming: Team logo and color scheme — 30 preloaded renders required

COMING SOON — International basketball pathways (European leagues, FIBA, global feeders to NBA)

COMING SOON — College Basketball vertical

### MLB

Data: 30 team rosters, player stats, depth charts, coaching staff, historical season data

New tables required: mlb_teams, mlb_players, mlb_rosters — scaffold from existing Neon pattern

No add-on at launch — standalone vertical

Team theming: Team logo and colors — 30 preloaded renders required

COMING SOON — Farm system and minor league integration (Triple-A through Rookie leagues)

COMING SOON — College Baseball vertical

# SECTION 3 — ONBOARDING FLOW & DYNAMIC USER SCHEMA

## 3.1  Entry Point

User lands on /podcasters — a branded portal distinct from the core Per|Form draft product. The entry experience is sport-specific and separate from any general Per|Form onboarding. The visual language is consistent with the ACHIEVEMOR dark broadcast theme.

## 3.2  Onboarding Stepper — Step by Step

The onboarding uses Paperform integrated into a multi-step stepper UI. Each step captures data that feeds the dynamic Hawks schema. The stepper is already wired for Paperform via existing webhook infrastructure on n8n (vps2).

### Step 1 — Account Creation

Email / password or Google OAuth via Firebase Auth (existing requireAuth() pattern)

Basic info: Podcaster name, podcast name, location (state/region)

Subscriber count (approximate — used for plan recommendation and analytics baseline)

Primary publishing platforms (YouTube, Spotify, Apple Podcasts, etc. — multi-select)

### Step 2 — League Selection (Path Decision Gate)

This is the primary routing decision. User selects one league as their primary vertical:

College Football

NFL

NBA

MLB

This selection triggers the preordained path. All subsequent UI, data sources, team options, and feature sets are determined by this choice. The assertVertical() pattern enforces data isolation from this point forward.

### Step 3 — Contextual Add-On Offer

If NFL selected → offer College Football add-on (draft scouting / prospect tracking)

If College Football selected → offer NFL add-on (draft pipeline / pro tracking)

If NBA selected → no add-on at launch, Coming Soon messaging shown

If MLB selected → no add-on at launch, Coming Soon messaging shown

Add-on pricing is displayed inline. User accepts, declines, or upgrades plan to include it.

### Step 4 — Mission, Vision, Objectives & Needs Analysis

Mission: What is this podcast about?

Vision: Where is the podcaster taking it in the next 12 months?

Objectives: Specific goals for 3, 6, and 12 months

Needs analysis: What specific tools and data do they need to succeed?

NOTE: This data feeds directly into the dynamic Hawks schema. It is mutable — podcasters can return and update at any time. The schema recalibrates when changes are saved. Initial entries are treated as drafts; the platform expects users to refine their mission as they see the product's value.

### Step 5 — Team Selection

User selects their favorite team within the chosen vertical

NFL: Display all 32 teams as logo cards

College Football: Display FBS and FCS teams organized by conference

NBA: Display all 30 teams as logo cards

MLB: Display all 30 teams as logo cards

Team selection triggers the Circuit Box room personalization render

User may skip team selection — defaults to league-branded room with no team overlay

### Step 6 — Plan Selection

User selects their access tier. Plan determines feature access and per-feature pricing within their chosen vertical(s).

NOTE: Billing numbers are not included in this directive. Stripe integration must be wired (key exists in CLAUDE.md) as part of this implementation. PaywallGate component exists but is not functional — wire it to real plan data during this build.

### Step 7 — Circuit Box Activation

User confirms all selections and submits

System generates user record in podcaster_users table (new — see Section 4)

Dynamic Hawks schema entry created and populated from onboarding data

Circuit Box room asset loads with selected team theming

Split-screen transition: onboarding completion confirmation on left, Circuit Box preview loading on right

User lands in their personalized Circuit Box as home base

# SECTION 4 — DATABASE SCHEMA ADDITIONS (NEON POSTGRES)

All new tables follow the existing Neon Postgres import pattern using @/lib/db. All migrations must be written as numbered SQL files consistent with existing migration 003 pattern in the foai repo.

## 4.1  podcaster_users

Core user table for Per|Form for Podcasters accounts. Links to Firebase Auth UID.

## 4.2  podcaster_hawks_schema

Dynamic mission/vision/objectives schema per user. Mutable at any time. Hawks squadrons reference this to calibrate data aggregation priorities.

## 4.3  podcaster_integrations

Stores OAuth tokens and API keys for each user's connected platforms. All tokens encrypted at rest.

## 4.4  podcaster_content

Content items created within the Workbench. Tracks scripts, recordings, clips, and distributed posts.

## 4.5  podcaster_distribution_schedule

Autonomous content distribution queue. Powers the set-and-forget scheduling engine.

## 4.6  nba_players / mlb_players (New Sport Tables)

New tables scaffolded following the cfb_players pattern. Implement on the same Neon performdb connection.

Create nba_players and mlb_players as separate tables. Seed with Hawks squadron initial scrape on first deploy.

# SECTION 5 — CIRCUIT BOX (MISSION CONTROL)

## 5.1  Overview

The Circuit Box is the user's personalized home base within Per|Form for Podcasters. It renders as a high-rise penthouse office environment — the reference image provided by ACHEEVY shows the default state. The ACHIEVEMOR logo mounted on the back wall is the dynamic asset zone. All 32 NFL team renders, 30 NBA team renders, 30 MLB team renders, and 130+ college team renders are pre-generated and stored in GCS. On team selection during onboarding, the wall asset is swapped instantly from the preloaded set.

## 5.2  Room Personalization Logic

Do NOT regenerate the full room image on team selection. The room is a layered composite:

Base layer: Static penthouse room render (windows, furniture, rug, lighting) — stored in GCS

Wall asset layer: Team-specific preloaded image composited over the wall zone — swapped on selection

Color overlay layer: CSS or canvas-based color shift applied to room elements to match team palette

Avatar layer: ACHEEVY character or user-uploaded avatar rendered on top

This keeps load times fast and avoids re-rendering the entire scene per user.

## 5.3  Preloaded Team Asset Requirements

The following team assets must be pre-generated via Iller_Ang (Ideogram 3.0 for logo-legible assets) and stored in GCS before the vertical launches:

NOTE: College Football assets are 259 total renders. Stage the rollout — launch with FBS (134) first, add FCS in a subsequent release. NFL and NBA are the highest-priority renders for the April 15+ launch.

## 5.4  Avatar Customization

Keep avatar customization simple and functional for v1. No heavy 3D pipeline. Implementation approach:

Default: ACHEEVY character image (static PNG rendered at correct scale and position for the room)

Custom upload: User uploads photo — system masks and composites into the character position

Jersey customization: Simple overlay system — team jersey texture applied to character torso area

Helmet/head: User can upload custom head image or select team-branded helmet overlay

Cargo pants: Always retained from default — not customizable in v1

NOTE: v1 avatar system uses 2D compositing only. No Meshy or 3D asset pipeline required at this stage. Ship the compositing system; upgrade to 3D in v2.

## 5.5  Huddl Naming & White-Label

Users can rename their Circuit Box space to any custom name

This name appears as the display header in their dashboard and in the branded player interface

LFG tier users: full white-label — custom name plus ability to upload custom logo replacing ACHIEVEMOR branding in the player

Default naming pattern: '[Podcast Name] Command Center'

## 5.6  Circuit Box Navigation Panels

The following panels are accessible from within the Circuit Box — reference existing CircuitBox architecture in the foai repo for implementation pattern:

# SECTION 6 — WAR ROOM (TEAM DATA HUB)

## 6.1  Purpose

The War Room is the podcaster's data intelligence center for their chosen team and vertical. It aggregates current and historical data from the Hawks squadron into a consumable dashboard — designed for show preparation, player analysis, draft speculation, and on-air fact-checking.

## 6.2  War Room Panels by Vertical

### NFL War Room

Current Roster — full 53-man roster with position, jersey number, stats summary

Team Needs — positional needs ranked by priority (AI-derived from roster gaps and draft history)

Coaching Staff — HC, OC, DC, position coaches with tenure and background

Star Players — top 5-10 players by TIE grade or performance metric

Draft Picks — current year's available picks with round/value analysis

Last Season Stats — most recently completed full season team and player statistics

Injury Report — current availability status (Hawks scrape from official reports)

NOTE: NFL add-on (College Football): If user has the add-on, an additional panel shows — Incoming Draft Class — top prospects by position projected to go to their team based on need and draft slot.

### College Football War Room

Full Roster — cfb_players table query filtered by team — positions, stats, year

Coaching Staff — HC and coordinators

Transfer Portal Tracker — inbound and outbound transfer activity

Recruiting Rankings — current class commitments and rankings

Last Season Stats — team and individual player performance

Draft Eligibles — players on the roster eligible for the NFL draft (links to perform_players if in database)

NOTE: CFB add-on (NFL): If user has the add-on, shows NFL Destination — where current draft-eligible roster members are projected to land.

### NBA War Room

Current Roster — full roster from nba_players table with position and stats

Coaching Staff — HC and assistant coaches

Star Players — top performers by points, assists, rebounds, efficiency

Last Season Stats — team and player statistics from most recent complete season

Draft Picks — current year's available picks

COMING SOON — International pipeline panel — showing which international leagues are feeding the NBA

### MLB War Room

Current Roster — full 26-man active roster and 40-man roster

Coaching Staff — manager and coaching staff

Star Players — top performers by batting average, ERA, OPS, WAR

Last Season Stats — team and individual statistics from most recent complete season

Draft Picks — current year's available draft slots

COMING SOON — Farm system pipeline — top prospects by level (AAA, AA, A, Rookie)

# SECTION 7 — WORKBENCH (CONTENT CREATION & DISTRIBUTION)

## 7.1  Overview

The Workbench is the full content creation, editing, and autonomous distribution engine. It is accessed from the Circuit Box and lives at /podcasters/[user]/workbench. Reference the existing CircuitBox Workbench architecture in the foai repo — this directive extends it with podcaster-specific modules.

## 7.2  Module: Script & Planning

Rich text editor — script writing with section headers (intro, segment, outro)

Gemini-powered AI writing assist — topic expansion, talking points, SEO optimization for YouTube discovery

War Room data injection — pull player stats, team data directly into script from War Room data layer

Episode template library — reusable formats for recurring show segments (weekly recap, draft analysis, player spotlight)

Version history — save and restore previous script drafts

## 7.3  Module: Recording & Upload

Audio recording via browser microphone API — multi-track capable

Video recording via browser camera API

File upload: MP3, MP4, WAV, MOV — converts to standard format on ingest

GCS storage: all raw files stored at /podcasters/[user_id]/raw/[content_id]

Auto-transcription on ingest: Gemini speech-to-text generates transcript, stored in podcaster_content.transcript

## 7.4  Module: Content Segmentation (AI-Powered)

This is a primary differentiator. Podcasters upload full-length content and get AI-driven clip suggestions automatically.

TwelveLabs: /api/broadcast/index-video is LIVE — wire to podcaster upload flow

Video indexing: Full episode is indexed and searchable by topic, player name, team, keyword

Segment detection: TwelveLabs generates chapter markers and highlight moments automatically

Google embeddings: Semantic analysis extracts clips matching user-defined topics or themes (e.g., 'draft picks', 'injury news', 'hot take')

Clip output: System suggests short-form clips — 15s, 30s, 60s formats — for Shorts, Reels, TikTok

Manual override: User can define custom segment boundaries regardless of AI suggestions

Clip metadata: Each clip auto-tagged with title, description, hashtags via Gemini

Batch processing: Multiple clips extracted from single source video in one operation

All clips stored in GCS at /podcasters/[user_id]/clips/[content_id]/

## 7.5  Module: Audio Conditioning

Noise reduction and normalization — process via ElevenLabs audio API or GCP Audio Processing

EQ and compression applied for consistent podcast-quality output

Auto-leveling across multi-speaker recordings

Format conversion: export as MP3 (podcast), MP4 (video), WebM (web player)

Subtitle generation: auto-captions from transcript stored in podcaster_content, exportable as SRT

## 7.6  Module: Player Configuration

Branded player editor — user customizes player colors, logo, thumbnail display

Content organization: arrange episodes into series, playlists, highlight reels

Access control: set content as public, subscriber-only, or link-share only

Featured segments: pin specific clips to the landing page player

Autoplay and recommendation settings

Embed code generation for external sites

## 7.7  Module: Distribution & Automation

The autonomous distribution engine. Users configure their posting rules once and the system handles all publishing.

### YouTube Studio Integration

OAuth2 authentication via existing Firebase Auth pattern — add YouTube scope: youtube.force-ssl

YouTube Data API v3 (key is LIVE in CLAUDE.md) — wire to upload endpoint

Direct video upload from Workbench to YouTube channel

Automated metadata: title, description, tags, category auto-populated from Gemini analysis

Thumbnail: auto-generated or user-uploaded, pushed to YouTube on upload

Scheduled publishing: upload now or schedule for specific date/time

Playlist auto-assignment: videos sorted into playlists by vertical or content type

YouTube Analytics: pull channel performance data into Workbench analytics panel

### Social Platform APIs

All social integrations use OAuth2 stored encrypted in podcaster_integrations table:

### Automation Rules Engine

User defines posting rules in plain language: 'Publish full episode to YouTube every Monday at 10am'

Clips auto-distributed: 'Post 3 highlight clips to Instagram, TikTok, and Twitter on Tuesday/Wednesday/Thursday at 5pm'

Rules stored in podcaster_distribution_schedule — n8n webhook on vps2 executes on schedule

Set-and-forget: user configures pipeline once, system runs autonomously

Failure handling: retry logic (max 3 attempts), error logged in distribution_schedule.error_message, user notified

Dashboard shows upcoming queue, published history, and failed posts with error details

### Blotato Competitive Reference

Blotato (blotato.com) is an existing social media automation service. Build Per|Form for Podcasters to outperform Blotato in the following areas:

AI content segmentation — Blotato does not offer automatic clip generation from long-form content

Sports-specific data integration — Blotato has no sports data layer; podcasters get War Room data in their workflow

Built-in content creation — Blotato is distribution-only; this is a full creation-to-distribution studio

Branded audience player — Blotato has no first-party player; this gives podcasters their own embedded player

Script-to-distribution pipeline — Blotato starts at distribution; this starts at the blank page

# SECTION 8 — HAWKS SQUADRON DATA ARCHITECTURE

## 8.1  Dynamic User Schema

Each user's onboarding data — mission, vision, objectives, needs — is stored in podcaster_hawks_schema and treated as a living document. Hawks squadrons reference this schema to determine what data to scrape and prioritize. When users update their mission, the schema increments version and the Hawks recalibrate.

## 8.2  Vertical-Specific Squadron Configurations

Hawks squadrons are configured per vertical using the existing acheevy_skills.py routing pattern. Each vertical has a predefined scraping target list:

### College Football Hawks

FBS rosters: all 134 teams — player name, position, year, stats (uses cfb_players — already seeded)

FCS rosters: all 125 teams — new scrape required, extend cfb_players with fcs_flag boolean

Transfer portal: scrape 247Sports transfer tracker, On3, Rivals

Recruiting: scrape 247Sports composite rankings, On3 industry rankings

Coaching staff: all FBS/FCS head coaches and coordinators

Scrape frequency: daily roster updates, real-time transfer portal activity

### NFL Hawks

32-team rosters: official NFL.com roster pages

Depth charts: ESPN and official team sites

Injury reports: official NFL injury report (Wed/Thu/Fri practice participation)

Coaching staff: all 32 teams HC, OC, DC, position coaches

Cap data: OverTheCap.com for salary cap and contract status

Existing data: perform_players, nfl_draft_picks, nfl_combine — already live and seeded

Scrape frequency: daily roster/injury updates, real-time transaction wire

### NBA Hawks

30-team rosters: NBA.com official rosters

Player stats: Basketball-Reference.com current season stats

Coaching staff: ESPN coaching directories

Schedule and results: NBA.com API

Scrape frequency: daily roster updates, post-game stat updates

COMING SOON — International pathway scraping — EuroLeague, national leagues, FIBA events

### MLB Hawks

30-team rosters: MLB.com official rosters (active + 40-man)

Player stats: Baseball-Reference.com current season stats

Coaching staff: ESPN coaching directories

Schedule and results: MLB.com Stats API

Scrape frequency: daily roster updates, post-game stat updates

COMING SOON — Farm system and minor league scraping — MiLB.com, Baseball-Reference minors

## 8.3  Custom Hawks Deployment

Premium, Bucket List, and LFG tier users can deploy custom Hawks squadrons for data sources specific to their podcast. Custom Hawks are configured in the Workbench and executed by the Sqwaadrun fleet using existing acheevy_skills.py routing:

Social sentiment tracking (Reddit r/nfl, r/nba, Twitter team hashtags)

Betting odds and fantasy sports performance data

News aggregation from sports journalism sources

Custom stat databases or proprietary sources

Webhook-triggered scrapes on external events (e.g., trade news, injury reports)

NOTE: Custom Hawks are subject to plan-gated rate limits. BMC users pay per scrape run at premium rate. Premium: 10 custom scrape runs/month. Bucket List: 50 runs/month. LFG: unlimited.

# SECTION 9 — GOOGLE APIS & AI INTEGRATION

## 9.1  Google Ecosystem — Already Wired (Use Existing Credentials)

The following Google services are live in the ai-managed-services GCP project and must be leveraged — do not create new service accounts or credentials:

## 9.2  YouTube Data API v3 — Wire Now

YouTube API key is live in CLAUDE.md. This is the first time it is being wired to production endpoints. Implementation requirements:

Endpoint: POST /api/podcasters/youtube/upload — accept video file, metadata, schedule time

OAuth2 scope: youtube.force-ssl — user authorizes during onboarding Step 1 optional or in Settings

Token storage: encrypted in podcaster_integrations table

Upload flow: Workbench → GCS staging → YouTube resumable upload API → confirm and store youtube_video_id in podcaster_content

Metadata: auto-populate title, description, tags from Gemini analysis of transcript and content type

Scheduling: YouTube scheduled publish via publishedAt parameter in upload request

Analytics pull: GET /api/podcasters/youtube/analytics — query YouTube Analytics API v2 for channel metrics

Playlist management: POST /api/podcasters/youtube/playlist — create and assign videos to playlists

## 9.3  Gemini for Content Intelligence

Script writing: gemini-2.0-flash via Vertex AI — system prompt tuned for sports podcast content creation

SEO optimization: analyze script/transcript and generate YouTube-optimized title, description, 10 hashtags

Thumbnail generation: Gemini vision + Ideogram 3.0 — generate thumbnail concepts from transcript

Content categorization: classify each piece of content by vertical, team, topic, and content type

Clip titling: auto-generate title and description for each extracted clip

Show prep brief: on War Room open, Gemini generates a 3-5 point show prep brief based on recent team news and user's mission statement

## 9.4  TwelveLabs — Wire to Podcaster Upload

TwelveLabs key is live and /api/broadcast/index-video exists. Wire this endpoint to the podcaster upload flow:

On video upload to Workbench: auto-submit to TwelveLabs index via /api/broadcast/index-video

Store TwelveLabs video_id in podcaster_content.metadata.twelvelabs_id

POST /api/podcasters/content/segments — query TwelveLabs for chapter detection and highlight moments

Merge TwelveLabs segment data with Google embeddings semantic analysis

Return segment suggestions to Workbench UI as clickable clip recommendations

## 9.5  Google Analytics & SEO

For LFG and Bucket List users, offer Google Analytics property setup assistance:

Help users create a GA4 property for their podcast website or branded player

Install GA4 tracking on their branded player page

Surface key audience metrics in the Workbench analytics panel

Google Search Console: guide users to verify and connect their site for SEO tracking

# SECTION 10 — BRANDED AUDIENCE PLAYER

## 10.1  Overview

Each podcaster gets a branded, audience-facing player hosted at a sub-path or custom domain. This is separate from the podcaster's own dashboard — it is what their listeners and viewers see. The player surfaces the podcaster's content in an ESPN-style segment format, not just a raw episode list.

## 10.2  Player Features

Full-length episode playback — audio and video

Segment cycling — highlighted clips displayed as browsable short-form cards

Hot tape section — featured clips pinned by the podcaster for discovery

Playlist navigation — episodes organized by series, team, or topic

Autoplay — next segment or episode queues automatically

Responsive — optimized for mobile, tablet, and desktop

Branded — team colors, podcast logo, custom name from Huddl white-label settings

Embed code — podcasters can embed the player on external sites

## 10.3  Player Routes

## 10.4  Player Permissions by Plan

# SECTION 11 — IMPLEMENTATION QUEUE & SEQUENCING

## 11.1  Phase 1 — Foundation (Post April 15)

Wire the core multi-tenant infrastructure before any podcaster-facing features:

Stripe integration — wire PaywallGate to real plans, implement plan gating middleware

Multi-tenant user model — podcaster_users table, plan-based access control middleware

assertVertical() extension — add podcaster sub-vertical to existing pattern

Route structure — scaffold all /podcasters/ routes with auth guards

Neon schema migration — podcaster_users, podcaster_hawks_schema, podcaster_integrations, podcaster_content, podcaster_distribution_schedule

NBA + MLB table scaffolds — nba_players, mlb_players, nba_teams, mlb_teams

## 11.2  Phase 2 — Onboarding & Circuit Box

Paperform + stepper onboarding flow at /podcasters/onboarding

Team selection UI — logo card grids for all four verticals

Circuit Box room rendering — layered composite system (base + wall asset + color overlay + avatar)

Preloaded team asset generation via Iller_Ang — NFL (32) and NBA (30) first

Avatar upload and basic compositing system

Huddl naming and white-label settings

War Room shell — panels stubbed with data-fetch hooks

## 11.3  Phase 3 — War Room Data Layer

NFL Hawks squadron — wire to perform_players, nfl_draft_picks, nfl_combine for existing data

CFB Hawks squadron — extend cfb_players with FCS flag and coaching staff

NBA Hawks squadron — initial scrape to seed nba_players and nba_teams

MLB Hawks squadron — initial scrape to seed mlb_players and mlb_teams

War Room UI — all panels live with real data per vertical

Add-on bundle logic — NFL/CFB cross-vertical panels

## 11.4  Phase 4 — Workbench & Content Tools

Script editor with Gemini writing assist

Audio/video upload and GCS storage pipeline

Auto-transcription via Gemini speech-to-text on ingest

TwelveLabs wiring — connect /api/broadcast/index-video to podcaster upload flow

Content segmentation UI — display TwelveLabs chapter data as clickable clip suggestions

Audio conditioning pipeline

Clip extraction and GCS storage

## 11.5  Phase 5 — Distribution & Automation

YouTube Studio OAuth2 flow and upload endpoint

Social platform OAuth integrations — Instagram, TikTok, Twitter/X, Facebook, LinkedIn

Automation rules engine — n8n webhook execution for scheduled posts

Branded audience player — /p/[slug] and /embed/[slug]

Distribution analytics — pull from YouTube Analytics API v2 and social platform APIs

## 11.6  Phase 6 — Polish & Coming Soon Stubs

Coming Soon placeholders — College Basketball, International Basketball, UFL, MLB Farm Systems

Custom Hawks deployment UI in Workbench

Google Analytics property setup wizard

FCS team renders (125 college teams — lower priority, post-FBS)

BMC token balance display and per-feature cost breakdown

# SECTION 12 — SECURITY REQUIREMENTS

Security requirements for Per|Form for Podcasters follow the same DoD-aligned standards applied in the existing Per|Form platform (2 rounds of security audit completed, 26 findings resolved). All new endpoints and data stores must meet the same standards.

OAuth2 tokens: AES-256 encrypted at rest in podcaster_integrations — never stored in plaintext

API keys: all third-party keys in environment variables only — never hardcoded (same standard as existing 5-script cleanup)

Auth guards: requireAuth() on all /podcasters/ routes and /api/podcasters/* endpoints

Plan gating: plan_tier check middleware on feature-gated endpoints — not just UI gates

Input validation: all user-submitted content (script text, titles, descriptions) sanitized before database write

SSRF protection: extend existing private IP blocking to all new GCS and external API calls

XSS: escape all user-provided text rendered in player and Circuit Box templates

Timing-safe key comparison: extend to all new webhook and API auth routes

Rate limiting: per-user rate limits on Hawks scrape dispatch and distribution schedule API

CSP headers: extend existing Content-Security-Policy to cover new routes and player embed

Semgrep + Trivy: run on all new code before merge — same CI gates as existing codebase

# SECTION 13 — AGENT RESPONSIBILITIES

Per|Form for Podcasters is built and maintained by the ACHIEVEMOR agent workforce. The following role assignments apply to this vertical:

))))BAMARAM((((

Per|Form for Podcasters — Platform Directive v1.0

Approved: ACHEEVY  |  April 2026  |  ACHIEVEMOR  |  CONFIDENTIAL


---
name: virtual-office
description: A comprehensive Virtual Office CRM system that replaces HubSpot + Monday + Notion + Zapier. Features contact management with LinkedIn enrichment, pipeline/CRM tracking, task management, Telegram bot interface, 13 AI-powered automation tools, and analytics dashboard.
license: MIT
metadata:
  version: 1.0.0
  author: OpenClaw CRM Team
  category: business
  updated: 2026-03-26
  features: 47
---

# Virtual Office CRM

A complete business operating system consolidating HubSpot, Monday, Notion, and Zapier into a single AI-powered platform.

## Quick Start

```bash
clawhub install virtual-office
openclaw skill virtual-office init
openclaw skill virtual-office start
```

## Core Modules

### 1. Contact Management (9 features)
- Contact profiles with custom fields
- LinkedIn profile enrichment
- Email integration (Gmail/Outlook)
- Contact scoring & segmentation
- Duplicate detection & merging
- Import/Export (CSV, Excel)
- Activity timeline
- Tags & categorization
- Relationship strength indicators

### 2. Pipeline & CRM (8 features)
- Custom pipeline stages
- Deal value forecasting
- Win/loss rate analytics
- Stage automation rules
- Revenue projections
- Pipeline velocity tracking
- Quote/proposal generation
- Contract management

### 3. Task Management (9 features)
- Kanban boards
- Calendar view & scheduling
- Task dependencies
- Recurring tasks
- Time tracking
- Priority matrix
- Team workload view
- Milestone tracking
- Gantt charts

### 4. Knowledge Base (8 features)
- Rich text editor (Markdown)
- Page nesting & hierarchy
- Templates library
- Full-text search
- Version history
- Comment threads
- @mentions system
- Export to PDF/HTML

### 5. Automation Engine (13 AI tools)
1. Lead Scoring AI
2. Email Responder
3. Meeting Scheduler
4. Follow-up Reminder
5. Data Enricher
6. Content Generator
7. Sentiment Analyzer
8. Task Auto-Assign
9. Duplicate Finder
10. Report Builder
11. Notification Router
12. Workflow Builder
13. Smart Import

### 6. Telegram Bot Interface
Commands: /contact, /deal, /task, /pipeline, /today, /remind, /note, /report

### 7. Analytics Dashboard
Revenue tracking, sales funnel, productivity metrics, pipeline health, growth trends.

## Database Schema

Core entities: contacts, deals, tasks, projects, pages, activities, automations.

## API Endpoints

Standard REST API for all CRUD operations on contacts, deals, tasks, pages, dashboard.

## Deployment

Node.js 18+, SQLite/PostgreSQL, optional Redis.

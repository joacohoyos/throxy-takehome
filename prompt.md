# Lead Scoring Application - Build Prompt

## Overview

Build a lead scoring application that allows users to upload CSV files containing leads, processes them through AI to generate scores based on a persona specification, and displays results in a real-time updating table.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Broadcast
- **Queue**: @vercel/queue
- **AI**: Vercel AI SDK with Google Gemini

## CSV Schema

The application accepts CSV files with the following columns:

| Column | Description |
|--------|-------------|
| `account_name` | Company/account name |
| `lead_first_name` | Lead's first name |
| `lead_last_name` | Lead's last name |
| `lead_job_title` | Lead's job title/position |
| `account_domain` | Company website domain |
| `account_employee_range` | Company size (e.g., "11-50", "51-200", "1001-5000", "10001+") |
| `account_industry` | Industry vertical |

## Core Features

### 1. CSV Upload

- Frontend component to upload CSV files
- Parse and validate CSV structure
- Send parsed leads to the server
- Store leads in Supabase with status `pending`
- Automatically enqueue leads for processing after upload

### 2. Queue Processing

- Use `@vercel/queue` for processing leads
- Each queue message contains a single lead to be scored
- Consumer calls Gemini AI to score the lead
- Update lead status to `processing` → `completed` or `error`

### 3. AI Lead Scoring

Score leads from 0-10 based on the persona specification with the following weights:

- **60% weight**: Position/Job Title fit
  - Match against ideal job titles per company size
  - Consider seniority level relevance
  - Check for hard/soft exclusions

- **40% weight**: Business Type fit
  - Industry alignment with target verticals (manufacturing, education, healthcare)
  - Company selling into complex verticals
  - Qualification signals (positive/negative)

The AI prompt should reference the full persona specification for scoring criteria.

### 4. AI Cost Tracking

Track the following statistics per AI call in the database:

- Cost per call (calculated from token usage)
- Input tokens used
- Output tokens used
- Model used (e.g., "gemini-1.5-pro")

### 5. Real-time Updates

- Use Supabase Broadcast to push updates to connected clients
- Events to broadcast:
  - New lead processed (with score)
  - Processing progress (X of Y leads completed)
- Frontend subscribes and updates table in real-time

### 6. Leads Table

- Display all leads from the database (unified view across all uploads)
- Columns: Name, Job Title, Company, Company Size, Industry, Score, Status
- Server-side sorting (default: score descending)
- Show processing progress indicator (pending leads count)
- CSV export functionality for scored leads

## Database Schema

### `leads` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `account_name` | text | Company name |
| `lead_first_name` | text | First name |
| `lead_last_name` | text | Last name |
| `lead_job_title` | text | Job title |
| `account_domain` | text | Company domain |
| `account_employee_range` | text | Company size range |
| `account_industry` | text | Industry |
| `score` | numeric | AI-generated score (0-10) |
| `score_reasoning` | text | AI explanation for score |
| `status` | text | pending, processing, completed, error |
| `created_at` | timestamp | Upload timestamp |
| `processed_at` | timestamp | When scoring completed |

### `ai_usage` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `lead_id` | uuid | Foreign key to leads |
| `model` | text | Model used |
| `input_tokens` | integer | Input token count |
| `output_tokens` | integer | Output token count |
| `cost` | numeric | Calculated cost in USD |
| `created_at` | timestamp | Timestamp |

## Authentication

No authentication required - this is an internal tool.

## API Endpoints

### `POST /api/leads/upload`
- Accepts CSV file
- Parses and validates
- Stores leads in database
- Enqueues leads for processing
- Returns upload summary

### `GET /api/leads`
- Query params: `sortBy` (column name), `sortOrder` (asc/desc)
- Returns leads sorted by specified field
- Default sort: score descending

### `GET /api/leads/progress`
- Returns current processing status
- Total leads, pending, completed, errors

### `POST /api/queue/process` (Vercel Queue consumer)
- Processes single lead from queue
- Calls Gemini AI for scoring
- Updates database with result
- Broadcasts update via Supabase

### `GET /api/leads/export`
- Returns CSV of all completed leads with scores

## Persona Specification Reference

The AI scoring prompt should incorporate the full persona specification from `persona_spec.md`, which defines:

- Lead targeting by company size (Startup, SMB, Mid-Market, Enterprise)
- Priority job titles per segment
- Department priorities
- Seniority relevance matrix
- Hard and soft exclusions
- Industry considerations
- Qualification signals (positive and negative)

## UI Components

1. **Upload Section**: Drag-and-drop or click-to-upload CSV interface
2. **Progress Bar**: Shows processing progress with counts
3. **Leads Table**: Sortable table with all leads and scores
4. **Export Button**: Download scored leads as CSV

## Architecture Notes

- Keep components logicless; move business logic to custom hooks
- Use TanStack Query for server state (leads data)
- Use Zustand for UI state (upload progress, filters)
- Follow the existing project patterns in `CLAUDE.md`

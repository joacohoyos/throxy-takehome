# Plan: Lead Scoring Application

## Executive Summary

This plan implements a lead scoring application that enables users to upload CSV files containing sales leads, processes them through Google Gemini AI to generate fit scores based on Throxy's ideal customer profile, and displays results in a real-time updating table. The application uses Next.js 16 App Router with TypeScript, Supabase for database and real-time updates, Vercel Queue for async processing, and the Vercel AI SDK for Gemini integration. The scoring algorithm weights 60% on job title/position fit and 40% on business type fit, following the detailed persona specification.

---

## Dependencies

### NPM Packages to Install

```bash
# Core UI & State Management
pnpm add @tanstack/react-query zustand

# Database & Real-time
pnpm add @supabase/supabase-js @supabase/ssr

# Queue Processing (Vercel Queues - works locally via `vercel dev`)
pnpm add @vercel/queue

# AI Integration (using Gemini 3.0 Flash)
pnpm add ai @ai-sdk/google

# CSV Parsing
pnpm add papaparse
pnpm add -D @types/papaparse

# Utilities
pnpm add clsx tailwind-merge class-variance-authority lucide-react zod

# shadcn/ui (CLI-based)
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input table progress badge dropdown-menu sonner
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=

# AI cost tracking rates (USD per 1M tokens for Gemini 3.0 Flash)
GEMINI_INPUT_TOKEN_COST=0.10
GEMINI_OUTPUT_TOKEN_COST=0.40
```

---

## Technical Architecture

### Directory Structure

```
throxy/
├── app/
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Main dashboard page
│   ├── globals.css                   # Global styles + Tailwind
│   └── api/
│       ├── leads/
│       │   ├── upload/route.ts       # POST - CSV upload & enqueue
│       │   ├── route.ts              # GET - Fetch leads with sorting
│       │   ├── progress/route.ts     # GET - Processing progress stats
│       │   └── export/route.ts       # GET - Export CSV
│       ├── analytics/
│       │   └── route.ts              # GET - AI usage analytics
│       └── queue/
│           └── process/route.ts      # POST - Queue consumer for scoring
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── providers/
│   │   ├── query-provider.tsx        # TanStack Query provider
│   │   └── realtime-provider.tsx     # Supabase realtime context
│   ├── csv-upload.tsx                # Upload dropzone component
│   ├── leads-table.tsx               # Main leads display table
│   ├── progress-indicator.tsx        # Processing progress bar
│   ├── export-button.tsx             # CSV export button
│   └── score-badge.tsx               # Visual score indicator
├── hooks/
│   ├── use-leads.ts                  # TanStack Query hook for leads
│   ├── use-upload.ts                 # Upload mutation hook
│   ├── use-progress.ts               # Progress polling hook
│   ├── use-realtime-leads.ts         # Supabase realtime subscription
│   └── use-export.ts                 # CSV export hook
├── stores/
│   ├── upload-store.ts               # Upload state (progress, errors)
│   └── table-store.ts                # Table state (sorting)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Supabase client
│   │   └── admin.ts                  # Service role client for queue
│   ├── query-client.ts               # TanStack Query config
│   ├── csv-parser.ts                 # CSV parsing & validation
│   ├── ai/
│   │   ├── scoring-prompt.ts         # AI prompt construction
│   │   └── gemini-client.ts          # Vercel AI SDK setup
│   └── utils.ts                      # cn() helper
├── types/
│   ├── lead.ts                       # Lead type definitions
│   ├── csv.ts                        # CSV schema types
│   └── api.ts                        # API response types
├── constants/
│   └── persona.ts                    # Persona spec as structured data
└── supabase/
    ├── config.toml                   # Supabase CLI config
    └── migrations/
        ├── 001_create_leads_table.sql
        ├── 002_create_ai_usage_table.sql
        └── 003_enable_rls.sql
```

### Database Schema (Supabase Migrations)

**Migration 001: Create Leads Table**
```sql
-- supabase/migrations/001_create_leads_table.sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  lead_first_name TEXT NOT NULL,
  lead_last_name TEXT NOT NULL,
  lead_job_title TEXT NOT NULL,
  account_domain TEXT NOT NULL,
  account_employee_range TEXT NOT NULL,
  account_industry TEXT,
  score NUMERIC(3, 1),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT valid_score CHECK (score IS NULL OR (score >= 0 AND score <= 10))
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score_desc ON leads(score DESC NULLS LAST);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
```

**Migration 002: Create AI Usage Table**
```sql
-- supabase/migrations/002_create_ai_usage_table.sql
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost NUMERIC(10, 8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_lead_id ON ai_usage(lead_id);
```

**Migration 003: Enable RLS**
```sql
-- supabase/migrations/003_enable_rls.sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all on ai_usage" ON ai_usage FOR ALL USING (true);
```

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leads/upload` | POST | Accept CSV, parse, validate, store leads, enqueue for processing |
| `/api/leads` | GET | Fetch leads with sorting (default: score DESC) |
| `/api/leads/progress` | GET | Return processing stats (total, pending, completed, error) |
| `/api/leads/export` | GET | Return CSV of completed leads with scores |
| `/api/analytics` | GET | Return AI usage stats: total cost, avg cost per lead, total tokens, avg tokens |
| `/api/queue/process` | POST | Queue consumer - score single lead with Gemini 3.0 Flash |

### AI Scoring Prompt

The scoring prompt incorporates the full persona specification:
- **60% weight**: Position/Job Title fit (title match per company size, seniority relevance, department priority)
- **40% weight**: Business Type fit (industry alignment, company characteristics)

Key scoring rules from persona_spec.md:
- Startups (1-50): Founders/CEOs are 5/5
- SMB (51-200): VP/Director of Sales/Sales Dev are 5/5
- Mid-Market (201-1000): VP/Director Sales Development are 5/5
- Enterprise (1000+): VP Sales Development, VP Inside Sales are 5/5
- Hard exclusions (score 0-2): CEO at enterprise, CFO, CTO, HR, Legal, Customer Success
- Target companies selling INTO manufacturing, education, healthcare

---

## Feature List

1. **CSV Upload** - Drag-and-drop or click-to-browse interface. Validates CSV structure, stores leads as "pending", automatically enqueues for AI scoring.

2. **Queue Processing** - @vercel/queue processes leads individually. Enables reliable async processing, error recovery, and rate limiting.

3. **AI Lead Scoring** - Gemini 3.0 Flash scores leads 0-10 with reasoning. Uses persona specification for 60% title fit + 40% business fit weighting.

4. **AI Cost Tracking** - Logs input/output tokens, model, and calculated cost per AI call to `ai_usage` table.

5. **Real-time Updates** - Supabase Broadcast with self-send for live updates. Queue consumer sends broadcast events after scoring. Table updates without refresh, toast notifications on completion.

6. **Leads Table** - Unified table with sortable columns (default: score DESC). Shows Name, Title, Company, Size, Industry, Score, Status with visual badges.

7. **Progress Indicator** - Progress bar with counts for pending/processing/completed/error. Updates via polling and real-time events.

8. **CSV Export** - Download all scored leads as CSV including original data + score.

---

## Task Checklist

### Phase 1: Project Setup & Foundation

#### 1.1 Install Core Dependencies
Install npm packages for state management and data fetching:
- `@tanstack/react-query` - server state management
- `zustand` - client state management
- `@supabase/supabase-js` and `@supabase/ssr` - database client
- `papaparse` and `@types/papaparse` - CSV parsing
- `zod` - schema validation
- `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react` - utilities

#### 1.2 Install AI & Queue Dependencies
Install npm packages for AI scoring and queue processing:
- `ai` and `@ai-sdk/google` - Vercel AI SDK with Gemini
- `@vercel/queue` - queue processing

#### 1.3 Initialize shadcn/ui
Run `pnpm dlx shadcn@latest init` and add components:
- button, card, input, table, progress, badge, dropdown-menu, sonner

#### 1.4 Create Environment Configuration
Create `.env.local` and `.env.example` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GEMINI_INPUT_TOKEN_COST`, `GEMINI_OUTPUT_TOKEN_COST`

#### 1.5 Create Directory Structure
Create folders: `components/`, `components/ui/`, `components/providers/`, `hooks/`, `stores/`, `lib/`, `lib/supabase/`, `lib/ai/`, `types/`, `constants/`

#### 1.6 Create Utility Files
- Create `lib/utils.ts` with `cn()` helper for className merging
- Create `types/lead.ts` with Lead, LeadStatus, and API response types

---

### Phase 2: Database Setup (Supabase Migrations)

#### 2.1 Initialize Supabase CLI
Run `supabase init` to create `supabase/` directory with config. Link to existing project with `supabase link --project-ref <project-id>`.

#### 2.2 Create Leads Table Migration
Create migration file `supabase/migrations/001_create_leads_table.sql`:
- Create `leads` table with columns: id (UUID), account_name, lead_first_name, lead_last_name, lead_job_title, account_domain, account_employee_range, account_industry, score, status, error_message, created_at, processed_at
- Add CHECK constraint for status enum
- Add CHECK constraint for score range (0-10)
- Create indexes for status, score (DESC NULLS LAST), created_at

#### 2.3 Create AI Usage Table Migration
Create migration file `supabase/migrations/002_create_ai_usage_table.sql`:
- Create `ai_usage` table with columns: id (UUID), lead_id (FK), model, input_tokens, output_tokens, cost, created_at
- Add foreign key constraint referencing leads(id) with ON DELETE CASCADE
- Create index for lead_id

#### 2.4 Create RLS Policies Migration
Create migration file `supabase/migrations/003_enable_rls.sql`:
- Enable RLS on both tables
- Create permissive policies allowing all operations (no auth required)

#### 2.5 Apply Migrations
Run `supabase db push` to apply all migrations to the remote database. Verify schema in Supabase Studio.

---

### Phase 3: CSV Upload UI

#### 3.1 Create Supabase Browser Client
Create `lib/supabase/client.ts` with `createBrowserClient` for client-side Supabase access.

#### 3.2 Create TanStack Query Provider
Create `components/providers/query-provider.tsx` with QueryClientProvider wrapper component.

#### 3.3 Create Upload State Store
Create `stores/upload-store.ts` Zustand store with: isUploading, error, setUploading(), setError(), reset().

#### 3.4 Create CSV Upload Component
Create `components/csv-upload.tsx` with drag-and-drop zone using native HTML5 drag events. Display upload state from Zustand store. Accept .csv files only.

#### 3.5 Update App Layout
Update `app/layout.tsx` to wrap children with QueryProvider. Add Toaster component from sonner for notifications.

#### 3.6 Create Main Page Layout
Rewrite `app/page.tsx` with header "Lead Scoring" and CSVUpload component. Basic responsive layout with Tailwind.

#### 3.7 TEST: Upload UI
Verify upload component renders, accepts file drag/drop and click selection, shows file name after selection.

---

### Phase 4: CSV Upload API

#### 4.1 Create Supabase Server Client
Create `lib/supabase/server.ts` with `createServerClient` using cookies for server-side Supabase access.

#### 4.2 Create CSV Parser Utility
Create `lib/csv-parser.ts` using papaparse to parse CSV files. Validate required columns with zod schema. Return typed array of lead rows or validation errors. Handle edge cases: quoted fields, international characters, missing industry.

#### 4.3 Create Upload API Endpoint
Create `app/api/leads/upload/route.ts`:
- Accept POST with multipart/form-data
- Parse CSV using csv-parser utility
- Validate all rows have required fields
- Bulk insert leads to Supabase with status "pending"
- Return `{ success: boolean, count: number, leadIds: string[] }`

#### 4.4 Create Upload Hook
Create `hooks/use-upload.ts` with `useMutation` from TanStack Query. Handle FormData creation, call upload API, update Zustand store with progress/error, invalidate queries on success, show toast notifications.

#### 4.5 Integrate Upload Component with Hook
Update `components/csv-upload.tsx` to use `useUpload` hook. Call mutation on file selection. Show loading state during upload. Show success/error toasts.

#### 4.6 TEST: CSV Upload Flow
Upload leads.csv file. Verify 200 leads appear in Supabase `leads` table with status "pending".

---

### Phase 5: Leads Table

#### 5.1 Create Table State Store
Create `stores/table-store.ts` Zustand store with: sortBy (default: "score"), sortOrder (default: "desc"), setSorting().

#### 5.2 Create Get Leads API Endpoint
Create `app/api/leads/route.ts`:
- Accept GET with query params: sortBy, sortOrder
- Query Supabase with dynamic ORDER BY (default: score DESC NULLS LAST)
- Return `{ leads: Lead[], total: number }`

#### 5.3 Create Leads Hook
Create `hooks/use-leads.ts` with `useQuery` from TanStack Query. Read sorting params from table store. Refetch when sorting changes.

#### 5.4 Create Score Badge Component
Create `components/score-badge.tsx` displaying score with color coding:
- 0-2: red (poor fit)
- 3-4: orange (weak fit)
- 5-6: yellow (moderate fit)
- 7-8: green (strong fit)
- 9-10: emerald (excellent fit)
- null: gray (pending)

#### 5.5 Create Leads Table Component
Create `components/leads-table.tsx` using shadcn/ui Table. Columns: Name, Job Title, Company, Size, Industry, Score, Status. Clickable headers for sorting. Use useLeads hook for data. Display ScoreBadge for scores. Show status badges (pending/processing/completed/error).

#### 5.6 Add Leads Table to Page
Update `app/page.tsx` to include LeadsTable component below CSVUpload.

#### 5.7 TEST: Leads Table
Verify table displays uploaded leads. Click column headers to test sorting. Verify score column sorts DESC by default.

---

### Phase 6: AI Scoring & Queue Processing

#### 6.1 Create Supabase Admin Client
Create `lib/supabase/admin.ts` with service role client for server-side operations (bypasses RLS).

#### 6.2 Create Persona Constants
Create `constants/persona.ts` with structured data from persona_spec.md:
- Company size categories and employee ranges
- Job title priorities by company size
- Department priorities
- Seniority relevance matrix
- Hard and soft exclusions lists
- Positive and negative signals

#### 6.3 Create AI Scoring Prompt Builder
Create `lib/ai/scoring-prompt.ts` with `buildScoringPrompt(lead)` function. Include full persona specification in prompt. Request JSON output with score (0-10) field. Weight 60% on title fit, 40% on business fit.

#### 6.4 Create Gemini Client
Create `lib/ai/gemini-client.ts`:
- Configure Vercel AI SDK with Google provider
- Use model "gemini-3.0-flash"
- Create `scoreLead(lead)` function that calls Gemini, parses JSON response
- Return score + token usage (input/output tokens)
- Calculate cost from token counts

#### 6.5 Create Queue Consumer Endpoint
Create `app/api/queue/process/route.ts`:
- Accept POST with `{ leadId: string }`
- Fetch lead from Supabase by ID
- Update status to "processing"
- Call scoreLead() from Gemini client
- Update lead with score, status "completed", processed_at timestamp
- Insert usage record to ai_usage table
- On error: update status to "error" with error_message
- Return success/error response

#### 6.6 Update Upload API to Enqueue Leads
Update `app/api/leads/upload/route.ts`:
- After bulk insert, enqueue each lead ID using @vercel/queue `send()` function
- Target topic/queue for processing

#### 6.7 TEST: AI Scoring
Upload a small CSV (5-10 leads). Verify leads transition from pending → processing → completed. Verify scores are populated. Check ai_usage table for token/cost records.

---

### Phase 7: Real-time Updates (Supabase Broadcast)

#### 7.1 Create Realtime Hook
Create `hooks/use-realtime-leads.ts`:
- Subscribe to Supabase Broadcast channel "leads-updates" with `{ config: { broadcast: { self: true } } }`
- Listen for 'lead-scored' broadcast events
- On event, invalidate leads and progress queries
- Show toast notification with lead name and score

#### 7.2 Update Queue Consumer to Broadcast
Update `app/api/queue/process/route.ts`:
- After scoring a lead, send broadcast message to "leads-updates" channel
- Event type: 'lead-scored'
- Payload: `{ leadId, leadName, score, status }`

#### 7.3 Integrate Realtime in Page
Update `app/page.tsx` to call `useRealtimeLeads()` hook for automatic updates.

#### 7.4 TEST: Real-time Updates
Open app in two browser tabs. Upload CSV in one tab. Verify both tabs update simultaneously as leads are scored. Verify toast notifications appear for completed leads.

---

### Phase 8: Progress Indicator

#### 8.1 Create Progress API Endpoint
Create `app/api/leads/progress/route.ts`:
- Query Supabase for count by status
- Return `{ total: number, pending: number, processing: number, completed: number, error: number }`

#### 8.2 Create Progress Hook
Create `hooks/use-progress.ts` with `useQuery` from TanStack Query. Enable refetchInterval (2 seconds) when pending + processing > 0. Disable polling when all complete.

#### 8.3 Create Progress Indicator Component
Create `components/progress-indicator.tsx`:
- Display progress bar (completed / total * 100)
- Show counts: "X pending, Y processing, Z completed, W errors"
- Animate progress bar changes
- Hide when total is 0

#### 8.4 Add Progress Indicator to Page
Update `app/page.tsx` to include ProgressIndicator between CSVUpload and LeadsTable.

#### 8.5 TEST: Progress Indicator
Upload CSV. Verify progress bar updates as leads are processed. Verify counts are accurate. Verify polling stops when complete.

---

### Phase 9: Export & Analytics

#### 9.1 Create Export API Endpoint
Create `app/api/leads/export/route.ts`:
- Query all completed leads from Supabase
- Generate CSV string with columns: account_name, lead_first_name, lead_last_name, lead_job_title, account_domain, account_employee_range, account_industry, score
- Return with Content-Type: text/csv and Content-Disposition: attachment header

#### 9.2 Create Export Hook
Create `hooks/use-export.ts`:
- Fetch from export API
- Create blob and trigger download
- Return loading state and triggerExport function

#### 9.3 Create Export Button Component
Create `components/export-button.tsx`:
- Button that calls triggerExport from hook
- Show loading spinner during download
- Disable when no completed leads

#### 9.4 Create Analytics API Endpoint
Create `app/api/analytics/route.ts`:
- Query ai_usage table for aggregates
- Return `{ totalCost: number, avgCostPerLead: number, totalInputTokens: number, totalOutputTokens: number, avgTokensPerLead: number, totalLeadsScored: number }`

#### 9.5 Add Export Button to Page
Update `app/page.tsx` to include ExportButton in header area.

#### 9.6 TEST: Export & Analytics
Score some leads. Click export button. Verify CSV downloads with correct data. Call /api/analytics and verify stats are accurate.

---

### Phase 10: Final Polish

#### 10.1 Add Empty State
Update LeadsTable to show friendly empty state when no leads exist: "No leads yet. Upload a CSV to get started."

#### 10.2 Add Loading Skeletons
Add skeleton loading states to LeadsTable while fetching data.

#### 10.3 Add Error Handling
Add error boundaries. Show user-friendly error messages. Add retry buttons for failed operations.

#### 10.4 Run Linter
Run `pnpm lint` and fix any issues.

#### 10.5 End-to-End Test
Full test with leads.csv: upload → verify table → wait for scoring → check real-time updates → export CSV → verify analytics

---

## Verification

1. **Upload Test**: Upload leads.csv, verify 200 leads appear with "pending" status
2. **Queue Test**: Verify leads transition to "processing" then "completed" with scores
3. **Real-time Test**: Open two browser tabs, verify both update simultaneously
4. **Sorting Test**: Click column headers, verify server-side sorting works
5. **Export Test**: Download CSV, verify it contains scores
6. **Cost Tracking**: Query ai_usage table, verify token counts and costs logged

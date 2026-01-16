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
│   ├── layout.tsx                        # Root layout with providers
│   ├── page.tsx                          # Main dashboard page
│   ├── globals.css                       # Global styles + Tailwind
│   └── api/
│       ├── leads/
│       │   ├── upload/route.ts           # POST - CSV upload & enqueue
│       │   ├── route.ts                  # GET - Fetch leads with sorting
│       │   ├── progress/route.ts         # GET - Processing progress stats
│       │   └── export/route.ts           # GET - Export CSV
│       ├── analytics/
│       │   └── route.ts                  # GET - AI usage analytics
│       └── queue/
│           └── process/route.ts          # POST - Queue consumer for scoring
│
├── features/                             # Feature-based modules
│   ├── leads/                            # Lead management feature
│   │   ├── components/
│   │   │   ├── leads-table.tsx           # Main leads display table
│   │   │   ├── score-badge.tsx           # Visual score indicator
│   │   │   └── leads-table-skeleton.tsx  # Loading skeleton
│   │   ├── hooks/
│   │   │   ├── use-leads.ts              # TanStack Query hook for leads
│   │   │   └── use-realtime-leads.ts     # Supabase realtime subscription
│   │   ├── lib/
│   │   │   └── lead-utils.ts             # Lead-specific utilities
│   │   ├── stores/
│   │   │   └── table-store.ts            # Table state (sorting)
│   │   └── types/
│   │       └── index.ts                  # Lead types re-exported
│   │
│   ├── upload/                           # CSV upload feature
│   │   ├── components/
│   │   │   └── csv-upload.tsx            # Upload dropzone component
│   │   ├── hooks/
│   │   │   └── use-upload.ts             # Upload mutation hook
│   │   ├── lib/
│   │   │   └── csv-parser.ts             # CSV parsing & validation
│   │   └── stores/
│   │       └── upload-store.ts           # Upload state (progress, errors)
│   │
│   ├── scoring/                          # AI scoring feature
│   │   ├── lib/
│   │   │   ├── scoring-prompt.ts         # AI prompt construction
│   │   │   └── gemini-client.ts          # Vercel AI SDK setup
│   │   └── constants/
│   │       └── persona.ts                # Persona spec as structured data
│   │
│   ├── progress/                         # Progress tracking feature
│   │   ├── components/
│   │   │   └── progress-indicator.tsx    # Processing progress bar
│   │   └── hooks/
│   │       └── use-progress.ts           # Progress polling hook
│   │
│   ├── export/                           # Export feature
│   │   ├── components/
│   │   │   └── export-button.tsx         # CSV export button
│   │   └── hooks/
│   │       └── use-export.ts             # CSV export hook
│   │
│   └── analytics/                        # Analytics feature
│       ├── components/
│       │   └── analytics-card.tsx        # Analytics display (optional)
│       └── hooks/
│           └── use-analytics.ts          # Analytics data hook
│
├── components/                           # Shared components
│   ├── ui/                               # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   ├── progress.tsx
│   │   ├── badge.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── sonner.tsx
│   ├── common/                           # Common reusable components
│   │   ├── error-boundary.tsx
│   │   └── loading-spinner.tsx
│   └── providers/
│       └── query-provider.tsx            # TanStack Query provider
│
├── hooks/                                # Global shared hooks
│   └── use-supabase.ts                   # Supabase client hook
│
├── stores/                               # Global Zustand stores
│   └── app-store.ts                      # App-wide state (if needed)
│
├── server/                               # Server-side hexagonal architecture
│   ├── domain/                           # Domain layer (entities & interfaces)
│   │   ├── entities/
│   │   │   ├── lead.ts                   # Lead entity
│   │   │   └── ai-usage.ts               # AI usage entity
│   │   └── interfaces/
│   │       ├── repositories/
│   │       │   ├── lead-repository.interface.ts
│   │       │   └── ai-usage-repository.interface.ts
│   │       └── services/
│   │           ├── scoring-service.interface.ts
│   │           └── queue-service.interface.ts
│   │
│   ├── application/                      # Application layer (use cases)
│   │   ├── commands/                     # Write operations
│   │   │   ├── upload-leads.command.ts
│   │   │   ├── score-lead.command.ts
│   │   │   └── update-lead-status.command.ts
│   │   └── queries/                      # Read operations
│   │       ├── get-leads.query.ts
│   │       ├── get-lead-progress.query.ts
│   │       ├── get-analytics.query.ts
│   │       └── export-leads.query.ts
│   │
│   └── infrastructure/                   # Infrastructure layer (implementations)
│       ├── repositories/
│       │   ├── supabase-lead.repository.ts
│       │   └── supabase-ai-usage.repository.ts
│       ├── services/
│       │   ├── gemini-scoring.service.ts
│       │   └── vercel-queue.service.ts
│       └── supabase/
│           ├── client.ts                 # Browser Supabase client
│           ├── server.ts                 # Server Supabase client
│           └── admin.ts                  # Service role client
│
├── lib/                                  # Shared utilities
│   ├── utils.ts                          # cn() helper
│   └── query-client.ts                   # TanStack Query config
│
├── types/                                # Shared type definitions
│   ├── lead.ts                           # Lead type definitions
│   ├── csv.ts                            # CSV schema types
│   └── api.ts                            # API response types
│
└── supabase/
    ├── config.toml                       # Supabase CLI config
    └── migrations/
        ├── 001_create_leads_table.sql
        ├── 002_create_ai_usage_table.sql
        └── 003_enable_rls.sql
```

### Architecture Overview

#### Client-Side: Feature-Based Structure
- **`features/`**: Each feature is self-contained with its own components, hooks, stores, and utilities
- **`components/ui/`**: shadcn/ui primitives (buttons, tables, etc.)
- **`components/common/`**: Shared components used across features (error boundaries, spinners)
- **`hooks/`**: Global hooks shared across features
- **`stores/`**: Global Zustand stores for app-wide state

#### Server-Side: Hexagonal Architecture
- **Domain Layer** (`server/domain/`): Pure business logic, entities, and interfaces
  - No external dependencies
  - Defines repository and service interfaces
- **Application Layer** (`server/application/`): Use cases orchestrating domain logic
  - Commands for write operations (mutations)
  - Queries for read operations
- **Infrastructure Layer** (`server/infrastructure/`): External service implementations
  - Repository implementations (Supabase)
  - Service implementations (Gemini, Vercel Queue)

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

### Phase 1: Project Setup & Foundation ✅ COMPLETED

#### 1.1 Install Core Dependencies ✅
Install npm packages for state management and data fetching:
- `@tanstack/react-query` - server state management
- `zustand` - client state management
- `@supabase/supabase-js` and `@supabase/ssr` - database client
- `papaparse` and `@types/papaparse` - CSV parsing
- `zod` - schema validation
- `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react` - utilities

#### 1.2 Install AI & Queue Dependencies ✅
Install npm packages for AI scoring and queue processing:
- `ai` and `@ai-sdk/google` - Vercel AI SDK with Gemini
- `@vercel/queue` - queue processing

#### 1.3 Initialize shadcn/ui ✅
Run `pnpm dlx shadcn@latest init` and add components:
- button, card, input, table, progress, badge, dropdown-menu, sonner

#### 1.4 Create Environment Configuration ✅
Create `.env.local` and `.env.example` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GEMINI_INPUT_TOKEN_COST`, `GEMINI_OUTPUT_TOKEN_COST`

#### 1.5 Create Directory Structure ✅
Create feature-based and hexagonal architecture folders:
- `features/leads/`, `features/upload/`, `features/scoring/`, `features/progress/`, `features/export/`, `features/analytics/`
- Each feature with: `components/`, `hooks/`, `lib/`, `stores/` (as needed)
- `components/ui/`, `components/common/`, `components/providers/`
- `hooks/`, `stores/` (global)
- `server/domain/entities/`, `server/domain/interfaces/repositories/`, `server/domain/interfaces/services/`
- `server/application/commands/`, `server/application/queries/`
- `server/infrastructure/repositories/`, `server/infrastructure/services/`, `server/infrastructure/supabase/`
- `lib/`, `types/`

#### 1.6 Create Utility Files ✅
- Create `lib/utils.ts` with `cn()` helper for className merging
- Create `types/lead.ts` with Lead, LeadStatus, and API response types
- Create `types/csv.ts` with CSV schema types
- Create `types/api.ts` with API response types

---

### Phase 2: Database Setup (Supabase Migrations) ✅ COMPLETED

#### 2.1 Initialize Supabase CLI ✅
Run `supabase init` to create `supabase/` directory with config. Link to existing project with `supabase link --project-ref <project-id>`.

#### 2.2 Create Leads Table Migration ✅
Create migration file `supabase/migrations/001_create_leads_table.sql`:
- Create `leads` table with columns: id (UUID), account_name, lead_first_name, lead_last_name, lead_job_title, account_domain, account_employee_range, account_industry, score, status, error_message, created_at, processed_at
- Add CHECK constraint for status enum
- Add CHECK constraint for score range (0-10)
- Create indexes for status, score (DESC NULLS LAST), created_at

#### 2.3 Create AI Usage Table Migration ✅
Create migration file `supabase/migrations/002_create_ai_usage_table.sql`:
- Create `ai_usage` table with columns: id (UUID), lead_id (FK), model, input_tokens, output_tokens, cost, created_at
- Add foreign key constraint referencing leads(id) with ON DELETE CASCADE
- Create index for lead_id

#### 2.4 Create RLS Policies Migration ✅
Create migration file `supabase/migrations/003_enable_rls.sql`:
- Enable RLS on both tables
- Create permissive policies allowing all operations (no auth required)

#### 2.5 Apply Migrations ✅
Run `supabase db push` to apply all migrations to the remote database. Verify schema in Supabase Studio.

---

### Phase 3: CSV Upload Feature (UI First) ✅ COMPLETED

Build the upload UI first so you can test it visually before connecting to the server.

#### 3.1 Create TanStack Query Provider ✅
Create `components/providers/query-provider.tsx` with QueryClientProvider wrapper component.

#### 3.2 Update App Layout ✅
Update `app/layout.tsx` to wrap children with QueryProvider. Add Toaster component from sonner for notifications.

#### 3.3 Create Upload State Store ✅
Create `features/upload/stores/upload-store.ts` Zustand store with: isUploading, error, setUploading(), setError(), reset().

#### 3.4 Create CSV Parser Utility ✅
Create `features/upload/lib/csv-parser.ts` using papaparse to parse CSV files. Validate required columns with zod schema. Return typed array of lead rows or validation errors.

#### 3.5 Create CSV Upload Component ✅
Create `features/upload/components/csv-upload.tsx` with drag-and-drop zone using native HTML5 drag events. Display upload state from Zustand store. Accept .csv files only.

#### 3.6 Create Upload Hook (with mock) ✅
Create `features/upload/hooks/use-upload.ts` with `useMutation` from TanStack Query. Initially mock the API call to test UI behavior. Handle FormData creation, update Zustand store with progress/error, show toast notifications.

#### 3.7 Create Main Page Layout ✅
Rewrite `app/page.tsx` with header "Lead Scoring" and CSVUpload component. Basic responsive layout with Tailwind.

#### 3.8 TEST: Upload UI ✅
Test drag-and-drop, file selection, loading states, and error display with mocked responses.

---

### Phase 4: Upload API & Server Infrastructure

Build the server-side foundation to enable the upload endpoint.

#### 4.1 Create Domain Entities
Create `server/domain/entities/lead.ts`:
- Lead entity with all properties and validation
- LeadStatus enum

Create `server/domain/entities/ai-usage.ts`:
- AIUsage entity with token and cost tracking

#### 4.2 Create Repository Interfaces
Create `server/domain/interfaces/repositories/lead-repository.interface.ts`:
```typescript
interface ILeadRepository {
  findById(id: string): Promise<Lead | null>;
  findAll(options: FindLeadsOptions): Promise<{ leads: Lead[]; total: number }>;
  findPendingIds(): Promise<string[]>;
  create(leads: CreateLeadInput[]): Promise<Lead[]>;
  updateStatus(id: string, status: LeadStatus, errorMessage?: string): Promise<void>;
  updateScore(id: string, score: number): Promise<void>;
  getProgressStats(): Promise<ProgressStats>;
  findCompleted(): Promise<Lead[]>;
}
```

Create `server/domain/interfaces/repositories/ai-usage-repository.interface.ts`:
```typescript
interface IAIUsageRepository {
  create(usage: CreateAIUsageInput): Promise<AIUsage>;
  getAnalytics(): Promise<AnalyticsData>;
}
```

#### 4.3 Create Service Interfaces
Create `server/domain/interfaces/services/scoring-service.interface.ts`:
```typescript
interface IScoringService {
  scoreLead(lead: Lead): Promise<ScoringResult>;
}
```

Create `server/domain/interfaces/services/queue-service.interface.ts`:
```typescript
interface IQueueService {
  enqueueLeads(leadIds: string[]): Promise<void>;
}
```

#### 4.4 Create Supabase Clients
Create `server/infrastructure/supabase/client.ts` with `createBrowserClient` for client-side.
Create `server/infrastructure/supabase/server.ts` with `createServerClient` using cookies.
Create `server/infrastructure/supabase/admin.ts` with service role client.

#### 4.5 Create Repository Implementations
Create `server/infrastructure/repositories/supabase-lead.repository.ts`:
- Implement `ILeadRepository` using Supabase admin client
- All database operations for leads

Create `server/infrastructure/repositories/supabase-ai-usage.repository.ts`:
- Implement `IAIUsageRepository` using Supabase admin client
- All database operations for AI usage tracking

#### 4.6 Create Upload Leads Command
Create `server/application/commands/upload-leads.command.ts`:
- Accept parsed CSV rows
- Validate lead data
- Use `ILeadRepository` to create leads
- Return created lead IDs

#### 4.7 Create Upload API Endpoint
Create `app/api/leads/upload/route.ts`:
- Accept POST with multipart/form-data
- Parse CSV using csv-parser utility
- Use `UploadLeadsCommand` to process
- Return `{ success: boolean, count: number, leadIds: string[] }`

#### 4.8 Update Upload Hook to Use Real API
Update `features/upload/hooks/use-upload.ts` to call real `/api/leads/upload` endpoint. Invalidate queries on success.

#### 4.9 TEST: Upload Integration
Upload leads.csv file. Verify leads appear in Supabase with status "pending".

---

### Phase 5: Queue & AI Scoring

Build the queue processing system and AI scoring infrastructure.

#### 5.1 Create Persona Constants
Create `features/scoring/constants/persona.ts` with structured data from persona_spec.md:
- Company size categories and employee ranges
- Job title priorities by company size
- Department priorities
- Seniority relevance matrix
- Hard and soft exclusions lists

#### 5.2 Create AI Scoring Prompt Builder
Create `features/scoring/lib/scoring-prompt.ts` with `buildScoringPrompt(lead)` function. Include full persona specification in prompt. Request JSON output with score (0-10) field.

#### 5.3 Create Scoring Service Implementation
Create `server/infrastructure/services/gemini-scoring.service.ts`:
- Implement `IScoringService` using Vercel AI SDK with Google Gemini
- Include persona specification in prompts
- Return score and token usage

#### 5.4 Create Queue Service Implementation
Create `server/infrastructure/services/vercel-queue.service.ts`:
- Implement `IQueueService`
- Use @vercel/queue to enqueue lead IDs

#### 5.5 Create Score Lead Command
Create `server/application/commands/score-lead.command.ts`:
- Accept lead ID
- Fetch lead from repository
- Update status to "processing"
- Call scoring service
- Update lead with score
- Log AI usage
- Handle errors with status update

#### 5.6 Create Queue Consumer Endpoint
Create `app/api/queue/process/route.ts`:
- Accept POST with `{ leadId: string }`
- Use `ScoreLeadCommand` to process
- Return success/error response

#### 5.7 Update Upload Command to Enqueue
Update `UploadLeadsCommand` to use `IQueueService` to enqueue leads after creation.

#### 5.8 TEST: AI Scoring
Upload a small CSV (5-10 leads). Verify leads transition from pending → processing → completed. Check ai_usage table.

---

### Phase 6: Leads Table Feature

Build the leads table UI and API to display processed leads.

#### 6.1 Create Table State Store
Create `features/leads/stores/table-store.ts` Zustand store with: sortBy (default: "score"), sortOrder (default: "desc"), setSorting().

#### 6.2 Create Score Badge Component
Create `features/leads/components/score-badge.tsx` displaying score with color coding:
- 0-2: red (poor fit)
- 3-4: orange (weak fit)
- 5-6: yellow (moderate fit)
- 7-8: green (strong fit)
- 9-10: emerald (excellent fit)
- null: gray (pending)

#### 6.3 Create Leads Table Skeleton
Create `features/leads/components/leads-table-skeleton.tsx` for loading state.

#### 6.4 Create Get Leads Query
Create `server/application/queries/get-leads.query.ts`:
- Accept sorting options
- Return leads with pagination info

#### 6.5 Create Get Leads API Endpoint
Create `app/api/leads/route.ts`:
- Accept GET with query params: sortBy, sortOrder
- Use `GetLeadsQuery` to fetch
- Return `{ leads: Lead[], total: number }`

#### 6.6 Create Leads Hook
Create `features/leads/hooks/use-leads.ts` with `useQuery` from TanStack Query. Read sorting params from table store. Call real `/api/leads` endpoint.

#### 6.7 Create Leads Table Component
Create `features/leads/components/leads-table.tsx` using shadcn/ui Table. Columns: Name, Job Title, Company, Size, Industry, Score, Status. Clickable headers for sorting. Use useLeads hook for data.

#### 6.8 Add Leads Table to Page
Update `app/page.tsx` to include LeadsTable component below CSVUpload.

#### 6.9 TEST: Leads Table
Verify table displays leads from database. Click column headers to test sorting. Test loading skeleton.

---

### Phase 7: Progress Tracking Feature

Build the progress tracking UI and API.

#### 7.1 Create Get Progress Query
Create `server/application/queries/get-lead-progress.query.ts`:
- Return counts by status

#### 7.2 Create Progress API Endpoint
Create `app/api/leads/progress/route.ts`:
- Use `GetLeadProgressQuery` to fetch stats
- Return `{ total, pending, processing, completed, error }`

#### 7.3 Create Progress Hook
Create `features/progress/hooks/use-progress.ts` with `useQuery`. Enable refetchInterval (2 seconds) when pending + processing > 0.

#### 7.4 Create Progress Indicator Component
Create `features/progress/components/progress-indicator.tsx`:
- Display progress bar (completed / total * 100)
- Show counts: "X pending, Y processing, Z completed, W errors"
- Hide when total is 0

#### 7.5 Add Progress to Page
Update `app/page.tsx` to include ProgressIndicator between CSVUpload and LeadsTable.

#### 7.6 TEST: Progress Tracking
Upload CSV. Verify progress bar updates as leads are processed.

---

### Phase 8: Real-time Updates

Add real-time UI updates when leads are scored.

#### 8.1 Create Realtime Hook
Create `features/leads/hooks/use-realtime-leads.ts`:
- Subscribe to Supabase Broadcast channel "leads-updates"
- On event, invalidate leads and progress queries
- Show toast notification with lead name and score

#### 8.2 Update Queue Consumer to Broadcast
Update `app/api/queue/process/route.ts`:
- After scoring, send broadcast message to "leads-updates" channel
- Event type: 'lead-scored'
- Payload: `{ leadId, leadName, score, status }`

#### 8.3 Integrate Realtime in Page
Update `app/page.tsx` to call `useRealtimeLeads()` hook for automatic updates.

#### 8.4 TEST: Real-time Updates
Open app in two browser tabs. Upload CSV in one tab. Verify both tabs update simultaneously.

---

### Phase 9: Export Feature

Build the CSV export functionality.

#### 9.1 Create Export Leads Query
Create `server/application/queries/export-leads.query.ts`:
- Return completed leads formatted for CSV export

#### 9.2 Create Export API Endpoint
Create `app/api/leads/export/route.ts`:
- Use `ExportLeadsQuery` to get completed leads
- Generate CSV string
- Return with Content-Type: text/csv

#### 9.3 Create Export Hook
Create `features/export/hooks/use-export.ts`:
- Call `/api/leads/export` endpoint
- Create blob and trigger download

#### 9.4 Create Export Button Component
Create `features/export/components/export-button.tsx`:
- Button that calls triggerExport from hook
- Show loading spinner during download
- Disable when no completed leads

#### 9.5 Add Export to Page
Update `app/page.tsx` to add ExportButton in header area.

#### 9.6 TEST: Export
Score some leads. Click export. Verify CSV file downloads with correct data.

---

### Phase 10: Analytics Feature

Add AI usage analytics display.

#### 10.1 Create Get Analytics Query
Create `server/application/queries/get-analytics.query.ts`:
- Return aggregated AI usage stats

#### 10.2 Create Analytics API Endpoint
Create `app/api/analytics/route.ts`:
- Use `GetAnalyticsQuery` to fetch aggregates
- Return analytics data

#### 10.3 Create Analytics Hook
Create `features/analytics/hooks/use-analytics.ts` with `useQuery`.

#### 10.4 Create Analytics Card Component (Optional)
Create `features/analytics/components/analytics-card.tsx`:
- Display total cost, avg cost per lead, total tokens

#### 10.5 TEST: Analytics
Score some leads. Verify analytics API returns correct aggregates.

---

### Phase 11: Final Polish

#### 11.1 Add Empty State
Update LeadsTable to show friendly empty state when no leads exist.

#### 11.2 Add Error Handling
Create `components/common/error-boundary.tsx`. Add error boundaries around features.

#### 11.3 Run Linter
Run `pnpm lint` and fix any issues.

#### 11.4 End-to-End Test
Full test with leads.csv: upload → verify table → wait for scoring → check real-time updates → export CSV → verify analytics

---

## Verification

### Phase 3: Upload UI (Completed)
1. **Upload UI Test**: Drag-and-drop CSV, verify loading states and mock success/error toasts

### Phase 4: Upload Integration
2. **Upload Integration Test**: Upload leads.csv, verify leads appear in Supabase with "pending" status

### Phase 5: Queue & AI Scoring
3. **Scoring Test**: Verify leads transition pending → processing → completed with scores
4. **Cost Tracking**: Query ai_usage table, verify token counts and costs logged

### Phase 6: Leads Table
5. **Table Test**: Verify real leads display, server-side sorting works

### Phase 7: Progress Tracking
6. **Progress Test**: Verify progress bar updates as leads are processed

### Phase 8: Real-time Updates
7. **Real-time Test**: Open two browser tabs, verify both update simultaneously

### Phase 9: Export
8. **Export Test**: Download CSV, verify it contains correct data

### Phase 10: Analytics
9. **Analytics Test**: Score some leads, verify aggregates are correct

### Phase 11: End-to-End
10. **Full Flow**: Upload → table → scoring → real-time → export → analytics

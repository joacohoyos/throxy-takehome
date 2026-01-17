[Video demo!](https://drive.google.com/file/d/1GMXxO80aNLlHqK-YjGVYtED8cLp8bzGU/view?usp=sharing)
# Throxy Lead Scoring Application

A lead scoring application that processes CSV files containing B2B leads, scores them using AI based on Throxy's ideal customer profile, and displays results in real-time.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **State Management**: Zustand (client) + TanStack Query (server)
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Broadcast
- **Queue**: Vercel Workflow
- **AI**: Vercel AI SDK with OpenAI

## Local Development Setup

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for Supabase local development)
- Supabase CLI

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Supabase Locally

Install the Supabase CLI if you haven't:

```bash
# macOS
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

Start Supabase locally:

```bash
supabase start
```

This will output your local Supabase credentials:

```
API URL: http://127.0.0.1:54321
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Run the database migrations:

```bash
supabase db reset
```

### 3. Configure Environment Variables

Create a `.env.local` file:

```bash
# Supabase (use values from `supabase start` output)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<anon-key-from-supabase-start>
SUPABASE_SECRET_KEY=<service-role-key-from-supabase-start>

# OpenAI
OPENAI_API_KEY=sk-...
```

### 4. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Changing AI Provider

The application uses the Vercel AI SDK, making it easy to swap providers.

### Current: OpenAI

The default implementation uses OpenAI (`gpt-5-nano`). Configuration is in:
- `server/infrastructure/services/openai-scoring.service.ts`

## Architecture Overview

### Client-Side: Feature-Based Structure

```
features/
├── upload/       # CSV upload UI and logic
├── leads/        # Leads table with real-time updates
├── scoring/      # Scoring prompt and workflow
└── progress/     # Processing progress indicator

Why feature-based? Keeps related code together, easier to navigate and maintain.
```

### Server-Side: Hexagonal Architecture

```
server/
├── domain/           # Pure business logic (no dependencies)
│   ├── entities/     # Lead, AIUsage types
│   └── interfaces/   # Repository and service contracts
├── application/      # Use cases
│   ├── commands/     # Write operations (upload, score)
│   └── queries/      # Read operations (get leads, progress)
└── infrastructure/   # Implementations
    ├── repositories/ # Supabase database access
    └── services/     # OpenAI scoring, broadcasting
```

**Why hexagonal?** Makes it trivial to swap implementations (different database, different AI provider) without touching business logic.

### Real-Time Updates

Uses Supabase Broadcast channels:
1. Server broadcasts "leads-updated" events after scoring
2. Clients subscribe and update React Query cache
3. UI updates instantly without polling

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **TanStack Query** | Automatic caching, background refetch, optimistic updates |
| **Zustand** | Minimal boilerplate for UI state (upload progress, table sorting) |
| **Supabase Broadcast** | Simpler than separate message queue for this use case |
| **Vercel Workflow** | Built-in retry logic, step checkpoints, error recovery |
| **Parameterized Prompt** | Scoring criteria (title priorities, seniority weights) are injected based on company size, giving the model explicit context rather than relying on it to infer ICP rules. Reduces token waste and improves consistency. |

## Known Shortcuts / Trade-offs

### No Authentication

- RLS policies are permissive (allow all operations)
- No user isolation in the database
- **For production**: Add Supabase Auth and row-level filtering by user_id

### Queue Implementation

- Uses Vercel Workflow which is designed for serverless functions
- **For production**: Consider a proper queue like Google Pub/Sub, RabbitMQ, or BullMQ for:
  - Better scaling
  - Dead letter queues
  - More granular retry policies

### Error Handling

- Basic error handling with status updates
- No comprehensive error aggregation or monitoring
- **For production**: Add structured logging (e.g., Pino) and error tracking (e.g., Sentry)

### No Pagination

- Progress query fetches all leads to count statuses
- **For production**: Use `SELECT COUNT(*) GROUP BY status` for efficiency

### Real-Time Updates

- Basic broadcast without deduplication; counter drift possible on missed/duplicate events
- **For production**: Add event IDs, sequence numbers, and periodic full-state sync to correct drift

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leads/upload` | POST | Upload CSV file |
| `/api/leads` | GET | Get leads (supports `sortBy`, `sortOrder`) |
| `/api/leads/progress` | GET | Get processing progress stats |

# Architecture Diagrams

<img width="756" height="691" alt="image" src="https://github.com/user-attachments/assets/ec3ef663-2145-417a-977e-5bf4f80b76ac" />



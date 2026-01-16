# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm lint         # Run ESLint
```

**Do not run `pnpm dev`, `pnpm build`, or `pnpm start`** — the user manages these manually.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Database**: Supabase
- **AI**: Vercel AI SDK with Google Gemini

## Architecture Overview

This project uses a **feature-based structure** for client-side code and **hexagonal architecture** for server-side code.

### Directory Structure

```
throxy/
├── app/                    # Next.js App Router (pages, layouts, API routes)
├── features/               # Feature-based modules (client-side)
├── components/             # Shared components (ui/, common/, providers/)
├── hooks/                  # Global shared hooks
├── stores/                 # Global Zustand stores
├── server/                 # Server-side hexagonal architecture
├── lib/                    # Shared utilities
├── types/                  # Shared type definitions
└── supabase/               # Database migrations
```

---

## Client-Side Architecture (Feature-Based)

### Features Directory (`features/`)

Each feature is a self-contained module with its own components, hooks, stores, and utilities.

```
features/
├── leads/
│   ├── components/         # Feature-specific components
│   ├── hooks/              # Feature-specific hooks
│   ├── lib/                # Feature-specific utilities
│   ├── stores/             # Feature-specific Zustand stores
│   └── types/              # Feature-specific types (re-exports from shared)
├── upload/
├── scoring/
├── progress/
├── export/
└── analytics/
```

**Guidelines:**
- Keep features independent and self-contained
- Feature components should only import from their own feature or shared locations
- Cross-feature communication goes through global stores or API

### Shared Components (`components/`)

```
components/
├── ui/                     # shadcn/ui primitives (button, table, etc.)
├── common/                 # Shared components across features
│   ├── error-boundary.tsx
│   └── loading-spinner.tsx
└── providers/
    └── query-provider.tsx  # TanStack Query provider
```

**Guidelines:**
- `ui/` is exclusively for shadcn/ui components
- `common/` is for reusable components used across multiple features
- Never put feature-specific components in `common/`

### Global Hooks (`hooks/`)

Only for hooks shared across multiple features (e.g., `use-supabase.ts`).

Feature-specific hooks go in `features/<feature>/hooks/`.

### Global Stores (`stores/`)

Only for app-wide state shared across multiple features.

Feature-specific stores go in `features/<feature>/stores/`.

---

## Server-Side Architecture (Hexagonal)

The server-side code follows hexagonal architecture with three layers: Domain, Application, and Infrastructure.

### Domain Layer (`server/domain/`)

Pure business logic with no external dependencies.

```
server/domain/
├── entities/               # Business entities
│   ├── lead.ts
│   └── ai-usage.ts
└── interfaces/             # Contracts (interfaces)
    ├── repositories/
    │   ├── lead-repository.interface.ts
    │   └── ai-usage-repository.interface.ts
    └── services/
        ├── scoring-service.interface.ts
        └── queue-service.interface.ts
```

**Guidelines:**
- Entities are pure TypeScript classes/types with validation
- Interfaces define contracts that infrastructure must implement
- NO imports from `infrastructure/` or external libraries
- This layer should be testable in isolation

### Application Layer (`server/application/`)

Use cases that orchestrate domain logic. Separated into Commands (write) and Queries (read).

```
server/application/
├── commands/               # Write operations (mutations)
│   ├── upload-leads.command.ts
│   ├── score-lead.command.ts
│   └── update-lead-status.command.ts
└── queries/                # Read operations
    ├── get-leads.query.ts
    ├── get-lead-progress.query.ts
    ├── get-analytics.query.ts
    └── export-leads.query.ts
```

**Guidelines:**
- Commands mutate state (create, update, delete)
- Queries only read data (no side effects)
- Depend on interfaces, not implementations
- Inject repositories and services via constructor or parameters

**Command Example:**
```typescript
// server/application/commands/score-lead.command.ts
import type { ILeadRepository } from '@/server/domain/interfaces/repositories/lead-repository.interface';
import type { IScoringService } from '@/server/domain/interfaces/services/scoring-service.interface';

export class ScoreLeadCommand {
  constructor(
    private leadRepository: ILeadRepository,
    private scoringService: IScoringService
  ) {}

  async execute(leadId: string): Promise<void> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    await this.leadRepository.updateStatus(leadId, 'processing');
    const result = await this.scoringService.scoreLead(lead);
    await this.leadRepository.updateScore(leadId, result.score);
  }
}
```

### Infrastructure Layer (`server/infrastructure/`)

Implementations of interfaces using external services.

```
server/infrastructure/
├── repositories/           # Database implementations
│   ├── supabase-lead.repository.ts
│   └── supabase-ai-usage.repository.ts
├── services/               # External service implementations
│   ├── gemini-scoring.service.ts
│   └── vercel-queue.service.ts
└── supabase/               # Supabase client factories
    ├── client.ts           # Browser client
    ├── server.ts           # Server client (with cookies)
    └── admin.ts            # Service role client
```

**Guidelines:**
- Each implementation must satisfy its corresponding interface
- Keep external library usage contained here
- Repository implementations handle all database operations
- Service implementations handle external API calls

**Repository Example:**
```typescript
// server/infrastructure/repositories/supabase-lead.repository.ts
import type { ILeadRepository } from '@/server/domain/interfaces/repositories/lead-repository.interface';
import { createAdminClient } from '@/server/infrastructure/supabase/admin';

export class SupabaseLeadRepository implements ILeadRepository {
  async findById(id: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // ... other methods
}
```

---

## Interface-First Development

Always define interfaces before implementations:

1. Define the interface in `server/domain/interfaces/`
2. Implement in `server/infrastructure/`
3. Use via dependency injection in commands/queries

```typescript
// 1. Interface (domain layer)
interface ILeadRepository {
  findById(id: string): Promise<Lead | null>;
  create(leads: CreateLeadInput[]): Promise<Lead[]>;
}

// 2. Implementation (infrastructure layer)
class SupabaseLeadRepository implements ILeadRepository {
  // ...
}

// 3. Usage in API route
const repository = new SupabaseLeadRepository();
const command = new UploadLeadsCommand(repository);
await command.execute(data);
```

---

## API Routes

API routes in `app/api/` are thin controllers that:
1. Parse and validate request data
2. Instantiate repositories and services
3. Execute commands or queries
4. Return responses

```typescript
// app/api/leads/upload/route.ts
import { SupabaseLeadRepository } from '@/server/infrastructure/repositories/supabase-lead.repository';
import { UploadLeadsCommand } from '@/server/application/commands/upload-leads.command';

export async function POST(request: Request) {
  const formData = await request.formData();
  // ... parse CSV

  const repository = new SupabaseLeadRepository();
  const command = new UploadLeadsCommand(repository);
  const result = await command.execute(parsedLeads);

  return Response.json({ success: true, count: result.length });
}
```

---

## Component Guidelines

### Logicless Components

Keep components focused on rendering. Move all business logic, side effects, and state manipulation to custom hooks.

```tsx
// Prefer: Logic in hooks, component just renders
function LeadsTable() {
  const { leads, isLoading, sortBy, setSorting } = useLeads();
  if (isLoading) return <LeadsTableSkeleton />;
  return <Table data={leads} onSort={setSorting} />;
}

// Avoid: Logic mixed in component
function LeadsTable() {
  const [leads, setLeads] = useState([]);
  useEffect(() => { fetchLeads().then(setLeads); }, []);
  // ...
}
```

### State Management

- **Server state**: Use TanStack Query for all API data fetching, caching, and synchronization
- **Client state**: Use Zustand for UI state, user preferences, and application-wide state
- **Local state**: Use `useState` only for component-scoped UI state (form inputs, toggles)

### Avoid Prop Drilling

Use feature-specific Zustand stores instead of passing props through multiple component layers.

---

## Path Alias

Use `@/*` for imports from root (configured in tsconfig.json).

```typescript
import { Button } from '@/components/ui/button';
import { useLeads } from '@/features/leads/hooks/use-leads';
import { SupabaseLeadRepository } from '@/server/infrastructure/repositories/supabase-lead.repository';
```

---

## Testing

- Domain entities and interfaces: Unit test in isolation
- Commands/Queries: Unit test with mocked repositories
- Repositories: Integration test with Supabase
- Components: Test with React Testing Library

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

## Architecture Guidelines

### Component Structure

- **Logicless components**: Keep components focused on rendering. Move all business logic, side effects, and state manipulation to custom hooks.
- **Custom hooks**: Extract logic into hooks (e.g., `useUserData`, `useFormSubmit`). Place in `hooks/` directory.
- **Avoid prop drilling**: Use Zustand stores for shared state instead of passing props through multiple component layers.

### State Management

- **Server state**: Use TanStack Query for all API data fetching, caching, and synchronization.
- **Client state**: Use Zustand for UI state, user preferences, and application-wide state.
- **Local state**: Use `useState` only for component-scoped UI state (form inputs, toggles).

### Code Patterns

```tsx
// Prefer: Logic in hooks, component just renders
function UserProfile() {
  const { user, isLoading } = useUser();
  if (isLoading) return <Skeleton />;
  return <ProfileCard user={user} />;
}

// Avoid: Logic mixed in component
function UserProfile() {
  const [user, setUser] = useState(null);
  useEffect(() => { fetchUser().then(setUser); }, []);
  // ...
}
```

### File Organization

- `app/` - Next.js App Router pages and layouts
- `components/` - Reusable UI components (shadcn/ui based)
- `hooks/` - Custom React hooks with business logic
- `stores/` - Zustand store definitions
- `lib/` - Utilities, API clients, TanStack Query configuration
- `types/` - TypeScript type definitions

## Path Alias

Use `@/*` for imports from root (configured in tsconfig.json).

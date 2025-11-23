<!--
Guidance for AI coding agents working on the VetCare-360 repository.
Keep this file short, actionable and specific to this codebase.
-->

# Repo signals for code generation and edits

- **Project type:** Vite + React + TypeScript app (see `package.json` scripts).
- **UI:** shadcn-style components under `src/components/ui/*` (use existing components for consistent styling).
- **State & data:** Uses Supabase (`@supabase/supabase-js`) for auth and DB. The generated client is at `src/integrations/supabase/client.ts` (marked "do not edit").
- **Routing & roles:** Routes are declared in `src/App.tsx`. Access control is enforced by `src/components/ProtectedRoute.tsx` and the `useUserRole` hook (`src/hooks/useUserRole.tsx`).

# High-level architecture (what to know quickly)

- Single-page React app. Entry: `src/main.tsx` -> `src/App.tsx`.
- Routes are split by role (admin / vet / client). Each area lives under `src/pages/{admin,vet,client}`.
- Auth flow: Supabase Session -> `useAuth` (`src/hooks/useAuth.tsx`) -> `useUserRole` fetches `profiles` and `user_roles` tables; `ProtectedRoute` redirects based on `getDashboardPath()`.
- Supabase client uses Vite env vars (see `src/integrations/supabase/client.ts`). The project also includes a `supabase/functions/` folder for edge functions.

# Key files to reference when changing behaviour

- `src/integrations/supabase/client.ts` — Supabase client creation and auth config (localStorage persistence). Do not edit generated typings in `src/integrations/supabase/types.ts`.
- `src/hooks/useAuth.tsx` — Auth subscription and session initialization pattern (listen first, then getSession).
- `src/hooks/useUserRole.tsx` — Loads profile from `profiles` and role from `user_roles`. Many components rely on its `getDashboardPath()` behaviour.
- `src/components/ProtectedRoute.tsx` — Central guard used across App routes; follow its conventions for redirects/loading states.
- `vite.config.ts` and `tsconfig.json` — shows `@/` path alias and `base: './'` Vite settings; imports use `@/` frequently.

# Environment and running

- Local dev: `npm run dev` (starts Vite dev server).
- Build: `npm run build` (or `npm run build:dev` for dev-mode build). Preview: `npm run preview`.
- Lint: `npm run lint` (ESLint is configured at project root).
- Deploy (GH Pages): `npm run deploy` — builds then publishes `dist` with `gh-pages`.
- Required env vars (used in source):
  - `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (used by `src/integrations/supabase/client.ts`).
  - Note: `vite.config.ts` contains `define` entries for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — verify which key name you need in your environment. Prefer using a `.env` with `VITE_` prefixes for local dev.

# Patterns & conventions specific to this repo

- Path alias: always import app code with `@/` (e.g. `import { supabase } from '@/integrations/supabase/client'`).
- Auth pattern: subscribe to `supabase.auth.onAuthStateChange()` first, then call `supabase.auth.getSession()` (see `useAuth`). Replicate that ordering if creating similar hooks/components.
- Role lookup: `profiles` stores profile data; roles are in `user_roles` (separate table). Do not assume role exists on the `user` object.
- UI components: reuse existing `src/components/ui/*` primitives rather than adding bespoke markup to keep consistent tokens/styles.
- Generated files: supabase client/types may be generated. Respect the "do not edit" comment.

# When modifying auth, routing or DB access

- Update `useUserRole` and `ProtectedRoute` together. Routes in `src/App.tsx` rely on `getDashboardPath()`; changing dashboards must preserve those return paths.
- Add DB fields cautiously: code expects `profiles.id`, `profiles.full_name`, and `user_roles.role` when mapping profile.

# Helpful snippets (copy-paste)

- Importing with alias:
  - `import { supabase } from '@/integrations/supabase/client';`
- Redirect to a role dashboard:
  - `navigate(getDashboardPath(), { replace: true });`

# Pull request & code-edit guidance for AIs

- Keep changes minimal and local to the feature. Avoid touching global UI primitives unless necessary.
- Run `npm run lint` on code edits. There are no test scripts configured — add tests only if you follow the existing patterns.
- Do not commit secrets. Use `.env` for `VITE_` vars; verify `vite.config.ts` if default defines exist.

# Questions / uncertain spots to ask the maintainer

- Which env var should be canonical for the public supabase key in this repo: `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`? (both appear in the codebase/config.)
- Should new DB migrations be added under `supabase/migrations/` and how are they applied in CI (no scripts detected)?

---
If anything above is unclear or you want me to expand any section (e.g., example PR checklist, common refactors, or a short contributor guide), tell me which area to expand.

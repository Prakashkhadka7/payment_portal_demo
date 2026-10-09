# Merchant Payments Portal

Angular 22 portal for creating, reviewing and approving merchant applications with role-based access
(SALES, REVIEWER, ADMIN).

## Prerequisites

- Node.js `22.23.3` (see `.nvmrc`; run `nvm use`)
- npm 10+

## Getting started

```bash
nvm use
npm ci
cp .env.example .env                     # app config; git-ignored
cp mock-api/.env.example mock-api/.env   # set SEED_USER_PASSWORD; git-ignored
npm run dev                              # mock API (:3000) + app (http://localhost:4200)
```

## Scripts

| Script                  | Purpose                                |
| ----------------------- | -------------------------------------- |
| `npm run dev`           | Mock API and dev server together       |
| `npm start`             | Dev server only (proxies `/api`)       |
| `npm run mock:api`      | Mock API only, restarts on change      |
| `npm run build`         | Production build                       |
| `npm test`              | Unit tests (Vitest + TestBed), watch   |
| `npm run test:ci`       | Unit tests, single run                 |
| `npm run lint`          | ESLint (TypeScript + templates + a11y) |
| `npm run typecheck:api` | Type-check the mock API                |
| `npm run format`        | Prettier write                         |
| `npm run format:check`  | Prettier check                         |

## Environment configuration

`npm start` / `npm run build` run `scripts/ng-with-env.mjs`, which reads `NG_APP_*` variables from
the process environment or the git-ignored `.env` file and passes them to the official Angular
builder as compile-time `--define` constants. They are consumed only through
`src/environments/environment.ts`. Every key in `.env.example` is required; a missing one fails the
command immediately.

> Anything in a frontend environment file is compiled into the public JavaScript bundle. It can hold
> configuration such as API URLs, never secrets.

## Mock API

A small Express server in `mock-api/` that behaves like a real backend, so the frontend can be
built against realistic security boundaries:

- **Authentication**: short-lived opaque bearer access tokens (60 s by default) and a rotating,
  single-use refresh token in an `httpOnly`, `SameSite=Strict` cookie scoped to `/api/auth`.
- **Authorization is enforced server-side** on every request. Users can hold several roles; their
  permissions are the union. Records outside a user's scope return `404`, and each application
  carries `allowedActions` computed by `mock-api/src/applications/application.policy.ts`.
- **Sensitive data** (IBAN, owner tax IDs) is always returned masked. Clear values are only
  available through an audited reveal endpoint and are write-only on save.
- **No secrets in the repository**: demo users' password comes from `mock-api/.env` and is stored
  only as a salted scrypt hash. All seed data is fictional.
- `MOCK_LATENCY_MS` and `MOCK_FAILURE_RATE` make loading and error/retry states easy to see.

The Angular dev server proxies `/api` to the mock API (`proxy.conf.json`), so the browser only
talks to its own origin and no CORS is needed. Node runs the TypeScript sources directly (native
type stripping), and `contracts/` holds the API types shared by both sides.

## Project structure

```
contracts/                  Shared API types (types only) used by the app and the mock API
mock-api/src/
├─ auth/                    Login, refresh, logout, tokens, rate limiting, permissions
├─ applications/            Policy, service, routes, input parsing, validation
├─ users/                   User repository and reviewer listing
├─ seed/                    Deterministic fictional seed data
└─ shared/                  Errors, input readers, IBAN checksum, network simulation
src/
├─ environments/            Typed runtime configuration sourced from .env
├─ styles/                  SCSS partials: Material theme, breakpoint mixins
└─ app/
   ├─ core/                 App-wide singletons
   │  ├─ auth/              Session, token handling, guards, permissions
   │  ├─ http/              HTTP interceptors and error handling
   │  └─ layout/            Application shell and navigation
   ├─ shared/               Reusable, feature-agnostic building blocks
   │  ├─ ui/                Presentational components
   │  ├─ validators/        Reusable form validators
   │  └─ utils/             Pure helper functions
   └─ features/             Lazy-loaded feature areas
      ├─ auth/              Login
      └─ applications/
         ├─ data-access/    API service, models, state
         ├─ list/           Dashboard
         ├─ wizard/         Multi-step merchant application
         └─ detail/         Application detail and review
```

Path aliases: `@core/*`, `@shared/*`, `@features/*`, `@env/*`, `@contracts`.

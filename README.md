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
cp .env.example .env   # adjust values if needed; .env is git-ignored
npm start              # http://localhost:4200
```

## Scripts

| Script                 | Purpose                                |
| ---------------------- | -------------------------------------- |
| `npm start`            | Dev server                             |
| `npm run build`        | Production build                       |
| `npm test`             | Unit tests (Vitest + TestBed), watch   |
| `npm run test:ci`      | Unit tests, single run                 |
| `npm run lint`         | ESLint (TypeScript + templates + a11y) |
| `npm run format`       | Prettier write                         |
| `npm run format:check` | Prettier check                         |

## Environment configuration

`npm start` / `npm run build` run `scripts/ng-with-env.mjs`, which reads `NG_APP_*` variables from
the process environment or the git-ignored `.env` file and passes them to the official Angular
builder as compile-time `--define` constants. They are consumed only through
`src/environments/environment.ts`. Every key in `.env.example` is required; a missing one fails the
command immediately.

> Anything in a frontend environment file is compiled into the public JavaScript bundle. It can hold
> configuration such as API URLs, never secrets.

## Project structure

```
contracts/                  Shared API types used by the app and the mock API
mock-api/                   Local mock backend (Express)
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

Path aliases: `@core/*`, `@shared/*`, `@features/*`, `@env/*`.

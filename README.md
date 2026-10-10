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
#the password set here will be used to login through dashboard.For all users the password is same just username is different. Check seed-users.ts
npm run dev                              # mock API (:3000) + app (http://localhost:4200)
```

## Scripts

| Script                 | Purpose                                |
| ---------------------- | -------------------------------------- |
| `npm run dev`          | Mock API and dev server together       |
| `npm start`            | Dev server only (proxies `/api`)       |
| `npm run mock:api`     | Mock API only, restarts on change      |
| `npm run build`        | Production build                       |
| `npm test`             | Unit tests (Vitest + TestBed), watch   |
| `npm run test:ci`      | Unit tests, single run                 |
| `npm run lint`         | ESLint (TypeScript + templates + a11y) |
| `npm run format`       | Prettier write                         |
| `npm run format:check` | Prettier check                         |

## Features

| Brief                     | Where                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A. Application dashboard  | Server-side pagination, sorting and filtering kept in the URL; skeleton, error/retry and empty states; status counts   |
| B. Multi-step application | Five-step typed Reactive Form with custom validators (IBAN checksum, ownership ≤ 100 %, ticket ≤ volume)               |
| C. Draft & auto-save      | Debounced RxJS auto-save, skips unchanged content, keeps the form on errors, warns before leaving with unsaved changes |
| D. Detail & review        | Sectioned view with risk history and activity; approve/reject only for the assigned reviewer                           |
| F. Sensitive information  | IBAN and tax IDs masked by default; audited, role-based reveal that re-masks after 30 s; CSP (below)                   |

### Roles and permissions

| Action                        | SALES      | REVIEWER | ADMIN |
| ----------------------------- | ---------- | -------- | ----- |
| View applications             | Own        | Assigned | All   |
| Create, edit, submit          | Own drafts | –        | –     |
| Approve / reject (risk level) | –          | Assigned | –     |
| Assign reviewer               | –          | –        | ✓     |
| Reveal sensitive values       | Own drafts | Assigned | ✓     |

Users can hold several roles (permissions are the union), but nobody reviews an application they
created. The UI hides what a user cannot do; the API enforces every rule again on each request.

## Architecture notes

- **Standalone components, signals and `inject()`** throughout; lazy feature routes with
  `canMatch` guards, so code for forbidden areas is never downloaded.
- **Session**: the access token lives only in memory. `authInterceptor` attaches it to `/api`
  requests and, when several requests get `401` together, performs **one** shared
  `POST /auth/refresh` and retries each request once.
- **Permissions**: `PermissionService` and the `*appHasPermission` directive for role-based UI;
  per-record rules come from the server's `allowedActions`.
- **State**: small signal-based stores per page (`ApplicationListStore`, `ApplicationWizardStore`)
  with RxJS for async flows (`switchMap` cancels stale list requests, `concatMap` orders saves).
- **Tests**: Vitest + TestBed unit tests for services, guards, interceptor, stores, forms and
  components (`npm run test:ci`).

## Environment configuration

`npm start` / `npm run build` run `scripts/ng-with-env.mjs`, which reads `NG_APP_*` variables from
the process environment or the git-ignored `.env` file and passes them to the official Angular
builder as compile-time `--define` constants. They are consumed only through
`src/environments/environment.ts`. Every key in `.env.example` is required; a missing one fails the
command immediately.

> Anything in a frontend environment file is compiled into the public JavaScript bundle. It can hold
> configuration such as API URLs.

## Mock API

A small Express server in `mock-api/` that behaves like a real backend, so the frontend can be
built against realistic security boundaries:

- **Authentication**: short-lived opaque bearer access tokens (60 s by default) and a rotating,
  single-use refresh token in an `httpOnly`, `SameSite=Strict` cookie scoped to `/api/auth`. A
  non-secret `pp_session` cookie with the same lifetime tells the app a session may exist, so it
  only calls `/auth/refresh` on start-up when there is something to restore.
- **Authorization is enforced server-side** on every request. Users can hold several roles; their
  permissions are the union. Records outside a user's scope return `404`, and each application
  carries `allowedActions` computed by `mock-api/src/applications/application.policy.ts`.
- **Sensitive data** (IBAN, owner tax IDs) is always returned masked. Clear values are only
  available through an audited reveal endpoint and are write-only on save.

  only as a salted scrypt hash. All seed data is fictional.
- **Login rate limiting**: after `LOGIN_MAX_FAILURES` failed attempts a username is blocked for
  `LOGIN_LOCKOUT_SECONDS` (defaults: 5 attempts, 300 s).
- `MOCK_LATENCY_MS` and `MOCK_FAILURE_RATE` make loading and error/retry states easy to see.

The Angular dev server proxies `/api` to the mock API (`proxy.conf.json`), so the browser only
talks to its own origin and no CORS is needed. Node runs the TypeScript sources directly (native
type stripping), and `contracts/` holds the API types shared by both sides.

## Content Security Policy

The policy is a `<meta http-equiv="Content-Security-Policy">` tag in `src/index.html`, so it
applies wherever the app is served (dev server and production build alike):

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';
require-trusted-types-for 'script'; trusted-types angular angular#bundler
```

How it protects the app:

- **Scripts only from our own origin** (`script-src 'self'`, no `'unsafe-inline'` or
  `'unsafe-eval'`): even if an attacker managed to inject markup, an inline `<script>`, an
  `onerror=` handler, `eval()` or a script from another domain would not run. This is the main
  defence against XSS stealing the in-memory access token or revealed sensitive values.
  Critical-CSS inlining is disabled in the production build because it relies on an inline
  `onload` handler.
- **Trusted Types** (`require-trusted-types-for 'script'`): DOM sinks such as `innerHTML` only
  accept values created by Angular's sanitising policy, so raw HTML strings cannot be injected.
  `angular#unsafe-bypass` is not allowed, so `bypassSecurityTrust*` cannot be used either.
- **No data exfiltration**: `connect-src 'self'` limits network calls to our own `/api`;
  `object-src 'none'`, `base-uri 'self'` and `form-action 'self'` close plugin, base-tag and
  form-redirect tricks; fonts are self-hosted so no third-party origins are needed.
- CSP is defence in depth: Angular already escapes template bindings, and the code never uses
  `innerHTML` with untrusted data or `bypassSecurityTrust*`.


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
├─ testing/                 Test fixtures shared by specs
├─ styles/                  SCSS partials: design tokens, brand palette, theme, breakpoints
└─ app/
   ├─ core/                 App-wide singletons
   │  ├─ auth/              Session, token handling, guards, permissions
   │  ├─ http/              HTTP interceptors and error handling
   │  └─ layout/            Application shell and navigation
   ├─ shared/               Reusable, feature-agnostic building blocks
   │  ├─ guards/            Reusable route guards (unsaved changes)
   │  ├─ ui/                Presentational components
   │  ├─ validators/        Reusable form validators
   │  └─ utils/             Pure helper functions
   └─ features/             Lazy-loaded feature areas
      ├─ auth/              Login
      ├─ errors/            Forbidden and not-found pages
      └─ applications/
         ├─ data-access/    API service, models, state
         ├─ ui/             Status/risk badges, masked sensitive value
         ├─ list/           Dashboard
         ├─ wizard/         Multi-step merchant application
         └─ detail/         Application detail and review
```

Path aliases: `@core/*`, `@shared/*`, `@features/*`, `@env/*`, `@contracts`.

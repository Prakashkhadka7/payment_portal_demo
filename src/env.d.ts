/**
 * Compile-time constants injected by `scripts/ng-with-env.mjs` (via Angular's `--define`) from the
 * process environment or the git-ignored `.env` file.
 *
 * Every value declared here is compiled into the public browser bundle, so it must never contain
 * a secret. Only `src/environments/environment.ts` should read these constants.
 */

/** Base URL of the backend API. Relative (`/api`) in development, proxied by the dev server. */
declare const NG_APP_API_BASE_URL: string;

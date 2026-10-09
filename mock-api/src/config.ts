import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface MockApiConfig {
  readonly port: number;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly seedUserPassword: string;
  readonly latencyMs: number;
  readonly failureRate: number;
  readonly secureCookies: boolean;
  /** Failed logins allowed per user (and client) before further attempts are blocked. */
  readonly loginMaxFailures: number;
  /** Window in which failures are counted; also how long a block lasts. */
  readonly loginLockoutSeconds: number;
}

const ENV_FILE = fileURLToPath(new URL('../.env', import.meta.url));
const MIN_PASSWORD_LENGTH = 8;

/**
 * Builds the config from `mock-api/.env` (if present) and the process environment.
 * Fails fast with a readable message instead of starting with an insecure or broken setup.
 */
export function loadConfig(): MockApiConfig {
  if (existsSync(ENV_FILE)) {
    process.loadEnvFile(ENV_FILE);
  }

  const seedUserPassword = process.env['SEED_USER_PASSWORD'] ?? '';
  if (seedUserPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_USER_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters. ` +
        'Copy mock-api/.env.example to mock-api/.env and set it.',
    );
  }

  return {
    port: readInteger('MOCK_API_PORT', 3000, 1, 65_535),
    accessTokenTtlSeconds: readInteger('ACCESS_TOKEN_TTL_SECONDS', 60, 10, 86_400),
    refreshTokenTtlSeconds: readInteger('REFRESH_TOKEN_TTL_SECONDS', 28_800, 60, 604_800),
    seedUserPassword,
    latencyMs: readInteger('MOCK_LATENCY_MS', 400, 0, 10_000),
    failureRate: readNumber('MOCK_FAILURE_RATE', 0, 0, 1),
    secureCookies: process.env['COOKIE_SECURE'] === 'true',
    loginMaxFailures: readInteger('LOGIN_MAX_FAILURES', 5, 1, 100),
    loginLockoutSeconds: readInteger('LOGIN_LOCKOUT_SECONDS', 300, 10, 86_400),
  };
}

function readNumber(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a number between ${min} and ${max}, got "${raw}".`);
  }
  return value;
}

function readInteger(name: string, fallback: number, min: number, max: number): number {
  const value = readNumber(name, fallback, min, max);
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be a whole number, got "${process.env[name]}".`);
  }
  return value;
}

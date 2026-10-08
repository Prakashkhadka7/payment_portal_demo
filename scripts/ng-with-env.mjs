/**
 * Runs an Angular CLI command with `NG_APP_*` environment variables exposed to the app.
 *
 * Values come from the process environment (CI/deploy) or, locally, from the git-ignored `.env`
 * file. Each one is passed to the official Angular builder as a compile-time `--define`.
 * Every key listed in `.env.example` is required, so a missing value fails fast here rather than
 * surfacing as `undefined` at runtime.
 *
 * Usage: node scripts/ng-with-env.mjs <ng command> [...args]   e.g. `serve`, `build`
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parseEnv } from 'node:util';

const PREFIX = 'NG_APP_';
const ENV_FILE = '.env';
const ENV_TEMPLATE = '.env.example';

if (existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

const requiredKeys = Object.keys(parseEnv(readFileSync(ENV_TEMPLATE, 'utf8')));
const missingKeys = requiredKeys.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  console.error(
    `Missing environment variables: ${missingKeys.join(', ')}.\n` +
      `Copy ${ENV_TEMPLATE} to ${ENV_FILE} and fill in the values.`,
  );
  process.exit(1);
}

const defineArgs = Object.entries(process.env)
  .filter(([key]) => key.startsWith(PREFIX))
  .flatMap(([key, value]) => ['--define', `${key}=${JSON.stringify(value)}`]);

// Resolve the local CLI and spawn it without a shell, so values are never shell-interpolated.
const ngCli = createRequire(import.meta.url).resolve('@angular/cli/bin/ng.js');
const { status } = spawnSync(process.execPath, [ngCli, ...process.argv.slice(2), ...defineArgs], {
  stdio: 'inherit',
});

process.exit(status ?? 1);

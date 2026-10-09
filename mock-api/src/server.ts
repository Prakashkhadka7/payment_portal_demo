import { createApp } from './app.ts';
import { ApplicationRepository } from './applications/application.repository.ts';
import { LoginRateLimiter } from './auth/login-rate-limiter.ts';
import { TokenStore } from './auth/token-store.ts';
import { loadConfig, type MockApiConfig } from './config.ts';
import { createSeedApplications } from './seed/seed-applications.ts';
import { createSeedUsers } from './seed/seed-users.ts';
import { UserRepository } from './users/user.repository.ts';

let config: MockApiConfig;
try {
  config = loadConfig();
} catch (error) {
  console.error(`Mock API configuration error: ${(error as Error).message}`);
  process.exit(1);
}

const users = new UserRepository(await createSeedUsers(config.seedUserPassword));

const app = createApp({
  config,
  users,
  applications: new ApplicationRepository(createSeedApplications()),
  tokens: new TokenStore(config),
  rateLimiter: new LoginRateLimiter({
    maxFailures: config.loginMaxFailures,
    windowMs: config.loginLockoutSeconds * 1000,
  }),
});

app.listen(config.port, () => {
  console.info(`Mock API listening on http://localhost:${config.port}/api`);
});

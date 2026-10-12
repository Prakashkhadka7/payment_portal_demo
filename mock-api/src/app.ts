import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { ApplicationsService } from './applications/applications.service.ts';
import { createApplicationsRouter } from './applications/applications.routes.ts';
import type { ApplicationRepository } from './applications/application.repository.ts';
import { requireAuth } from './auth/auth.middleware.ts';
import { createAuthRouter } from './auth/auth.routes.ts';
import type { ApplicationChanges } from './realtime/realtime-server.ts';
import type { LoginRateLimiter } from './auth/login-rate-limiter.ts';
import type { TokenStore } from './auth/token-store.ts';
import type { MockApiConfig } from './config.ts';
import { errorHandler, notFoundHandler } from './shared/http-error.ts';
import { simulateNetwork } from './shared/network-simulation.ts';
import type { UserRepository } from './users/user.repository.ts';
import { createUsersRouter } from './users/users.routes.ts';

export interface AppDependencies {
  readonly config: Pick<
    MockApiConfig,
    'refreshTokenTtlSeconds' | 'secureCookies' | 'latencyMs' | 'failureRate'
  >;
  readonly users: UserRepository;
  readonly applications: ApplicationRepository;
  readonly changes?: ApplicationChanges;
  readonly tokens: TokenStore;
  readonly rateLimiter: LoginRateLimiter;
  readonly now?: () => Date;
}

/**
 * Builds the Express app without listening, so tests can run it on an ephemeral port.
 * No CORS middleware on purpose: the browser reaches the API through the same-origin dev proxy.
 */
export function createApp(deps: AppDependencies): Express {
  const { config, users, applications, changes, tokens, rateLimiter, now } = deps;
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  // API responses may carry personal data: never let browsers or proxies cache them.
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use('/api/auth', createAuthRouter({ users, tokens, rateLimiter, config }));

  const authenticated = [requireAuth(tokens, users), simulateNetwork(config)];
  app.use('/api/users', ...authenticated, createUsersRouter(users));
  app.use(
    '/api/applications',
    ...authenticated,
    createApplicationsRouter(new ApplicationsService({ applications, users, changes, now })),
  );

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}

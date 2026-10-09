import type { RequestHandler } from 'express';
import { HttpError } from './http-error.ts';

export interface NetworkSimulationOptions {
  readonly latencyMs: number;
  /** 0..1 probability of failing a request with 503. */
  readonly failureRate: number;
}

/** Adds latency and random outages to data endpoints so loading and retry states can be seen. */
export function simulateNetwork({
  latencyMs,
  failureRate,
}: NetworkSimulationOptions): RequestHandler {
  return async (_req, _res, next) => {
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }
    if (failureRate > 0 && Math.random() < failureRate) {
      throw new HttpError(
        503,
        'SERVICE_UNAVAILABLE',
        'Service temporarily unavailable (simulated)',
      );
    }
    next();
  };
}

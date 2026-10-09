export interface LoginRateLimiterOptions {
  readonly maxFailures: number;
  readonly windowMs: number;
  readonly now?: () => number;
}

interface FailureWindow {
  count: number;
  readonly resetAt: number;
}

/** Slows down password guessing: blocks a key after too many failures within a time window. */
export class LoginRateLimiter {
  private readonly failures = new Map<string, FailureWindow>();
  private readonly options: LoginRateLimiterOptions;
  private readonly now: () => number;

  constructor(options: LoginRateLimiterOptions) {
    this.options = options;
    this.now = options.now ?? Date.now;
  }

  isBlocked(key: string): boolean {
    const window = this.activeWindow(key);
    return window !== undefined && window.count >= this.options.maxFailures;
  }

  recordFailure(key: string): void {
    const window = this.activeWindow(key);
    if (window) {
      window.count += 1;
    } else {
      this.failures.set(key, { count: 1, resetAt: this.now() + this.options.windowMs });
    }
  }

  reset(key: string): void {
    this.failures.delete(key);
  }

  private activeWindow(key: string): FailureWindow | undefined {
    const window = this.failures.get(key);
    if (window && window.resetAt <= this.now()) {
      this.failures.delete(key);
      return undefined;
    }
    return window;
  }
}

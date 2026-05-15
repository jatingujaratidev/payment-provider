import {
  RETRY_BASE_DELAY_MS,
  RETRY_JITTER_MAX_MS,
  RETRY_MAX_ATTEMPTS,
  RETRY_MAX_DELAY_MS,
} from '../constants/app.constants';
export interface RetryBackoffConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMaxMs: number;
}
export type OnRetryCallback = (info: {
  attemptIndex: number;
  delayMs: number;
  error: unknown;
}) => void;
export const DEFAULT_RETRY_CONFIG: RetryBackoffConfig = {
  maxAttempts: RETRY_MAX_ATTEMPTS,
  baseDelayMs: RETRY_BASE_DELAY_MS,
  maxDelayMs: RETRY_MAX_DELAY_MS,
  jitterMaxMs: RETRY_JITTER_MAX_MS,
};
function computeDelayMs(attempt: number, config: RetryBackoffConfig): number {
  const exp = config.baseDelayMs * 2 ** attempt;
  const jitter = Math.floor(Math.random() * (config.jitterMaxMs + 1));
  return Math.min(exp + jitter, config.maxDelayMs);
}
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  isRetryable: (error: unknown) => boolean,
  config: RetryBackoffConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: OnRetryCallback,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < config.maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = isRetryable(error);
      const isLast = attempt === config.maxAttempts - 1;
      if (!retryable || isLast) {
        throw error;
      }
      const delay = computeDelayMs(attempt, config);
      onRetry?.({ attemptIndex: attempt, delayMs: delay, error });
      await sleep(delay);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

import { HttpError } from "../../errors/HttpError";

/** The longest `Retry-After` the MCP waits out; a longer one fails with the 429. */
export const MAX_RETRY_AFTER_S = 60;
/** Wait used when a 429 carries no usable `Retry-After`. */
export const DEFAULT_RETRY_AFTER_S = 5;

export type Sleep = (ms: number) => Promise<void>;
export const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Seconds a 429 asks to wait, from its `Retry-After` header, capped at {@link MAX_RETRY_AFTER_S}. */
export function retryAfterSeconds(headers: Record<string, string> | undefined): number {
  const value = Number(headers?.["retry-after"]);
  return Math.min(Number.isFinite(value) && value > 0 ? value : DEFAULT_RETRY_AFTER_S, MAX_RETRY_AFTER_S);
}

/**
 * Run a v1 call; on a 429 (Plane allows 60 requests a minute) wait the `Retry-After` once
 * and try again. A second 429 is thrown.
 */
export async function withRateLimitRetry<T>(call: () => Promise<T>, sleep: Sleep = realSleep): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!(error instanceof HttpError) || error.statusCode !== 429) throw error;
    await sleep(retryAfterSeconds(error.headers) * 1000);
    return call();
  }
}

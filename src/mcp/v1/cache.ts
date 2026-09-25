/** Five minutes: projects, states, labels, members and `me` change rarely. */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/** A time-limited memo of async loads, shared by every request the process serves. */
export class TtlCache {
  private entries = new Map<string, { value: Promise<unknown>; expires: number }>();

  constructor(
    private readonly ttlMs: number = CACHE_TTL_MS,
    private readonly now: () => number = Date.now
  ) {}

  get<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && hit.expires > this.now()) return hit.value as Promise<T>;
    const value = load();
    this.entries.set(key, { value, expires: this.now() + this.ttlMs });
    // A failed load must not be served from the cache.
    value.catch(() => {
      if (this.entries.get(key)?.value === value) this.entries.delete(key);
    });
    return value;
  }

  clear(): void {
    this.entries.clear();
  }
}

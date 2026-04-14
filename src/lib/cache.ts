type StoredEntry<T> = {
  data: T;
  expiry: number;
};

export class TTLCache<T = unknown> {
  private store = new Map<string, StoredEntry<T>>();
  private ttl: number;

  constructor(ttlMs: number = 60_000) {
    this.ttl = ttlMs;
  }

  put(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, {
      data: value,
      expiry: Date.now() + (ttlMs ?? this.ttl),
    });
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiry) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  remove(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    this.evictExpired();
    return this.store.size;
  }

  async getOrFetch(key: string, fetcher: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const result = await fetcher();
    this.put(key, result, ttlMs);
    return result;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.expiry) {
        this.store.delete(key);
      }
    }
  }
}

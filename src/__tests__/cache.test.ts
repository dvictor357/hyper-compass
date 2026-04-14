import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TTLCache } from '../lib/cache.ts';

describe('TTLCache', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves a value', () => {
    const cache = new TTLCache<string>();
    cache.put('foo', 'bar');
    expect(cache.get('foo')).toBe('bar');
  });

  it('returns undefined for missing keys', () => {
    const cache = new TTLCache<string>();
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('expires entries after TTL', () => {
    vi.useFakeTimers();
    const cache = new TTLCache<string>(5000);
    cache.put('key', 'value');
    expect(cache.get('key')).toBe('value');

    vi.advanceTimersByTime(5001);
    expect(cache.get('key')).toBeUndefined();
  });

  it('supports per-entry custom TTL', () => {
    vi.useFakeTimers();
    const cache = new TTLCache<string>(10000);
    cache.put('short', 'data', 1000);
    cache.put('long', 'data', 50000);

    vi.advanceTimersByTime(1001);
    expect(cache.get('short')).toBeUndefined();
    expect(cache.get('long')).toBe('data');
  });

  it('reports has() correctly', () => {
    const cache = new TTLCache<number>();
    cache.put('exists', 42);
    expect(cache.has('exists')).toBe(true);
    expect(cache.has('nope')).toBe(false);
  });

  it('removes entries with remove()', () => {
    const cache = new TTLCache<number>();
    cache.put('x', 1);
    expect(cache.remove('x')).toBe(true);
    expect(cache.get('x')).toBeUndefined();
    expect(cache.remove('x')).toBe(false);
  });

  it('clears all entries', () => {
    const cache = new TTLCache<number>();
    cache.put('a', 1);
    cache.put('b', 2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('reports size excluding expired entries', () => {
    vi.useFakeTimers();
    const cache = new TTLCache<number>(3000);
    cache.put('a', 1);
    cache.put('b', 2);
    expect(cache.size()).toBe(2);

    vi.advanceTimersByTime(3001);
    expect(cache.size()).toBe(0);
  });

  it('getOrFetch returns cached value without calling fetcher', async () => {
    const cache = new TTLCache<string>();
    cache.put('cached', 'existing');
    const fetcher = vi.fn().mockResolvedValue('fresh');
    const result = await cache.getOrFetch('cached', fetcher);
    expect(result).toBe('existing');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('getOrFetch calls fetcher and caches result for missing key', async () => {
    const cache = new TTLCache<string>();
    const fetcher = vi.fn().mockResolvedValue('fresh');
    const result = await cache.getOrFetch('new', fetcher);
    expect(result).toBe('fresh');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(cache.get('new')).toBe('fresh');
  });

  it('works with generic types', () => {
    const numCache = new TTLCache<number>();
    numCache.put('n', 123);
    expect(numCache.get('n')).toBe(123);

    const objCache = new TTLCache<{ name: string }>();
    objCache.put('o', { name: 'test' });
    expect(objCache.get('o')).toEqual({ name: 'test' });
  });
});

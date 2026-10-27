import { getItem, setItem } from './storage';
import type { Product } from '@/types/database';

const CACHE_PREFIX = 'cache:search:';
const CACHE_TTL = 30 * 60 * 1000;

interface CacheEntry {
  data: Product[];
  total: number;
  timestamp: number;
}

async function getCacheKeys(): Promise<string[]> {
  const raw = await getItem('cache:keys');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function saveCacheKeys(keys: string[]) {
  await setItem('cache:keys', JSON.stringify(keys));
}

export async function getCachedSearch(query: string): Promise<{ products: Product[]; total: number } | null> {
  try {
    const key = `${CACHE_PREFIX}${query.toLowerCase().trim()}`;
    const raw = await getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      return null;
    }
    return { products: entry.data, total: entry.total };
  } catch {
    return null;
  }
}

export async function setCachedSearch(query: string, products: Product[], total: number) {
  try {
    const key = `${CACHE_PREFIX}${query.toLowerCase().trim()}`;
    const entry: CacheEntry = { data: products, total, timestamp: Date.now() };
    await setItem(key, JSON.stringify(entry));

    const keys = await getCacheKeys();
    if (!keys.includes(key)) {
      keys.push(key);
      await saveCacheKeys(keys);
    }
  } catch {}
}

export async function clearSearchCache() {
  try {
    const keys = await getCacheKeys();
    for (const key of keys) {
      await setItem(key, '');
    }
    await saveCacheKeys([]);
  } catch {}
}

export async function getCacheStats(): Promise<{ count: number }> {
  try {
    const keys = await getCacheKeys();
    return { count: keys.length };
  } catch {
    return { count: 0 };
  }
}

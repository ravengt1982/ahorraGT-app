import { getItem, setItem } from './storage';

const HISTORY_KEY = 'search_history';
const MAX_ITEMS = 10;

export async function getSearchHistory(): Promise<string[]> {
  try {
    const raw = await getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function addToSearchHistory(query: string): Promise<void> {
  if (!query.trim()) return;
  try {
    const history = await getSearchHistory();
    const filtered = history.filter((h) => h.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_ITEMS);
    await setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export async function clearSearchHistory(): Promise<void> {
  try {
    await setItem(HISTORY_KEY, JSON.stringify([]));
  } catch {}
}

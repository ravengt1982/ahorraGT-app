import {
  collection, query, where, orderBy, limit as firestoreLimit,
  getDocs, documentId, doc, getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Product, Price, Store } from '@/types/database';
import { getCachedSearch, setCachedSearch } from './offlineCache';

export interface SearchResult {
  products: Product[];
  total: number;
}

export interface SearchParams {
  query: string;
  categoryId?: number | null;
  storeId?: number | null;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
}

const GROUP_A_STORES = ['Walmart Guatemala', 'Paiz', 'Maxi Despensa'];
const LA_TORRE_STORE = 'La Torre';

export interface UnitPriceInfo {
  store: string;
  value: number;
  unit: string;
  raw: string;
  productId: string;
  productName: string;
}

export interface ComparisonResult {
  groupA: Price[];
  laTorreMatch: Price | null;
  laTorreProductName: string | null;
  unitPrices: UnitPriceInfo[];
}

function isLiquidUnit(unit: string): boolean {
  return ['ml', 'l', 'litro', 'litros', 'mililitro', 'mililitros'].includes(unit);
}

function isSolidUnit(unit: string): boolean {
  return ['g', 'gr', 'kg', 'lb', 'oz', 'gramo', 'gramos', 'kilo', 'kilos', 'libra', 'libras'].includes(unit);
}

function normalizeToBase(amount: number, unit: string): { value: number; unit: string } {
  const u = unit.toLowerCase();
  if (['kg', 'kilo', 'kilos'].includes(u)) return { value: amount * 1000, unit: 'g' };
  if (['lb', 'libra', 'libras'].includes(u)) return { value: amount * 453.592, unit: 'g' };
  if (['oz'].includes(u)) return { value: amount * 28.3495, unit: 'g' };
  if (['l', 'litro', 'litros'].includes(u)) return { value: amount * 1000, unit: 'ml' };
  if (['g', 'gr', 'gramo', 'gramos'].includes(u)) return { value: amount, unit: 'g' };
  if (['ml', 'mililitro', 'mililitros'].includes(u)) return { value: amount, unit: 'ml' };
  return { value: amount, unit: u };
}

function extractWeightFromName(productName: string): { amount: number; unit: string } | null {
  const n = productName.toLowerCase();
  let m = n.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilo|kilos)/);
  if (m) return { amount: parseFloat(m[1].replace(',', '.')) * 1000, unit: 'g' };
  m = n.match(/(\d+(?:[.,]\d+)?)\s*(lb|libra|libras)/);
  if (m) return { amount: parseFloat(m[1].replace(',', '.')) * 453.592, unit: 'g' };
  m = n.match(/(\d+(?:[.,]\d+)?)\s*(oz)/);
  if (m) return { amount: parseFloat(m[1].replace(',', '.')) * 28.3495, unit: 'g' };
  m = n.match(/(\d+(?:[.,]\d+)?)\s*(l|litro|litros)\b/);
  if (m) return { amount: parseFloat(m[1].replace(',', '.')) * 1000, unit: 'ml' };
  m = n.match(/(\d+(?:[.,]\d+)?)\s*(ml|mililitros?)\b/);
  if (m) return { amount: parseFloat(m[1].replace(',', '.')), unit: 'ml' };
  m = n.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|gramos?)\b/);
  if (m) return { amount: parseFloat(m[1].replace(',', '.')), unit: 'g' };
  m = n.match(/(\d+(?:[.,]\d+)?)\s*(unit|unidad|ud|uds|pza|pieza)s?\b/);
  if (m) return { amount: parseFloat(m[1].replace(',', '.')), unit: 'unit' };
  return null;
}

function calculateUnitPrice(
  price: number,
  netQuantity: number | null,
  netUnit: string | null,
  productName: string,
): { value: number; unit: string } | null {
  if (netQuantity && netUnit) {
    const normalized = normalizeToBase(netQuantity, netUnit);
    return { value: price / normalized.value, unit: normalized.unit };
  }
  const fromName = extractWeightFromName(productName);
  if (fromName && fromName.amount > 0) {
    return { value: price / fromName.amount, unit: fromName.unit };
  }
  return null;
}

function formatUnitPrice(info: { value: number; unit: string } | null): string {
  if (!info) return 'Sin datos';
  const unitLabel = info.unit === 'g' ? '/g' : info.unit === 'ml' ? '/ml' : '/ud';
  return `Q ${info.value.toFixed(4)}${unitLabel}`;
}

function tokenize(name: string): string[] {
  return name.toLowerCase()
    .replace(/[^\w\sáéíóúñ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['empaque', 'con', 'para', 'por', 'und', 'uds'].includes(w));
}

function wordOverlapScore(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setB = new Set(tokensB);
  const matches = tokensA.filter(t => setB.has(t)).length;
  return matches / Math.max(tokensA.length, tokensB.length);
}

export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  const { query: searchQuery, categoryId, storeId, sortBy, sortDir, page, pageSize = 20 } = params;
  const pageOffset = ((page ?? 1) - 1) * pageSize;

  if (page === 1 && !categoryId && !storeId) {
    const cached = await getCachedSearch(searchQuery);
    if (cached) return cached;
  }

  let q = query(collection(db, 'products'));

  if (searchQuery) {
    const searchLower = searchQuery.toLowerCase();
    q = query(q, where('name_lower', '>=', searchLower), where('name_lower', '<=', searchLower + '\uf8ff'));
  }

  if (storeId) {
    q = query(q, where('store_id', '==', String(storeId)));
  }

  if (categoryId) {
    q = query(q, where('category_id', '==', categoryId));
  }

  if (!searchQuery) {
    const sortField = sortBy === 'price' ? 'min_price' : sortBy === 'name' ? 'name_lower' : 'min_price';
    const sortDirection = sortDir === 'asc' ? 'asc' : 'desc';
    q = query(q, orderBy(sortField, sortDirection));
  }

  const snapshot = await getDocs(q);
  let allProducts = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Product[];

  if (searchQuery) {
    const sortField = sortBy === 'price' ? 'min_price' : sortBy === 'name' ? 'name_lower' : 'min_price';
    const sortDirection = sortDir === 'asc' ? 'asc' : 'desc';
    allProducts.sort((a, b) => {
      const av = sortField === 'min_price' ? (a.min_price ?? a.price ?? 0) : (a as any)[sortField] ?? '';
      const bv = sortField === 'min_price' ? (b.min_price ?? b.price ?? 0) : (b as any)[sortField] ?? '';
      if (sortDirection === 'asc') return av < bv ? -1 : av > bv ? 1 : 0;
      return av > bv ? -1 : av < bv ? 1 : 0;
    });
  }

  const byNormName = new Map<string, Product[]>();
  for (const p of allProducts) {
    const key = p.normalized_name || p.name_lower || p.id;
    if (!byNormName.has(key)) byNormName.set(key, []);
    byNormName.get(key)!.push(p);
  }

  const deduped: Product[] = [];
  for (const [, group] of byNormName) {
    const groupA = group.filter(p => p.store_name && GROUP_A_STORES.includes(p.store_name));
    const best = groupA.length > 0
      ? groupA.reduce((a, b) => (a.price ?? Infinity) < (b.price ?? Infinity) ? a : b)
      : group.reduce((a, b) => (a.price ?? Infinity) < (b.price ?? Infinity) ? a : b);

    const storesInGroup = [...new Set(group.map(p => p.store_name).filter(Boolean))];
    deduped.push({
      ...best,
      store_count: storesInGroup.length,
    } as Product);
  }

  const total = deduped.length;
  const products = deduped.slice(pageOffset, pageOffset + pageSize);

  if (page === 1 && !categoryId && !storeId && products.length > 0) {
    setCachedSearch(searchQuery, products, total);
  }

  return { products, total };
}

export async function suggestProducts(prefix: string): Promise<Pick<Product, 'id' | 'name'>[]> {
  if (prefix.length < 1) return [];
  const prefixLower = prefix.toLowerCase();

  const q = query(
    collection(db, 'products'),
    where('name_lower', '>=', prefixLower),
    where('name_lower', '<=', prefixLower + '\uf8ff'),
    firestoreLimit(10),
  );

  const snapshot = await getDocs(q);

  const seen = new Set<string>();
  const results: Pick<Product, 'id' | 'name'>[] = [];
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const key = data.normalized_name || data.name_lower || docSnap.id;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ id: docSnap.id, name: data.name });
    }
  }
  return results;
}

export async function getComparisonData(productId: string): Promise<ComparisonResult> {
  const productDoc = await getDoc(doc(db, 'products', productId));
  if (!productDoc.exists()) return { groupA: [], laTorreMatch: null, laTorreProductName: null, unitPrices: [] };

  const productData = productDoc.data();
  const normalizedName = productData.normalized_name as string | undefined;
  const baseProductType = productData.base_product_type as string | undefined;

  const groupA: Price[] = [];
  if (normalizedName) {
    try {
      const qA = query(
        collection(db, 'products'),
        where('normalized_name', '==', normalizedName),
        firestoreLimit(20),
      );
      const snapA = await getDocs(qA);
      const seenStores = new Set<string>();
      for (const docSnap of snapA.docs) {
        const d = docSnap.data();
        const store = d.store_name as string;
        if (store && GROUP_A_STORES.includes(store) && !seenStores.has(store) && d.price > 0) {
          seenStores.add(store);
          groupA.push({
            id: docSnap.id,
            product_id: docSnap.id,
            store_id: d.store_id,
            store_name: store,
            price: d.price,
            currency: d.currency,
            net_quantity: d.net_quantity,
            net_unit: d.net_unit,
            unit_price: d.unit_price,
            unit_price_standard: d.unit_price_standard,
          } as Price);
        }
      }
      groupA.sort((a, b) => a.price - b.price);
    } catch {}
  }

  let laTorreMatch: Price | null = null;
  let laTorreProductName: string | null = null;

  if (baseProductType) {
    try {
      const qLT = query(
        collection(db, 'products'),
        where('store_name', '==', LA_TORRE_STORE),
        where('base_product_type', '==', baseProductType),
        firestoreLimit(50),
      );
      const snapLT = await getDocs(qLT);
      let bestScore = 0;
      let bestDoc: any = null;

      for (const docSnap of snapLT.docs) {
        const d = docSnap.data();
        if (!d.price || d.price <= 0) continue;
        const score = wordOverlapScore(normalizedName || productData.name, d.normalized_name || d.name);
        if (score > bestScore) {
          bestScore = score;
          bestDoc = { id: docSnap.id, ...d };
        }
      }

      if (bestDoc && bestScore >= 0.3) {
        laTorreMatch = {
          id: bestDoc.id,
          product_id: bestDoc.id,
          store_id: bestDoc.store_id,
          store_name: LA_TORRE_STORE,
          price: bestDoc.price,
          currency: bestDoc.currency,
          net_quantity: bestDoc.net_quantity,
          net_unit: bestDoc.net_unit,
          unit_price: bestDoc.unit_price,
          unit_price_standard: bestDoc.unit_price_standard,
        } as Price;
        laTorreProductName = bestDoc.name;
      }
    } catch {}
  }

  const allPrices = [...groupA];
  if (laTorreMatch) allPrices.push(laTorreMatch);

  const unitPrices: UnitPriceInfo[] = allPrices
    .map(p => {
      const productName = p.store_name === LA_TORRE_STORE
        ? (laTorreProductName || productData.name)
        : productData.name;
      const info = calculateUnitPrice(p.price, p.net_quantity ?? null, p.net_unit ?? null, productName);
      return {
        store: p.store_name ?? 'Tienda',
        value: info?.value ?? Infinity,
        unit: info?.unit ?? '',
        raw: formatUnitPrice(info),
        productId: p.product_id,
        productName,
      };
    })
    .filter(u => u.value < Infinity);

  return { groupA, laTorreMatch, laTorreProductName, unitPrices };
}

export async function getPricesForProduct(productId: string): Promise<Price[]> {
  const result = await getComparisonData(productId);
  return [...result.groupA, ...(result.laTorreMatch ? [result.laTorreMatch] : [])];
}

export async function getProductById(productId: string): Promise<Product | null> {
  const productDoc = await getDoc(doc(db, 'products', productId));
  if (!productDoc.exists()) return null;
  return { id: productDoc.id, ...productDoc.data() } as Product;
}

export async function getSimilarProducts(
  productId: string,
  baseProductType: string | null | undefined,
  limitCount = 6,
): Promise<Product[]> {
  if (!baseProductType) {
    const snap = await getDocs(query(
      collection(db, 'products'),
      where('min_price', '>', 0),
      orderBy('min_price', 'asc'),
      firestoreLimit(limitCount * 5),
    ));
    return deduplicateProducts(snap, productId, limitCount);
  }

  const snap = await getDocs(query(
    collection(db, 'products'),
    where('base_product_type', '==', baseProductType),
    firestoreLimit(limitCount * 5),
  ));
  return deduplicateProducts(snap, productId, limitCount);
}

function deduplicateProducts(snap: any, excludeId: string, limitCount: number): Product[] {
  const seen = new Set<string>();
  const products: Product[] = [];

  for (const docSnap of snap.docs) {
    if (docSnap.id === excludeId) continue;
    const data = docSnap.data();
    const nn = data.normalized_name || data.name_lower;
    if (nn && !seen.has(nn)) {
      seen.add(nn);
      products.push({ id: docSnap.id, ...data } as Product);
    }
    if (products.length >= limitCount) break;
  }

  return products;
}

export async function getStores(): Promise<Store[]> {
  const snapshot = await getDocs(collection(db, 'stores'));
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Store[];
}

export async function getFeaturedProducts(pageSize = 20): Promise<Product[]> {
  const q = query(
    collection(db, 'products'),
    where('min_price', '>', 0),
    orderBy('min_price', 'asc'),
    firestoreLimit(pageSize * 3),
  );
  const snapshot = await getDocs(q);

  const seen = new Set<string>();
  const products: Product[] = [];
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const nn = data.normalized_name || data.name_lower;
    if (nn && !seen.has(nn)) {
      seen.add(nn);
      products.push({ id: docSnap.id, ...data } as Product);
    }
    if (products.length >= pageSize) break;
  }
  return products;
}

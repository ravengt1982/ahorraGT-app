import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, FlatList, ActivityIndicator, StyleSheet, Text, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { searchProducts, suggestProducts, getStores, getFeaturedProducts } from '@/lib/products';
import { getCategories } from '@/lib/admin';
import SearchBar from '@/components/SearchBar';
import ProductCard from '@/components/ProductCard';
import CategoryChips from '@/components/CategoryChips';
import StoreChips from '@/components/StoreChips';
import SortPicker from '@/components/SortPicker';
import SearchSuggestions from '@/components/SearchSuggestions';
import EmptyState from '@/components/EmptyState';
import { useTheme } from '@/contexts/ThemeContext';
import { track } from '@/lib/analytics';
import { useToast } from '@/contexts/ToastContext';
import { getSearchHistory, addToSearchHistory, clearSearchHistory } from '@/lib/searchHistory';
import { addFavorite } from '@/lib/favorites';
import { addItemToList } from '@/lib/shoppingList';
import AddToListModal from '@/components/AddToListModal';
import { useAuth } from '@/contexts/AuthContext';
import type { Product, Category, Store } from '@/types/database';
import type { SearchResult } from '@/lib/products';

export default function BuscarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'relevance', direction: 'desc' });

  const [suggestions, setSuggestions] = useState<Pick<Product, 'id' | 'name'>[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const [gridView, setGridView] = useState(false);
  const [addToListProduct, setAddToListProduct] = useState<Product | null>(null);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const searchIdRef = useRef(0);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getStores().then(setStores).catch(() => {});
    loadHistory();
    setLoadingFeatured(true);
    getFeaturedProducts(20)
      .then(setFeatured)
      .catch(() => {})
      .finally(() => setLoadingFeatured(false));
    return () => { mounted.current = false; };
  }, []);

  async function loadHistory() {
    const h = await getSearchHistory();
    if (mounted.current) setHistory(h);
  }

  const doSearch = useCallback(async (p: number, append: boolean, searchText?: string) => {
    const q = searchText ?? queryRef.current;
    const id = ++searchIdRef.current;
    if (q.length < 2) {
      setResults([]); setTotal(0); setLoading(false); setLoadingMore(false);
      return;
    }
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const result: SearchResult = await searchProducts({
        query: q, categoryId: selectedCategory, storeId: selectedStore,
        sortBy: sort.column, sortDir: sort.direction,
        page: p, pageSize: 20,
      });
      if (!mounted.current || id !== searchIdRef.current) return;
      setTotal(result.total);
      setResults(append ? (prev) => [...prev, ...result.products] : result.products);
      track('search', { query: q, results: result.total });
    } catch {
      if (!mounted.current || id !== searchIdRef.current) return;
      if (!append) setResults([]);
      showToast('Error al buscar productos');
    } finally {
      if (mounted.current && id === searchIdRef.current) {
        setLoading(false); setLoadingMore(false); setRefreshing(false);
      }
    }
  }, [selectedCategory, selectedStore, sort, showToast]);

  useEffect(() => {
    if (query.length < 2) return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (mounted.current) {
        setPage(1);
        doSearch(1, false);
      }
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, selectedCategory, selectedStore, sort, doSearch]);

  useEffect(() => {
    if (query.length < 1 || !focused) return;
    clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      try {
        const s = await suggestProducts(query);
        if (mounted.current) {
          setSuggestions(s);
          setShowSuggestions(s.length > 0);
        }
      } catch { if (mounted.current) setSuggestions([]); }
    }, 150);
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [query, focused]);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      setTotal(0);
      setSuggestions([]);
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || loading || results.length >= total) return;
    const next = page + 1;
    setPage(next);
    doSearch(next, true);
  }, [loadingMore, loading, results.length, total, page, doSearch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await doSearch(1, false);
  }, [doSearch]);

  const handlePress = useCallback((product: Product) => {
    router.push({
      pathname: '/(tabs)/comparar',
      params: { productId: product.id, productName: product.name },
    });
  }, [router]);

  const handleAddToList = useCallback(async (listId: number) => {
    if (!addToListProduct) return;
    try {
      await addItemToList(listId, addToListProduct.id, addToListProduct.name, 1, user?.uid ?? null);
      showToast('Producto agregado a la lista');
    } catch {
      showToast('Error al agregar producto');
    }
    setAddToListProduct(null);
  }, [addToListProduct, showToast, user]);

  const handleAddFavorite = useCallback(async (product: Product) => {
    if (!user) { showToast('Inicia sesión para guardar favoritos'); return; }
    try {
      await addFavorite(user.uid, product.id, product.name);
      showToast('Agregado a favoritos');
    } catch {
      showToast('Error al guardar favorito');
    }
  }, [user, showToast]);

  const handleSubmit = useCallback(async () => {
    setShowSuggestions(false);
    setFocused(false);
    await addToSearchHistory(query);
    loadHistory();
    if (query.length >= 2) { setPage(1); doSearch(1, false); }
  }, [query, doSearch]);

  const handleSelectSuggestion = useCallback(async (text: string) => {
    setQuery(text);
    setShowSuggestions(false);
    setFocused(false);
    await addToSearchHistory(text);
    loadHistory();
    if (text.length >= 2) { setPage(1); doSearch(1, false, text); }
  }, [doSearch]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    if (query.length < 2) setShowSuggestions(history.length > 0);
  }, [query, history]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (mounted.current) setShowSuggestions(false);
    }, 200);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.cardBackground }}>
      <SearchBar
        value={query}
        onChangeText={handleChangeText}
        onSubmit={handleSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />

      {showSuggestions && query.length < 2 && (
        <SearchSuggestions
          suggestions={[]}
          history={history}
          onSelectSuggestion={handleSelectSuggestion}
          onClearHistory={() => { clearSearchHistory(); setHistory([]); }}
        />
      )}

      {showSuggestions && suggestions.length > 0 && (
        <SearchSuggestions
          suggestions={suggestions}
          history={[]}
          onSelectSuggestion={handleSelectSuggestion}
          onClearHistory={() => {}}
        />
      )}

      {query.length >= 2 && (
        <>
          <CategoryChips
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
          <StoreChips
            stores={stores}
            selected={selectedStore}
            onSelect={setSelectedStore}
          />
          <View style={styles.headerRow}>
            <Text style={[styles.resultCount, { color: theme.textMuted }]}>
              {loading ? 'Buscando...' : `${total} resultado${total !== 1 ? 's' : ''} para "${query}"`}
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setGridView((v) => !v)}
                style={[styles.gridToggle, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <MaterialIcons name={gridView ? 'view-list' : 'grid-view'} size={16} color={theme.textMuted} />
              </TouchableOpacity>
              <SortPicker value={sort} onChange={setSort} />
            </View>
          </View>
        </>
      )}

      {loading && page === 1 && (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <EmptyState
          icon="search-off"
          title="Sin resultados"
          subtitle="Prueba con otro término o cambia los filtros"
        />
      )}

      {query.length < 2 && !loading && featured.length === 0 && !loadingFeatured && (
        <EmptyState
          icon="search"
          title="Busca productos"
          subtitle="Ingresa al menos 2 caracteres"
        />
      )}

      {query.length < 2 && loadingFeatured && (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      )}

      {query.length < 2 && !loading && featured.length > 0 && !showSuggestions && (
        <>
          <View style={styles.headerRow}>
            <Text style={[styles.resultCount, { color: theme.textMuted }]}>
              Productos destacados
            </Text>
          </View>
        </>
      )}

      <FlatList
        data={query.length >= 2 ? results : featured}
        keyExtractor={(item) => item.id}
        numColumns={gridView ? 2 : undefined}
        key={gridView ? 'grid' : 'list'}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={handlePress}
            compact={gridView}
            onAddToList={setAddToListProduct}
            onAddFavorite={handleAddFavorite}
          />
        )}
        contentContainerStyle={results.length === 0 ? { flex: 1 } : { paddingBottom: 16, paddingHorizontal: gridView ? 10 : 0 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={theme.primary} style={styles.footer} />
          ) : results.length > 0 && results.length < total ? (
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              Desliza para cargar más
            </Text>
          ) : null
        }
      />

      <AddToListModal
        visible={!!addToListProduct}
        onClose={() => setAddToListProduct(null)}
        onSelect={handleAddToList}
        productLabel={addToListProduct?.name ?? ''}
        userId={user?.uid ?? null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { paddingVertical: 16 },
  footer: { paddingVertical: 20 },
  footerText: { textAlign: 'center', paddingVertical: 16, fontSize: 13 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  resultCount: { fontSize: 13, flex: 1 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  gridToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});

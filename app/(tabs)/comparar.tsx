import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  Share, StyleSheet, Image, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { searchProducts, getComparisonData, getSimilarProducts, getProductById } from '@/lib/products';
import { addFavorite, removeFavorite, isFavorite } from '@/lib/favorites';
import { addItemToList } from '@/lib/shoppingList';
import AddToListModal from '@/components/AddToListModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import SearchBar from '@/components/SearchBar';
import PriceCard from '@/components/PriceCard';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import { track } from '@/lib/analytics';
import type { Product, Price } from '@/types/database';
import type { ComparisonResult, UnitPriceInfo } from '@/lib/products';

const GROUP_A_LABELS: Record<string, string> = {
  'Walmart Guatemala': 'Walmart',
  'Paiz': 'Paiz',
  'Maxi Despensa': 'Maxi',
};

export default function CompararScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ productId?: string; productName?: string }>();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [faved, setFaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [showAddToList, setShowAddToList] = useState(false);
  const [addToListProduct, setAddToListProduct] = useState<{ id: string; name: string } | null>(null);
  const lastProductIdRef = useRef<string | null>(null);

  async function loadComparison(product: Product) {
    setLoading(true);
    try {
      const data = await getComparisonData(product.id);
      setComparison(data);
      track('view_product', { productId: product.id, groupA: data.groupA.length, laTorre: !!data.laTorreMatch });
    } catch {
      setComparison({ groupA: [], laTorreMatch: null, laTorreProductName: null, unitPrices: [] });
    } finally {
      setLoading(false);
    }
  }

  async function loadSimilar(product: Product) {
    try {
      const data = await getSimilarProducts(product.id, product.base_product_type, 6);
      setSimilarProducts(data);
    } catch {
      setSimilarProducts([]);
    }
  }

  const checkFav = useCallback(async (productId: string) => {
    if (!user) return;
    try {
      setFaved(await isFavorite(user.uid, productId));
    } catch {}
  }, [user]);

  useEffect(() => {
    if (params.productId && params.productName && params.productId !== lastProductIdRef.current) {
      lastProductIdRef.current = params.productId;
      setLoading(true);
      getProductById(params.productId).then((fullProduct) => {
        if (fullProduct) {
          setSelectedProduct(fullProduct);
          loadComparison(fullProduct);
          loadSimilar(fullProduct);
          checkFav(fullProduct.id);
        } else {
          const fallback = { id: params.productId!, name: params.productName!, category_id: null };
          setSelectedProduct(fallback);
          loadComparison(fallback);
          checkFav(fallback.id);
        }
      }).catch(() => {
        const fallback = { id: params.productId!, name: params.productName!, category_id: null };
        setSelectedProduct(fallback);
        loadComparison(fallback);
        checkFav(fallback.id);
      }).finally(() => setLoading(false));
    }
  }, [params.productId, params.productName, checkFav]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (text.length < 2) setSearchResults([]);
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const data = await searchProducts({ query: searchQuery });
        setSearchResults(data.products);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function toggleFavorite() {
    if (!user || !selectedProduct) return;
    const wasFaved = faved;
    setFaved(!faved);
    try {
      if (wasFaved) {
        await removeFavorite(user.uid, selectedProduct.id);
        track('remove_favorite', { productId: selectedProduct.id });
      } else {
        await addFavorite(user.uid, selectedProduct.id, selectedProduct.name);
        track('add_favorite', { productId: selectedProduct.id });
      }
    } catch {
      setFaved(wasFaved);
      showToast('No se pudo actualizar el favorito.');
    }
  }

  const handleAddToList = useCallback(async (listId: number) => {
    if (!addToListProduct) return;
    try {
      await addItemToList(listId, addToListProduct.id, addToListProduct.name, 1, user?.uid ?? null);
      showToast('Producto agregado a la lista');
    } catch {
      showToast('Error al agregar producto');
    }
    setShowAddToList(false);
    setAddToListProduct(null);
  }, [addToListProduct, showToast, user]);

  const handleOpenAddToList = useCallback((product: { id: string; name: string }) => {
    setAddToListProduct(product);
    setShowAddToList(true);
  }, []);

  const handleToggleFavProduct = useCallback(async (product: { id: string; name: string }) => {
    if (!user) return;
    try {
      const fav = await isFavorite(user.uid, product.id);
      if (fav) {
        await removeFavorite(user.uid, product.id);
        showToast('Eliminado de favoritos');
      } else {
        await addFavorite(user.uid, product.id, product.name);
        showToast('Agregado a favoritos');
      }
    } catch {
      showToast('No se pudo actualizar el favorito');
    }
  }, [user, showToast]);

  const allPrices = comparison
    ? [...comparison.groupA, ...(comparison.laTorreMatch ? [comparison.laTorreMatch] : [])]
    : [];
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices.map(p => p.price)) : 0;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices.map(p => p.price)) : 0;
  const ahorro = maxPrice - minPrice;

  const handleShare = async () => {
    if (!selectedProduct || !comparison) return;
    const lines = allPrices.map(
      (p) => `${GROUP_A_LABELS[p.store_name ?? ''] ?? p.store_name ?? 'Tienda'}: Q ${p.price.toFixed(2)}`
    );
    const unitLines = comparison.unitPrices.map(u => `${u.store}: ${u.raw}`);
    const message = [
      `🛒 ${selectedProduct.name}`,
      ...lines,
      '',
      'Comparación por unidad:',
      ...unitLines,
      '',
      ahorro > 0 ? `Ahorro: Q ${ahorro.toFixed(2)}` : '',
      '\n— AhorraGT',
    ].filter(Boolean).join('\n');
    try {
      await Share.share({ message, title: selectedProduct.name });
      track('share_product', { productId: selectedProduct.id, prices: allPrices.length });
    } catch {}
  };

  const handleSelectProduct = useCallback((product: Product) => {
    lastProductIdRef.current = product.id;
    setSelectedProduct(product);
    setSearchQuery('');
    setSearchResults([]);
    setSimilarProducts([]);
    loadComparison(product);
    loadSimilar(product);
    checkFav(product.id);
    router.setParams({ productId: product.id, productName: product.name });
  }, [router, checkFav]);

  const onRefresh = useCallback(async () => {
    if (!selectedProduct) return;
    setRefreshing(true);
    try {
      const data = await getComparisonData(selectedProduct.id);
      setComparison(data);
    } catch {} finally { setRefreshing(false); }
  }, [selectedProduct]);

  if (!selectedProduct) {
    return (
      <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
        <SearchBar value={searchQuery} onChangeText={handleSearchChange} placeholder="Buscar producto..." />
        {searchResults.length > 0 && (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.searchResult, { backgroundColor: theme.card, borderBottomColor: theme.border }]} onPress={() => handleSelectProduct(item)}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.searchResultImage} resizeMode="cover" />
                ) : (
                  <MaterialIcons name="shopping-bag" size={20} color={theme.textMuted} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.searchResultText, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.searchResultStore, { color: theme.textMuted }]}>
                    {item.store_count && item.store_count > 1 ? `${item.store_count} tiendas` : item.store_name}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
        {searchQuery.length < 2 && (
          <EmptyState icon="compare" title="Selecciona un producto" subtitle="Usa la búsqueda o ve desde Buscar / Favoritos" />
        )}
      </View>
    );
  }

  const hasGroupA = comparison && comparison.groupA.length > 0;
  const hasLaTorre = comparison && comparison.laTorreMatch;
  const lowestGroupA = hasGroupA ? comparison.groupA.reduce((a, b) => a.price < b.price ? a : b) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <View style={[styles.productCard, { backgroundColor: theme.primary }]}>
        {selectedProduct.image_url && (
          <Image source={{ uri: selectedProduct.image_url }} style={styles.headerImage} resizeMode="contain" />
        )}
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: theme.white }]} numberOfLines={2}>{selectedProduct.name}</Text>
            {selectedProduct.net_quantity && selectedProduct.net_unit && (
              <Text style={styles.productMeta}>Presentación: {selectedProduct.net_quantity} {selectedProduct.net_unit}</Text>
            )}
            {selectedProduct.base_product_type && (
              <Text style={styles.productMeta}>Tipo: {selectedProduct.base_product_type}</Text>
            )}
            <Text style={styles.productCount}>
              {allPrices.length} precio{allPrices.length !== 1 ? 's' : ''} · {allPrices.length > 1 ? `${allPrices.length} tiendas` : '1 tienda'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => handleOpenAddToList({ id: selectedProduct.id, name: selectedProduct.name })}>
              <MaterialIcons name="playlist-add" size={26} color={theme.white} />
            </TouchableOpacity>
            {allPrices.length > 0 && (
              <TouchableOpacity onPress={handleShare}>
                <MaterialIcons name="share" size={26} color={theme.white} />
              </TouchableOpacity>
            )}
            {user && (
              <TouchableOpacity onPress={toggleFavorite}>
                <MaterialIcons name={faved ? 'favorite' : 'favorite-border'} size={28} color={theme.accent} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {loading && <ActivityIndicator color={theme.primary} style={styles.loader} />}

      {!loading && allPrices.length === 0 && (
        <EmptyState icon="price-change" title="Sin precios registrados" />
      )}

      {!loading && allPrices.length > 0 && (
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
          {hasGroupA && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Mismo producto</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                Disponible en Walmart, Paiz y Maxi
              </Text>
              {comparison.groupA.map((p) => {
                const isCheapest = lowestGroupA && p.price === lowestGroupA.price && comparison.groupA.length > 1;
                const unitInfo = comparison.unitPrices.find(u => u.productId === p.product_id);
                return (
                  <PriceCard
                    key={p.id}
                    storeName={GROUP_A_LABELS[p.store_name ?? ''] ?? p.store_name ?? 'Tienda'}
                    price={p.price}
                    isLowest={!!isCheapest}
                    unitPrice={unitInfo}
                  />
                );
              })}
            </View>
          )}

          {hasLaTorre && comparison.laTorreMatch && (
            <View style={styles.section}>
              <View style={[styles.laTorreBadge, { backgroundColor: theme.accent }]}>
                <MaterialIcons name="store" size={16} color={theme.white} />
                <Text style={[styles.laTorreBadgeText, { color: theme.white }]}>La Torre</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Similar en La Torre</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                Producto encontrado por similitud
              </Text>
              <View style={[styles.laTorreCard, { backgroundColor: theme.card, borderColor: theme.accent }]}>
                <View style={styles.laTorreHeader}>
                  <Text style={[styles.laTorreName, { color: theme.text }]} numberOfLines={2}>
                    {comparison.laTorreProductName}
                  </Text>
                  {lowestGroupA && (
                    <View style={[
                      styles.priceDiffBadge,
                      { backgroundColor: comparison.laTorreMatch.price < lowestGroupA.price ? theme.success : theme.warning },
                    ]}>
                      <Text style={[styles.priceDiffText, { color: theme.white }]}>
                        {comparison.laTorreMatch.price < lowestGroupA.price ? '↓ Más barato' : '↑ Más caro'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.laTorrePrice, { color: theme.text }]}>
                  Q {comparison.laTorreMatch.price.toFixed(2)}
                </Text>
                {comparison.unitPrices.find(u => u.productId === comparison.laTorreMatch!.product_id) && (
                  <Text style={[styles.unitPriceText, { color: theme.textMuted }]}>
                    {comparison.unitPrices.find(u => u.productId === comparison.laTorreMatch!.product_id)!.raw}
                  </Text>
                )}
                {lowestGroupA && (
                  <Text style={[styles.priceCompare, { color: theme.textMuted }]}>
                    vs Q {lowestGroupA.price.toFixed(2)} en {GROUP_A_LABELS[lowestGroupA.store_name ?? ''] ?? lowestGroupA.store_name}
                    {lowestGroupA.net_quantity ? ` (${lowestGroupA.net_quantity}${lowestGroupA.net_unit})` : ''}
                  </Text>
                )}
                <View style={styles.laTorreActions}>
                  <TouchableOpacity
                    style={[styles.laTorreActionBtn, { backgroundColor: theme.primary + '20' }]}
                    onPress={() => handleOpenAddToList({ id: comparison.laTorreMatch!.product_id, name: comparison.laTorreProductName || 'Producto La Torre' })}
                  >
                    <MaterialIcons name="playlist-add" size={18} color={theme.primary} />
                    <Text style={[styles.laTorreActionText, { color: theme.primary }]}>Agregar a lista</Text>
                  </TouchableOpacity>
                  {user && (
                    <TouchableOpacity
                      style={[styles.laTorreActionBtn, { backgroundColor: theme.accent + '20' }]}
                      onPress={() => handleToggleFavProduct({ id: comparison.laTorreMatch!.product_id, name: comparison.laTorreProductName || 'Producto La Torre' })}
                    >
                      <MaterialIcons name="favorite-border" size={18} color={theme.accent} />
                      <Text style={[styles.laTorreActionText, { color: theme.accent }]}>Favorito</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}

          {!hasLaTorre && !hasGroupA && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Sin comparación disponible</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                No se encontraron precios en otras tiendas
              </Text>
            </View>
          )}

          {comparison && comparison.unitPrices.length > 1 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Comparación por unidad</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                Precio por unidad de medida para comparación justa
              </Text>
              {comparison.unitPrices
                .sort((a, b) => a.value - b.value)
                .map((u, i) => (
                  <View key={u.productId + u.store} style={[styles.unitRow, { backgroundColor: theme.card }]}>
                    <View style={[styles.unitRank, { backgroundColor: i === 0 ? theme.success : theme.textMuted }]}>
                      <Text style={[styles.unitRankText, { color: theme.white }]}>#{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.unitStore, { color: theme.text }]}>{u.store}</Text>
                      <Text style={[styles.unitProductName, { color: theme.textMuted }]} numberOfLines={1}>{u.productName}</Text>
                    </View>
                    <Text style={[styles.unitValue, { color: i === 0 ? theme.success : theme.text }]}>
                      {u.raw}
                    </Text>
                  </View>
                ))}
            </View>
          )}

          {ahorro > 0 && (
            <View style={[styles.summary, { backgroundColor: theme.card }]}>
              <MaterialIcons name="savings" size={20} color={theme.success} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Ahorro potencial</Text>
                <Text style={[styles.summaryValue, { color: theme.success }]}>Q {ahorro.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {similarProducts.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={[styles.similarTitle, { color: theme.text }]}>Productos similares</Text>
              {similarProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onPress={handleSelectProduct}
                  onAddToList={(prod) => handleOpenAddToList({ id: prod.id, name: prod.name })}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <AddToListModal
        visible={showAddToList}
        onClose={() => { setShowAddToList(false); setAddToListProduct(null); }}
        onSelect={handleAddToList}
        productLabel={addToListProduct?.name ?? ''}
        userId={user?.uid ?? null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  productCard: { padding: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  headerImage: { width: '100%', height: 140, borderRadius: 10, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  productHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  productInfo: { flex: 1, flexShrink: 1 },
  productName: { fontSize: 18, fontWeight: 'bold' },
  productMeta: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  productCount: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  loader: { paddingVertical: 24 },
  searchResult: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, gap: 10,
  },
  searchResultImage: { width: 36, height: 36, borderRadius: 6 },
  searchResultText: { fontSize: 15 },
  searchResultStore: { fontSize: 12 },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, marginBottom: 10 },
  laTorreBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  laTorreBadgeText: { fontSize: 12, fontWeight: '600' },
  laTorreCard: {
    padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 4,
  },
  laTorreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  laTorreName: { fontSize: 14, fontWeight: '500', flex: 1 },
  priceDiffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  priceDiffText: { fontSize: 11, fontWeight: '700' },
  laTorrePrice: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  unitPriceText: { fontSize: 13, marginTop: 2 },
  priceCompare: { fontSize: 12, marginTop: 4 },
  laTorreActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  laTorreActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  laTorreActionText: { fontSize: 13, fontWeight: '600' },
  unitRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 8, marginBottom: 6, gap: 10,
  },
  unitRank: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  unitRankText: { fontSize: 12, fontWeight: '700' },
  unitStore: { fontSize: 14, fontWeight: '500' },
  unitProductName: { fontSize: 11, marginTop: 1 },
  unitValue: { fontSize: 13, fontWeight: '600' },
  summary: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, marginHorizontal: 16, marginTop: 8, borderRadius: 10,
  },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  similarSection: { marginTop: 16, paddingHorizontal: 0 },
  similarTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, paddingHorizontal: 16 },
});

import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, Alert, StyleSheet, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { searchProducts } from '@/lib/products';
import {
  getStores, addStore, deleteStore,
  addProduct, deleteProduct,
  getPricesByProduct, addPrice, deletePrice,
  getCategories, addCategory, deleteCategory,
} from '@/lib/admin';
import { BrandColors } from '@/constants/theme';
import type { Store, Price, Category } from '@/types/database';

type TabName = 'precios' | 'productos' | 'tiendas' | 'categorias';

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<TabName>('precios');

  const tabs: { key: TabName; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { key: 'precios', label: 'Precios', icon: 'attach-money' },
    { key: 'productos', label: 'Productos', icon: 'inventory-2' },
    { key: 'tiendas', label: 'Tiendas', icon: 'store' },
    { key: 'categorias', label: 'Categorías', icon: 'category' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialIcons
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? BrandColors.primary : '#999'}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {activeTab === 'precios' && <PreciosTab />}
        {activeTab === 'productos' && <ProductosTab />}
        {activeTab === 'tiendas' && <TiendasTab />}
        {activeTab === 'categorias' && <CategoriasTab />}
      </ScrollView>
    </View>
  );
}

function PreciosTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');

  async function loadStores() {
    try { setStores(await getStores()); } catch {}
  }

  useFocusEffect(useCallback(() => { loadStores(); }, []));

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    try { const r = await searchProducts({ query: q }); setResults(r.products); } catch {}
  };

  const selectProduct = async (product: any) => {
    setSelected(product);
    setResults([]);
    setQuery(product.name);
    setSelectedStore(null);
    setPriceInput('');
    try { setPrices(await getPricesByProduct(product.id)); } catch {}
  };

  const savePrice = async () => {
    if (!selected || !selectedStore || !priceInput) {
      return Alert.alert('Error', 'Selecciona producto, tienda e ingresa precio.');
    }
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) return Alert.alert('Error', 'Precio inválido.');
    try {
      await addPrice(selected.id, selectedStore, price);
      Alert.alert('Listo', 'Precio guardado.');
      setPrices(await getPricesByProduct(selected.id));
      setPriceInput('');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDeletePrice = (id: string) => {
    Alert.alert('Eliminar precio', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deletePrice(id); setPrices(await getPricesByProduct(selected.id)); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  return (
    <View>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar producto..."
        value={query}
        onChangeText={search}
      />
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => selectProduct(item)}>
              <Text>{item.name}</Text>
            </TouchableOpacity>
          )}
          scrollEnabled={false}
        />
      )}
      {selected && (
        <>
          <Text style={styles.sectionTitle}>Tiendas</Text>
          <View style={styles.chipGrid}>
            {stores.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={[styles.chip, selectedStore === store.id && styles.chipActive]}
                onPress={() => setSelectedStore(store.id)}
              >
                <Text style={[styles.chipText, selectedStore === store.id && styles.chipTextActive]}>
                  {store.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.priceInput}
            placeholder="Precio (Q)"
            keyboardType="decimal-pad"
            value={priceInput}
            onChangeText={setPriceInput}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={savePrice}>
            <Text style={styles.saveBtnText}>Guardar precio</Text>
          </TouchableOpacity>
          {prices.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Precios existentes</Text>
              {prices.map((p) => (
                <View key={p.id} style={styles.existingRow}>
                  <Text style={{ flex: 1 }}>{(p as any).stores?.name ?? '—'} — Q {p.price.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => handleDeletePrice(p.id)}>
                    <MaterialIcons name="delete" size={20} color={BrandColors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}

function ProductosTab() {
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []));

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    try { const r = await searchProducts({ query: q }); setResults(r.products); } catch {}
  };

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Ingresa nombre del producto.');
    try {
      await addProduct(name.trim(), selectedCat ?? undefined);
      Alert.alert('Listo', 'Producto creado.');
      setName('');
      setSelectedCat(null);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Eliminar producto', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteProduct(id); const r = await searchProducts({ query }); setResults(r.products); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Nuevo producto</Text>
      <TextInput style={styles.searchInput} placeholder="Nombre" value={name} onChangeText={setName} />
      {categories.length > 0 && (
        <>
          <Text style={styles.label}>Categoría (opcional)</Text>
          <View style={styles.chipGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, selectedCat === cat.id && styles.chipActive]}
                onPress={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
              >
                <Text style={[styles.chipText, selectedCat === cat.id && styles.chipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
        <Text style={styles.saveBtnText}>Crear producto</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Buscar y eliminar</Text>
      <TextInput style={styles.searchInput} placeholder="Buscar producto..." value={query} onChangeText={search} />
      {results.map((p) => (
        <View key={p.id} style={styles.existingRow}>
          <Text style={{ flex: 1 }}>{p.name}</Text>
          <TouchableOpacity onPress={() => handleDelete(p.id)}>
            <MaterialIcons name="delete" size={20} color={BrandColors.error} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

function TiendasTab() {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [stores, setStores] = useState<Store[]>([]);

  useFocusEffect(useCallback(() => { loadStores(); }, []));

  async function loadStores() {
    try { setStores(await getStores()); } catch {}
  }

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Ingresa nombre de la tienda.');
    try {
      await addStore(name.trim(), url.trim() || undefined);
      Alert.alert('Listo', 'Tienda creada.');
      setName('');
      setUrl('');
      await loadStores();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Eliminar tienda', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteStore(id); await loadStores(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Nueva tienda</Text>
      <TextInput style={styles.searchInput} placeholder="Nombre" value={name} onChangeText={setName} />
      <TextInput style={styles.searchInput} placeholder="URL (opcional)" value={url} onChangeText={setUrl} autoCapitalize="none" />
      <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
        <Text style={styles.saveBtnText}>Crear tienda</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Tiendas existentes</Text>
      {stores.map((s) => (
        <View key={s.id} style={styles.existingRow}>
          <Text style={{ flex: 1 }}>{s.name}</Text>
          <TouchableOpacity onPress={() => handleDelete(s.id)}>
            <MaterialIcons name="delete" size={20} color={BrandColors.error} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

function CategoriasTab() {
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  useFocusEffect(useCallback(() => { loadCategories(); }, []));

  async function loadCategories() {
    try { setCategories(await getCategories()); } catch {}
  }

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Ingresa nombre de la categoría.');
    try {
      await addCategory(name.trim());
      Alert.alert('Listo', 'Categoría creada.');
      setName('');
      await loadCategories();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Eliminar categoría', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteCategory(id); await loadCategories(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Nueva categoría</Text>
      <TextInput style={styles.searchInput} placeholder="Nombre" value={name} onChangeText={setName} />
      <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
        <Text style={styles.saveBtnText}>Crear categoría</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Categorías existentes</Text>
      {categories.map((c) => (
        <View key={c.id} style={styles.existingRow}>
          <Text style={{ flex: 1 }}>{c.name}</Text>
          <TouchableOpacity onPress={() => handleDelete(c.id)}>
            <MaterialIcons name="delete" size={20} color={BrandColors.error} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.cardBackground },
  tabBar: {
    flexDirection: 'row', backgroundColor: BrandColors.white,
    borderBottomWidth: 1, borderBottomColor: BrandColors.border,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2,
  },
  activeTab: { borderBottomWidth: 2, borderBottomColor: BrandColors.primary },
  tabLabel: { fontSize: 11, color: '#999' },
  activeTabLabel: { color: BrandColors.primary, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  searchInput: {
    backgroundColor: BrandColors.white, borderWidth: 1, borderColor: BrandColors.border,
    borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 8,
  },
  resultItem: { padding: 12, backgroundColor: BrandColors.white, borderBottomWidth: 1, borderBottomColor: BrandColors.border },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#555', marginTop: 16, marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: BrandColors.border, backgroundColor: BrandColors.white,
  },
  chipActive: { borderColor: BrandColors.primary, backgroundColor: BrandColors.primary },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: BrandColors.white, fontWeight: '600' },
  priceInput: {
    backgroundColor: BrandColors.white, borderWidth: 1, borderColor: BrandColors.border,
    borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8,
  },
  saveBtn: {
    backgroundColor: BrandColors.primary, borderRadius: 8,
    paddingVertical: 12, alignItems: 'center', marginBottom: 8,
  },
  saveBtnText: { color: BrandColors.white, fontSize: 15, fontWeight: '600' },
  existingRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BrandColors.white, padding: 12, borderRadius: 8, marginBottom: 4,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
});

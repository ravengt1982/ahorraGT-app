import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  FlatList, TextInput, Alert, StyleSheet,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getShoppingLists, createShoppingList, deleteShoppingList,
  getShoppingListItems, addItemToList, removeItemFromList, toggleItemCheck,
  ensureDefaultList,
} from '@/lib/shoppingList';
import { suggestProducts } from '@/lib/products';
import type { ShoppingList, ShoppingListItem } from '@/lib/shoppingList';
import type { Product } from '@/types/database';
import EmptyState from '@/components/EmptyState';

export default function ListaScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const activeListRef = useRef<ShoppingList | null>(null);
  const userId = user?.uid ?? null;

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<Pick<Product, 'id' | 'name'>[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadItems(listId: number) {
    try {
      const data = await getShoppingListItems(listId, userId);
      setItems(data);
    } catch { setItems([]); }
  }

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getShoppingLists(userId);
        setLists(data);
        activeListRef.current = null;
        if (data.length > 0) {
          setActiveList(data[0]);
          activeListRef.current = data[0];
          await loadItems(data[0].id);
        } else {
          const defaultList = await ensureDefaultList(userId);
          setLists([defaultList]);
          setActiveList(defaultList);
          activeListRef.current = defaultList;
        }
      } catch { setLists([]); } finally { setLoading(false); }
    })();
  }, [userId]));

  async function handleCreateList() {
    try {
      const list = await createShoppingList(userId, newListName.trim() || undefined);
      setNewListName('');
      setShowNewList(false);
      setLists((prev) => [list, ...prev]);
      activeListRef.current = list;
      setActiveList(list);
      setItems([]);
    } catch (e: any) { Alert.alert('Error', e.message); }
  }

  async function handleDeleteList() {
    if (!activeList) return;
    Alert.alert('Eliminar lista', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await deleteShoppingList(activeList.id, userId);
          const remaining = lists.filter((l) => l.id !== activeList.id);
          setLists(remaining);
          if (remaining.length > 0) {
            activeListRef.current = remaining[0];
            setActiveList(remaining[0]);
            await loadItems(remaining[0].id);
          } else {
            const defaultList = await ensureDefaultList(userId);
            setLists([defaultList]);
            setActiveList(defaultList);
            activeListRef.current = defaultList;
            setItems([]);
          }
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  async function handleAddItem(product: Pick<Product, 'id' | 'name'>) {
    if (!activeList) return;
    setAddingItem(true);
    try {
      await addItemToList(activeList.id, product.id, product.name, 1, userId);
      setSearchText('');
      setSuggestions([]);
      setShowSuggestions(false);
      loadItems(activeList.id);
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setAddingItem(false); }
  }

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      try {
        const s = await suggestProducts(text);
        setSuggestions(s);
        setShowSuggestions(s.length > 0);
      } catch { setSuggestions([]); }
    }, 200);
  }, []);

  async function handleToggle(item: ShoppingListItem) {
    try {
      await toggleItemCheck(item.id, !item.checked, userId);
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i));
    } catch {}
  }

  async function handleRemove(itemId: number) {
    try {
      await removeItemFromList(itemId, userId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch {}
  }

  function switchList(list: ShoppingList) {
    activeListRef.current = list;
    setActiveList(list);
    loadItems(list.id);
    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.cardBackground, justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.listBar}>
        <FlatList
          horizontal
          data={lists}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
          ListHeaderComponent={
            <TouchableOpacity
              style={[styles.listTab, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setShowNewList(true)}
            >
              <MaterialIcons name="add" size={18} color={theme.primary} />
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.listTab,
                { backgroundColor: activeList?.id === item.id ? theme.primary : theme.card, borderColor: theme.border },
              ]}
              onPress={() => switchList(item)}
            >
              <Text style={[
                styles.listTabText,
                { color: activeList?.id === item.id ? '#fff' : theme.text },
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {showNewList && (
        <View style={[styles.newListBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="Nombre de la lista"
            placeholderTextColor={theme.textMuted}
            value={newListName}
            onChangeText={setNewListName}
            autoFocus
          />
          <TouchableOpacity onPress={handleCreateList} style={[styles.smallBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.smallBtnText}>Crear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowNewList(false)} style={[styles.smallBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[styles.smallBtnText, { color: theme.text }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeList && (
        <View style={styles.listInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={handleDeleteList}>
              <MaterialIcons name="delete-outline" size={20} color={theme.error} />
            </TouchableOpacity>
            {items.length > 0 && (
              <Text style={[styles.itemCount, { color: theme.textMuted }]}>
                {checkedCount}/{items.length} comprado{checkedCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>
      )}

      {activeList && (
        <View style={{ marginHorizontal: 16, marginBottom: 8, zIndex: 10 }}>
          <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <MaterialIcons name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Buscar producto por nombre…"
              placeholderTextColor={theme.textMuted}
              value={searchText}
              onChangeText={handleSearchChange}
            />
            {addingItem && <ActivityIndicator size="small" color={theme.primary} />}
          </View>

          {showSuggestions && suggestions.length > 0 && (
            <View style={[styles.suggestionsBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.suggestionRow, { borderBottomColor: theme.border }]}
                    onPress={() => handleAddItem(item)}
                  >
                    <MaterialIcons name="add-circle-outline" size={18} color={theme.primary} />
                    <Text style={[styles.suggestionName, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      )}

      {activeList && items.length === 0 && (
        <EmptyState icon="shopping-cart" title="Lista vacía" subtitle="Busca un producto para agregarlo" />
      )}

      {activeList && items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={[styles.itemRow, { backgroundColor: theme.card }]}>
              <TouchableOpacity onPress={() => handleToggle(item)} style={styles.checkbox}>
                <MaterialIcons
                  name={item.checked ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={item.checked ? theme.success : theme.textMuted}
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.itemName,
                  { color: theme.text },
                  item.checked && { textDecorationLine: 'line-through', color: theme.textMuted },
                ]}>
                  {item.product_name || `Producto #${item.product_id}`}
                </Text>
                <Text style={[styles.itemQty, { color: theme.textMuted }]}>
                  Cantidad: {item.quantity}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemove(item.id)}>
                <MaterialIcons name="close" size={18} color={theme.error} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {!activeList && !loading && (
        <EmptyState icon="list" title="Sin listas" subtitle="Crea una lista de compras para empezar" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listBar: { paddingVertical: 8 },
  listTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  listTabText: { fontSize: 13, fontWeight: '500' },
  newListBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, borderWidth: 1,
  },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 14 },
  smallBtn: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  smallBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  listInfo: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 16, marginBottom: 4 },
  itemCount: { fontSize: 13 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, borderRadius: 10, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  suggestionsBox: {
    borderRadius: 10, borderWidth: 1, marginTop: 4,
    maxHeight: 200,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1,
  },
  suggestionName: { fontSize: 14, flex: 1 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginVertical: 3, padding: 12, borderRadius: 10,
  },
  checkbox: { padding: 2 },
  itemName: { fontSize: 14, fontWeight: '500' },
  itemQty: { fontSize: 12, marginTop: 2 },
});

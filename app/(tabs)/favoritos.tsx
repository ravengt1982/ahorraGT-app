import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert, StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getFavorites, removeFavorite } from '@/lib/favorites';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import EmptyState from '@/components/EmptyState';
import type { Favorite } from '@/types/database';

export default function FavoritosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const { showToast } = useToast();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getFavorites(user.uid);
      setFavorites(data);
    } catch {} finally {}
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setLoading(true);
      loadFavorites().finally(() => setLoading(false));
    }, [user, loadFavorites])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, [loadFavorites]);

  const handleRemove = (fav: Favorite) => {
    if (!user) return;
    Alert.alert('Eliminar', `¿Quitar "${fav.product_name}" de favoritos?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFavorite(user.uid, fav.product_id);
            setFavorites((prev) => prev.filter((f) => f.product_id !== fav.product_id));
            } catch { showToast('No se pudo eliminar.'); }
        },
      },
    ]);
  };

  const handleCompare = (fav: Favorite) => {
    router.push({
      pathname: '/(tabs)/comparar',
      params: { productId: fav.product_id, productName: fav.product_name },
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-GT', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return dateStr; }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      {favorites.length > 0 && (
        <Text style={[styles.count, { color: theme.textSecondary }]}>{favorites.length} producto{favorites.length !== 1 ? 's' : ''}</Text>
      )}
      {!loading && favorites.length === 0 && (
        <EmptyState icon="favorite-border" title="Sin favoritos" subtitle="Guarda productos para compararlos después" />
      )}
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={[styles.accent, { backgroundColor: theme.accent }]} />
            <View style={styles.content}>
              <Text style={[styles.name, { color: theme.text }]}>{item.product_name}</Text>
              <Text style={styles.date}>Guardado: {formatDate(item.saved_at)}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.compareBtn, { backgroundColor: theme.primary }]} onPress={() => handleCompare(item)}>
                  <MaterialIcons name="compare" size={18} color={theme.white} />
                  <Text style={[styles.compareText, { color: theme.white }]}>Comparar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemove(item)}>
                  <MaterialIcons name="delete-outline" size={24} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={favorites.length === 0 ? { flex: 1 } : { paddingBottom: 16, paddingTop: 8 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  count: { fontSize: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  card: {
    flexDirection: 'row', marginHorizontal: 16, marginVertical: 4,
    borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    elevation: 3, overflow: 'hidden',
  },
  accent: { width: 4 },
  content: { flex: 1, padding: 14 },
  name: { fontSize: 15, fontWeight: '600' },
  date: { fontSize: 12, color: '#999', marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  compareBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6,
  },
  compareText: { fontSize: 14, fontWeight: '600' },
});

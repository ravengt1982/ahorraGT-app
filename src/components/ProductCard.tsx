import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { Product } from '@/types/database';

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
  onAddToList?: (product: Product) => void;
  onAddFavorite?: (product: Product) => void;
  compact?: boolean;
}

export default function ProductCard({ product, onPress, onAddToList, onAddFavorite, compact }: ProductCardProps) {
  const theme = useTheme();
  const price = product.min_price ?? product.price;
  const hasPrices = price != null && price > 0;

  if (compact) {
    return (
      <TouchableOpacity
        onPress={() => onPress(product)}
        style={[styles.compactCard, { backgroundColor: theme.card }]}
      >
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.compactImage} resizeMode="cover" />
        ) : (
          <View style={[styles.compactImagePlaceholder, { backgroundColor: theme.cardBackground }]}>
            <MaterialIcons name="image" size={24} color={theme.textMuted} />
          </View>
        )}
        <View style={styles.compactContent}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.compactName, { color: theme.text }]} numberOfLines={2}>
              {product.name}
            </Text>
            {hasPrices ? (
              <>
                <Text style={[styles.compactPrice, { color: theme.success }]}>
                  Q {price!.toFixed(2)}
                </Text>
              </>
            ) : (
              <Text style={[styles.compactNoPrice, { color: theme.textMuted }]}>Sin precio</Text>
            )}
          </View>
          <View style={{ gap: 4 }}>
            {onAddFavorite && (
              <TouchableOpacity onPress={() => onAddFavorite(product)} style={styles.compactIconBtn}>
                <MaterialIcons name="favorite-border" size={16} color="#e74c3c" />
              </TouchableOpacity>
            )}
            {onAddToList && (
              <TouchableOpacity onPress={() => onAddToList(product)} style={styles.compactIconBtn}>
                <MaterialIcons name="playlist-add" size={16} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={() => onPress(product)} style={[styles.card, { backgroundColor: theme.card }]}>
      {product.image_url ? (
        <Image source={{ uri: product.image_url }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: theme.cardBackground }]}>
          <MaterialIcons name="image" size={28} color={theme.textMuted} />
        </View>
      )}
      <View style={styles.content}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{product.name}</Text>
          {hasPrices ? (
            <View style={styles.priceRow}>
              <Text style={[styles.minPrice, { color: theme.success }]}>
                Q {price!.toFixed(2)}
              </Text>
              {product.store_name && (
                <Text style={[styles.storeName, { color: theme.textMuted }]}>
                  en {product.store_name}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.noPrice, { color: theme.textMuted }]}>Sin precios</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {onAddFavorite && (
            <TouchableOpacity onPress={() => onAddFavorite(product)} style={styles.iconBtn}>
              <MaterialIcons name="favorite-border" size={20} color="#e74c3c" />
            </TouchableOpacity>
          )}
          {onAddToList && (
            <TouchableOpacity onPress={() => onAddToList(product)} style={styles.iconBtn}>
              <MaterialIcons name="playlist-add" size={20} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    elevation: 3,
    overflow: 'hidden',
  },
  cardImage: { width: 80, height: 80 },
  cardImagePlaceholder: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  name: { fontSize: 15, fontWeight: '500' },
  priceRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
  minPrice: { fontSize: 13, fontWeight: '600' },
  storeName: { fontSize: 12 },
  noPrice: { fontSize: 12, marginTop: 4 },
  compactCard: {
    flex: 1,
    marginHorizontal: 6,
    marginVertical: 4,
    borderRadius: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    elevation: 3,
    overflow: 'hidden',
    maxWidth: '48%',
  },
  compactImage: { width: '100%', aspectRatio: 1, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  compactImagePlaceholder: { width: '100%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)' },
  compactContent: { flexDirection: 'row', padding: 10 },
  iconBtn: { padding: 4 },
  compactIconBtn: { padding: 2 },
  compactName: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  compactPrice: { fontSize: 13, fontWeight: '700' },
  compactStoreCount: { fontSize: 11, marginTop: 2 },
  compactNoPrice: { fontSize: 11, marginTop: 2 },
});

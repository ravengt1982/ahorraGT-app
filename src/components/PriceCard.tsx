import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface PriceCardProps {
  storeName: string;
  price: number;
  isLowest: boolean;
  currency?: string;
  unitPrice?: { store: string; value: number; unit: string; raw: string };
}

export default function PriceCard({ storeName, price, isLowest, currency, unitPrice }: PriceCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card }, isLowest && { borderColor: theme.success, borderWidth: 1 }]}>
      {isLowest && (
        <View style={[styles.badge, { backgroundColor: theme.success }]}>
          <Text style={[styles.badgeText, { color: theme.white }]}>Más barato</Text>
        </View>
      )}
      <View style={[styles.accent, { backgroundColor: isLowest ? theme.success : theme.primary }]} />
      <View style={styles.content}>
        <View style={styles.left}>
          <Text style={[styles.storeName, { color: theme.text }]} numberOfLines={1}>{storeName}</Text>
          {unitPrice && unitPrice.raw !== 'Sin datos' && (
            <Text style={[styles.unitPrice, { color: theme.textMuted }]}>{unitPrice.raw}</Text>
          )}
        </View>
        <Text style={[styles.price, { color: isLowest ? theme.success : theme.text }]}>
          {currency ?? 'Q'} {price.toFixed(2)}
        </Text>
      </View>
    </View>
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
  accent: { width: 4 },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  left: { flex: 1, flexShrink: 1 },
  storeName: { fontSize: 15, fontWeight: '500' },
  unitPrice: { fontSize: 12, marginTop: 2 },
  price: { fontSize: 16, fontWeight: 'bold' },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
});

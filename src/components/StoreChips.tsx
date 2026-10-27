import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { Store } from '@/types/database';

interface StoreChipsProps {
  stores: Store[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

export default function StoreChips({ stores, selected, onSelect }: StoreChipsProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          onPress={() => onSelect(null)}
          style={[
            styles.chip,
            { backgroundColor: selected === null ? theme.primary : theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[
            styles.chipText,
            { color: selected === null ? '#fff' : theme.textMuted },
          ]}>
            Todas
          </Text>
        </TouchableOpacity>
        {stores.map((store) => {
          const id = Number(store.id);
          return (
            <TouchableOpacity
              key={store.id}
              onPress={() => onSelect(id)}
              style={[
                styles.chip,
                { backgroundColor: selected === id ? theme.primary : theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[
                styles.chipText,
                { color: selected === id ? '#fff' : theme.text },
              ]}>
                {store.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingVertical: 8 },
  scroll: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
});

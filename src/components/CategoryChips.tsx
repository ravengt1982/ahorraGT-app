import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { Category } from '@/types/database';

interface CategoryChipsProps {
  categories: Category[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

export default function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
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
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            style={[
              styles.chip,
              { backgroundColor: selected === cat.id ? theme.primary : theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[
              styles.chipText,
              { color: selected === cat.id ? '#fff' : theme.text },
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
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

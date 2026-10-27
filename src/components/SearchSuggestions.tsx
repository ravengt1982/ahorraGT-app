import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface Suggestion {
  id: number | string;
  name: string;
}

interface SearchSuggestionsProps {
  suggestions: Suggestion[];
  history: string[];
  onSelectSuggestion: (text: string) => void;
  onClearHistory: () => void;
}

export default function SearchSuggestions({
  suggestions, history, onSelectSuggestion, onClearHistory,
}: SearchSuggestionsProps) {
  const theme = useTheme();

  if (suggestions.length === 0 && history.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {suggestions.length > 0 ? (
        <>
          <Text style={[styles.label, { color: theme.textMuted }]}>Sugerencias</Text>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.row, { borderBottomColor: theme.border }]}
              onPress={() => onSelectSuggestion(s.name)}
            >
              <MaterialIcons name="search" size={18} color={theme.textMuted} />
              <Text style={[styles.text, { color: theme.text }]} numberOfLines={1}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <View style={styles.headerRow}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Recientes</Text>
            <TouchableOpacity onPress={onClearHistory}>
              <Text style={[styles.clear, { color: theme.primary }]}>Limpiar</Text>
            </TouchableOpacity>
          </View>
          {history.map((h, i) => (
            <TouchableOpacity
              key={`${h}-${i}`}
              style={[styles.row, { borderBottomColor: theme.border }]}
              onPress={() => onSelectSuggestion(h)}
            >
              <MaterialIcons name="history" size={18} color={theme.textMuted} />
              <Text style={[styles.text, { color: theme.text }]} numberOfLines={1}>{h}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    marginTop: -4,
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    elevation: 5,
  },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 4, paddingHorizontal: 8, textTransform: 'uppercase' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 },
  clear: { fontSize: 12, fontWeight: '500' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 14, flex: 1 },
});

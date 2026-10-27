import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface SortOption {
  label: string;
  column: string;
  direction: 'asc' | 'desc';
}

const SORT_OPTIONS: SortOption[] = [
  { label: 'Relevancia', column: 'relevance', direction: 'desc' },
  { label: 'Precio: menor a mayor', column: 'price', direction: 'asc' },
  { label: 'Precio: mayor a menor', column: 'price', direction: 'desc' },
  { label: 'Nombre A-Z', column: 'name', direction: 'asc' },
  { label: 'Más tiendas', column: 'stores', direction: 'desc' },
];

interface SortPickerProps {
  value: { column: string; direction: 'asc' | 'desc' };
  onChange: (sort: { column: string; direction: 'asc' | 'desc' }) => void;
}

export default function SortPicker({ value, onChange }: SortPickerProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  const currentLabel = SORT_OPTIONS.find(
    (o) => o.column === value.column && o.direction === value.direction,
  )?.label ?? SORT_OPTIONS[0].label;

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={[styles.trigger, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <MaterialIcons name="sort" size={16} color={theme.textMuted} />
        <Text style={[styles.triggerText, { color: theme.text }]}>{currentLabel}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.title, { color: theme.text }]}>Ordenar por</Text>
            {SORT_OPTIONS.map((opt) => {
              const active = opt.column === value.column && opt.direction === value.direction;
              return (
                <TouchableOpacity
                  key={`${opt.column}-${opt.direction}`}
                  style={[styles.option, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    onChange({ column: opt.column, direction: opt.direction });
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, { color: active ? theme.primary : theme.text }]}>
                    {opt.label}
                  </Text>
                  {active && <MaterialIcons name="check" size={18} color={theme.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  triggerText: { fontSize: 12, fontWeight: '500' },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: { fontSize: 15 },
});

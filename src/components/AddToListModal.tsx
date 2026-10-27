import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  TextInput, StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { getShoppingLists, createShoppingList } from '@/lib/shoppingList';
import type { ShoppingList } from '@/lib/shoppingList';

interface AddToListModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (listId: number) => void;
  productLabel: string;
  userId?: string | null;
}

export default function AddToListModal({ visible, onClose, onSelect, productLabel, userId }: AddToListModalProps) {
  const theme = useTheme();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (visible) {
      getShoppingLists(userId ?? null).then(setLists).catch(() => {});
    }
  }, [visible, userId]);

  async function handleCreateAndAdd() {
    setCreating(true);
    try {
      const list = await createShoppingList(userId ?? null, newName.trim() || undefined);
      onSelect(list.id);
      setNewName('');
      onClose();
    } catch {} finally { setCreating(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.title, { color: theme.text }]}>Agregar a lista</Text>
          <Text style={[styles.productLabel, { color: theme.textMuted }]} numberOfLines={1}>{productLabel}</Text>

          <FlatList
            data={lists}
            keyExtractor={(item) => String(item.id)}
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.listRow, { borderBottomColor: theme.border }]}
                onPress={() => { onSelect(item.id); onClose(); }}
              >
                <MaterialIcons name="list" size={20} color={theme.primary} />
                <Text style={[styles.listName, { color: theme.text }]}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />

          <View style={[styles.createRow, { borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.createInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Nueva lista"
              placeholderTextColor={theme.textMuted}
              value={newName}
              onChangeText={setNewName}
            />
            <TouchableOpacity
              onPress={handleCreateAndAdd}
              disabled={creating}
              style={[styles.createBtn, { backgroundColor: theme.primary }]}
            >
              <MaterialIcons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 32,
  },
  sheet: {
    borderRadius: 16,
    padding: 20, maxHeight: '60%',
  },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  productLabel: { fontSize: 13, marginBottom: 12 },
  list: { maxHeight: 200 },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  listName: { fontSize: 15 },
  createRow: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    paddingTop: 12, marginTop: 4, borderTopWidth: 1,
  },
  createInput: {
    flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14,
  },
  createBtn: { borderRadius: 8, padding: 10 },
});

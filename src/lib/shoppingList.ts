import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_ID = 'guest';

export interface ShoppingList {
  id: number;
  name: string;
}

export interface ShoppingListItem {
  id: number;
  list_id: number;
  product_id: string;
  product_name?: string;
  quantity: number;
  checked: boolean;
}

interface StoredList {
  id: number;
  name: string;
  items: StoredItem[];
}

interface StoredItem {
  id: number;
  product_id: string;
  product_name?: string;
  quantity: number;
  checked: boolean;
}

function listsKey(userId: string | null): string {
  return `shopping:lists:${userId || GUEST_ID}`;
}

function counterKey(userId: string | null): string {
  return `shopping:counter:${userId || GUEST_ID}`;
}

async function getCounter(userId: string | null): Promise<number> {
  const raw = await AsyncStorage.getItem(counterKey(userId));
  return raw ? parseInt(raw, 10) : Date.now();
}

async function nextId(userId: string | null): Promise<number> {
  const val = await getCounter(userId);
  await AsyncStorage.setItem(counterKey(userId), String(val + 1));
  return val;
}

async function readLists(userId: string | null): Promise<StoredList[]> {
  const raw = await AsyncStorage.getItem(listsKey(userId));
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function writeLists(userId: string | null, lists: StoredList[]) {
  await AsyncStorage.setItem(listsKey(userId), JSON.stringify(lists));
}

function toShoppingList(s: StoredList): ShoppingList {
  return { id: s.id, name: s.name };
}

function toShoppingItem(s: StoredItem, listId: number): ShoppingListItem {
  return { ...s, list_id: listId };
}

export async function getShoppingLists(userId: string | null = null): Promise<ShoppingList[]> {
  const lists = await readLists(userId);
  return lists.map(toShoppingList);
}

export async function createShoppingList(userId: string | null = null, name = 'Mi lista'): Promise<ShoppingList> {
  const lists = await readLists(userId);
  const id = await nextId(userId);
  const list: StoredList = { id, name, items: [] };
  lists.push(list);
  await writeLists(userId, lists);
  return { id, name };
}

export async function updateShoppingListName(listId: number, name: string, userId: string | null = null) {
  const lists = await readLists(userId);
  const list = lists.find((l) => l.id === listId);
  if (!list) return;
  list.name = name;
  await writeLists(userId, lists);
}

export async function deleteShoppingList(listId: number, userId: string | null = null) {
  const lists = await readLists(userId);
  await writeLists(userId, lists.filter((l) => l.id !== listId));
}

export async function getShoppingListItems(listId: number, userId: string | null = null): Promise<ShoppingListItem[]> {
  const lists = await readLists(userId);
  const list = lists.find((l) => l.id === listId);
  if (!list) return [];
  return list.items.map((item) => toShoppingItem(item, listId));
}

export async function addItemToList(
  listId: number, productId: string,
  productName?: string, quantity = 1,
  userId: string | null = null,
): Promise<ShoppingListItem> {
  const lists = await readLists(userId);
  const list = lists.find((l) => l.id === listId);
  if (!list) throw new Error('Lista no encontrada');

  const existing = list.items.find((i) => i.product_id === productId);
  if (existing) {
    existing.quantity += quantity;
    await writeLists(userId, lists);
    return toShoppingItem(existing, listId);
  }

  const id = await nextId(userId);
  const item: StoredItem = { id, product_id: productId, product_name: productName, quantity, checked: false };
  list.items.push(item);
  await writeLists(userId, lists);
  return toShoppingItem(item, listId);
}

export async function removeItemFromList(itemId: number, userId: string | null = null) {
  const lists = await readLists(userId);
  for (const list of lists) {
    const idx = list.items.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      list.items.splice(idx, 1);
      break;
    }
  }
  await writeLists(userId, lists);
}

export async function toggleItemCheck(itemId: number, checked: boolean, userId: string | null = null) {
  const lists = await readLists(userId);
  for (const list of lists) {
    const item = list.items.find((i) => i.id === itemId);
    if (item) {
      item.checked = checked;
      break;
    }
  }
  await writeLists(userId, lists);
}

export async function ensureDefaultList(userId: string | null = null): Promise<ShoppingList> {
  const lists = await readLists(userId);
  if (lists.length > 0) return toShoppingList(lists[0]);
  return createShoppingList(userId);
}

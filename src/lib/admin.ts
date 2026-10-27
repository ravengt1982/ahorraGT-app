import {
  collection, query, orderBy, getDocs, addDoc, deleteDoc, doc,
  where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Store, Price, Category } from '@/types/database';

export async function getStores(): Promise<Store[]> {
  const q = query(collection(db, 'stores'), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Store[];
}

export async function addStore(name: string, url?: string) {
  await addDoc(collection(db, 'stores'), {
    name,
    url: url ?? null,
  });
}

export async function deleteStore(id: string) {
  await deleteDoc(doc(db, 'stores', id));
}

export async function addProduct(name: string, categoryId?: number) {
  await addDoc(collection(db, 'products'), {
    name,
    category_id: categoryId ?? null,
  });
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, 'products', id));
}

export async function getPricesByProduct(productId: string): Promise<Price[]> {
  const q = query(
    collection(db, 'prices'),
    where('product_id', '==', productId),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Price[];
}

export async function addPrice(productId: string, storeId: string, price: number) {
  const q = query(
    collection(db, 'prices'),
    where('product_id', '==', productId),
    where('store_id', '==', storeId),
  );

  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docRef = doc(db, 'prices', snapshot.docs[0].id);
    await writeBatch(db).update(docRef, { price }).commit();
  } else {
    await addDoc(collection(db, 'prices'), {
      product_id: productId,
      store_id: storeId,
      price,
    });
  }
}

export async function deletePrice(id: string) {
  await deleteDoc(doc(db, 'prices', id));
}

export async function getCategories(): Promise<Category[]> {
  const q = query(collection(db, 'categories'), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: parseInt(doc.id),
    ...doc.data(),
  })) as Category[];
}

export async function addCategory(name: string) {
  await addDoc(collection(db, 'categories'), { name });
}

export async function deleteCategory(id: number) {
  await deleteDoc(doc(db, 'categories', String(id)));
}

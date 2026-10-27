import {
  collection, query, where, orderBy,
  getDocs, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Favorite } from '@/types/database';

export async function getFavorites(userId: string): Promise<Favorite[]> {
  const q = query(
    collection(db, 'favorites'),
    where('user_id', '==', userId),
    orderBy('saved_at', 'desc'),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Favorite[];
}

export async function addFavorite(userId: string, productId: string, productName: string) {
  const q = query(
    collection(db, 'favorites'),
    where('user_id', '==', userId),
    where('product_id', '==', productId),
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    await addDoc(collection(db, 'favorites'), {
      user_id: userId,
      product_id: productId,
      product_name: productName,
      saved_at: serverTimestamp(),
    });
  }
}

export async function removeFavorite(userId: string, productId: string) {
  const q = query(
    collection(db, 'favorites'),
    where('user_id', '==', userId),
    where('product_id', '==', productId),
  );

  const snapshot = await getDocs(q);
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, 'favorites', docSnap.id));
  }
}

export async function isFavorite(userId: string, productId: string): Promise<boolean> {
  const q = query(
    collection(db, 'favorites'),
    where('user_id', '==', userId),
    where('product_id', '==', productId),
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

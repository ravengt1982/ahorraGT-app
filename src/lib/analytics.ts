import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

type EventName =
  | 'search'
  | 'view_product'
  | 'share_product'
  | 'toggle_favorite'
  | 'add_favorite'
  | 'remove_favorite'
  | 'login'
  | 'register'
  | 'logout';

export async function track(event: EventName, data?: Record<string, unknown>) {
  if (__DEV__) console.log('[Analytics]', event, data ?? '');
  try {
    await addDoc(collection(db, 'analytics_events'), {
      event,
      payload: data ?? {},
      created_at: serverTimestamp(),
    });
  } catch {
    // silently fail — analytics should never break the app
  }
}

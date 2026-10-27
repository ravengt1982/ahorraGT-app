import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const webStorage: Record<string, string> = {};

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return webStorage[key] ?? null; }
  }
  try { return await AsyncStorage.getItem(key); } catch { return null; }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch { webStorage[key] = value; }
    return;
  }
  try { await AsyncStorage.setItem(key, value); } catch {}
}

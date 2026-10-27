import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  type User,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import { auth } from './firebase';

WebBrowser.maybeCompleteAuthSession();

const AUTH_FUNCTION_URL = 'https://us-central1-ahorragt-a4c23.cloudfunctions.net/authGoogle';

export async function signUp(email: string, password: string, fullName: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName: fullName });
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function signInWithGoogleWeb(): Promise<string | null> {
  const url = `${AUTH_FUNCTION_URL}?redirect_to=ahorragtapp://auth`;
  const result = await WebBrowser.openAuthSessionAsync(url, 'ahorragtapp://auth');

  if (result.type === 'success' && result.url) {
    const urlObj = new URL(result.url);
    const idToken = urlObj.searchParams.get('id_token');
    if (idToken) return idToken;
  }
  return null;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

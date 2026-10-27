import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { signIn, signInWithGoogleWeb } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { BrandColors } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/(tabs)/buscar');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async () => {
    if (!email.trim()) return Alert.alert('Error', 'Ingresa tu correo.');
    if (!password) return Alert.alert('Error', 'Ingresa tu contraseña.');

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)/buscar');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogleWeb();
      if (idToken) {
        const { signInWithGoogle } = await import('@/lib/auth');
        await signInWithGoogle(idToken);
        router.replace('/(tabs)/buscar');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo iniciar sesión con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="savings" size={40} color={BrandColors.white} />
          </View>
          <Text style={styles.appName}>AhorraGT</Text>
          <Text style={styles.tagline}>Compara precios en Guatemala</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Iniciar sesión</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="email" size={20} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#bbb"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock-outline" size={20} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#bbb"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={20} color="#aaa" />
              </TouchableOpacity>
            </View>
          </View>

          <Link href="/(auth)/reset-password" style={styles.forgotBtn}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </Link>

          <TouchableOpacity style={styles.mainBtn} onPress={handleSubmit} disabled={loading || googleLoading}>
            {loading
              ? <ActivityIndicator color={BrandColors.white} />
              : <Text style={styles.mainBtnText}>Entrar</Text>
            }
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading
              ? <ActivityIndicator color="#4285F4" size="small" />
              : <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleBtnText}>Continuar con Google</Text>
                </>
            }
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>¿No tienes cuenta? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.switchLink}>Regístrate</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: BrandColors.primary },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  appName: { fontSize: 32, fontWeight: 'bold', color: BrandColors.white, letterSpacing: 1 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: {
    backgroundColor: BrandColors.white, borderRadius: 16, padding: 24,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    elevation: 8,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BrandColors.cardBackground, borderRadius: 10,
    borderWidth: 1, borderColor: BrandColors.border,
  },
  inputIcon: { paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#333' },
  eyeBtn: { paddingHorizontal: 12 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 8, marginTop: -8 },
  forgotText: { fontSize: 13, color: BrandColors.primary },
  mainBtn: {
    backgroundColor: BrandColors.primary, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  mainBtnText: { color: BrandColors.white, fontSize: 16, fontWeight: 'bold' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BrandColors.border },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: BrandColors.textMuted },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: BrandColors.border, borderRadius: 10,
    paddingVertical: 12, gap: 10,
  },
  googleIcon: { fontSize: 18, fontWeight: 'bold', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#333' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { fontSize: 14, color: '#888' },
  switchLink: { fontSize: 14, color: BrandColors.primary, fontWeight: '600' },
});

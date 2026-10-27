import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { resetPassword } from '@/lib/auth';
import { BrandColors } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return Alert.alert('Error', 'Ingresa tu correo.');

    setLoading(true);
    try {
      await resetPassword(email.trim());
      Alert.alert(
        'Correo enviado',
        'Revisa tu bandeja de entrada para restablecer tu contraseña.',
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
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
            <MaterialIcons name="lock-outline" size={40} color={BrandColors.white} />
          </View>
          <Text style={styles.appName}>Recuperar contraseña</Text>
          <Text style={styles.tagline}>Te enviaremos un enlace a tu correo</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Recuperar contraseña</Text>

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

          <TouchableOpacity style={styles.mainBtn} onPress={handleSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color={BrandColors.white} />
              : <Text style={styles.mainBtnText}>Enviar correo</Text>
            }
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>¿Recordaste tu contraseña? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.switchLink}>Inicia sesión</Text>
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
  appName: { fontSize: 28, fontWeight: 'bold', color: BrandColors.white, letterSpacing: 1, textAlign: 'center' },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' },
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
  mainBtn: {
    backgroundColor: BrandColors.primary, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  mainBtnText: { color: BrandColors.white, fontSize: 16, fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { fontSize: 14, color: '#888' },
  switchLink: { fontSize: 14, color: BrandColors.primary, fontWeight: '600' },
});

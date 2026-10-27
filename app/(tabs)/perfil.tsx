import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Alert, Linking, StyleSheet, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useNotifications } from '@/lib/notifications';
import { getCacheStats, clearSearchCache } from '@/lib/offlineCache';

const appVersion = Constants.expoConfig?.version ?? '1.0.0';

export default function PerfilScreen() {
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();
  const theme = useTheme();
  const { showToast } = useToast();
  const { granted: pushGranted } = useNotifications();
  const [cacheCount, setCacheCount] = useState(0);

  useEffect(() => {
    getCacheStats().then((s) => setCacheCount(s.count)).catch(() => {});
  }, []);

  const displayName = user?.displayName ?? user?.email ?? 'Usuario';
  const avatarUrl = user?.photoURL ?? null;
  const provider = user?.providerData?.[0]?.providerId ?? 'password';
  const createdAt = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('es-GT', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  const isVerified = user?.emailVerified === true;

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/login');
          } catch {
            showToast('Error al cerrar sesión');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={[styles.avatarText, { color: theme.white }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.name, { color: theme.white }]}>{displayName}</Text>
        {user?.email && <Text style={styles.email}>{user.email}</Text>}
        {isAdmin && (
          <View style={styles.adminBadge}>
            <MaterialIcons name="admin-panel-settings" size={16} color={theme.white} />
            <Text style={[styles.adminText, { color: theme.white }]}>Admin</Text>
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.row}>
          <MaterialIcons name="person" size={20} color={theme.textMuted} />
          <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Proveedor</Text>
          <Text style={[styles.rowValue, { color: theme.text }]}>{provider === 'google' ? 'Google' : 'Email'}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.cardBackground }]} />
        <View style={styles.row}>
          <MaterialIcons name="calendar-today" size={20} color={theme.textMuted} />
          <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Miembro desde</Text>
          <Text style={[styles.rowValue, { color: theme.text }]}>{createdAt}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.cardBackground }]} />
        <View style={styles.row}>
          <MaterialIcons name={isVerified ? 'verified' : 'cancel'} size={20} color={isVerified ? theme.success : theme.error} />
          <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Correo</Text>
          <Text style={[styles.rowValue, { color: isVerified ? theme.success : theme.error }]}>
            {isVerified ? 'Verificado' : 'No verificado'}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.cardBackground }]} />
        <View style={styles.row}>
          <MaterialIcons name="notifications" size={20} color={pushGranted ? theme.success : theme.textMuted} />
          <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Notificaciones</Text>
          <Text style={[styles.rowValue, { color: pushGranted ? theme.success : theme.textMuted }]}>
            {pushGranted ? 'Activadas' : 'Desactivadas'}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.cardBackground }]} />
        <View style={styles.row}>
          <MaterialIcons name="cloud-off" size={20} color={theme.textMuted} />
          <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Cache offline</Text>
          <TouchableOpacity onPress={async () => { await clearSearchCache(); setCacheCount(0); Alert.alert('Cache', 'Cache de búsqueda limpiado.'); }}>
            <Text style={[styles.rowValue, { color: theme.primary }]}>
              {cacheCount} búsquedas
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={[styles.logoutBtn, { borderColor: theme.error }]} onPress={handleLogout}>
        <MaterialIcons name="logout" size={20} color={theme.error} />
        <Text style={[styles.logoutText, { color: theme.error }]}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => Linking.openURL('https://ahorragt.app/privacy')}>
          <Text style={[styles.footerLink, { color: theme.textMuted }]}>Privacidad</Text>
        </TouchableOpacity>
        <Text style={[styles.footerDot, { color: theme.textMuted }]}>·</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://ahorragt.app/terms')}>
          <Text style={[styles.footerLink, { color: theme.textMuted }]}>Términos</Text>
        </TouchableOpacity>
        <Text style={[styles.footerDot, { color: theme.textMuted }]}>·</Text>
        <Text style={[styles.footerVersion, { color: theme.textMuted }]}>v{appVersion}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center', paddingVertical: 32,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarImage: {
    width: 72, height: 72, borderRadius: 36, marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: 'bold' },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8,
  },
  adminText: { fontSize: 13, fontWeight: '600' },
  card: {
    margin: 16, borderRadius: 12, padding: 4,
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    elevation: 3,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14, gap: 12,
  },
  rowLabel: { fontSize: 15, flex: 1 },
  rowValue: { fontSize: 15, fontWeight: '500' },
  divider: { height: 1, marginHorizontal: 14 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, gap: 8,
    borderWidth: 1.5, borderRadius: 10, paddingVertical: 14,
  },
  logoutText: { fontSize: 15, fontWeight: '600' },
  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 24, gap: 6, paddingBottom: 24,
  },
  footerLink: { fontSize: 13 },
  footerDot: { fontSize: 13 },
  footerVersion: { fontSize: 13 },
});

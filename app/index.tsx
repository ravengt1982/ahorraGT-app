import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getItem } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { BrandColors } from '@/constants/theme';

export default function Index() {
  const { isLoading, user } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const done = await getItem('onboarding_done');
      if (!done) {
        router.replace('/onboarding');
        return;
      }
      setChecking(false);
    })();
  }, []);

  useEffect(() => {
    if (checking || isLoading) return;
    const path = user ? '/(tabs)/buscar' : '/(auth)/login';
    router.replace(path as any);
  }, [checking, isLoading, user]);

  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={BrandColors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
  },
});

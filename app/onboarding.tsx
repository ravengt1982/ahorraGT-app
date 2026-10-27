import { useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Dimensions, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { setItem } from '@/lib/storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'search' as const,
    title: 'Busca productos',
    subtitle: 'Encuentra cualquier producto y compara precios al instante.',
  },
  {
    icon: 'compare' as const,
    title: 'Compara precios',
    subtitle: 'Ve qué tienda tiene el mejor precio y ahorra en cada compra.',
  },
  {
    icon: 'favorite' as const,
    title: 'Guarda favoritos',
    subtitle: 'Guarda tus productos favoritos para consultarlos después.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const handleDone = async () => {
    await setItem('onboarding_done', 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    if (page < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: page + 1 });
      setPage(page + 1);
    } else {
      handleDone();
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <MaterialIcons name={item.icon} size={80} color="#fff" />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
        keyExtractor={(_, i) => String(i)}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.activeDot]} />
          ))}
        </View>
        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleDone}>
            <Text style={styles.skip}>Saltar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextText}>{page === slides.length - 1 ? 'Comenzar' : 'Siguiente'}</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1976D2' },
  slide: {
    width, flex: 1,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 24, textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 12, textAlign: 'center', lineHeight: 22 },
  footer: { paddingHorizontal: 24, paddingBottom: 48 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.4)' },
  activeDot: { backgroundColor: '#fff', width: 26 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skip: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10,
  },
  nextText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});

import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { isAdmin } = useAuth();
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: theme.white,
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar Productos',
          tabBarLabel: 'Buscar',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="comparar"
        options={{
          title: 'Comparador de Precios',
          tabBarLabel: 'Comparar',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="compare" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favoritos"
        options={{
          title: 'Mis Favoritos',
          tabBarLabel: 'Favoritos',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="favorite" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="lista"
        options={{
          title: 'Lista de Compras',
          tabBarLabel: 'Lista',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="shopping-cart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Mi Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Panel Admin',
          tabBarLabel: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <MaterialIcons name="admin-panel-settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

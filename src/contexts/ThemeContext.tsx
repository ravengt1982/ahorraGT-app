import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, BrandColors } from '@/constants/theme';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  white: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  card: string;
  cardBackground: string;
  border: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
}

const ThemeContext = createContext<ThemeColors | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const base = scheme === 'dark' ? Colors.dark : Colors.light;

  const colors: ThemeColors = useMemo(() => ({
    ...base,
    primary: BrandColors.primary,
    primaryLight: BrandColors.primaryLight,
    primaryDark: BrandColors.primaryDark,
    accent: BrandColors.accent,
    success: BrandColors.success,
    warning: BrandColors.warning,
    error: BrandColors.error,
    white: BrandColors.white,
    card: scheme === 'dark' ? '#1c1c1e' : '#ffffff',
    cardBackground: scheme === 'dark' ? '#121212' : '#f5f5f5',
    border: scheme === 'dark' ? '#333' : '#e0e0e0',
    textMuted: scheme === 'dark' ? '#666' : '#aaa',
  }), [scheme, base]);

  return (
    <ThemeContext.Provider value={colors}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeColors {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

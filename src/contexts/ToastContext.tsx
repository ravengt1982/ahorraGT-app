import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  Animated, Text, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

type ToastType = 'error' | 'success' | 'info';

interface ToastMessage {
  message: string;
  type: ToastType;
  id: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const bgColor = (type: ToastType) => {
    switch (type) {
      case 'error': return '#e74c3c';
      case 'success': return '#27ae60';
      case 'info': return theme.primary;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((toast, index) => (
        <Animated.View
          key={toast.id}
          style={[
            styles.toast,
            {
              backgroundColor: bgColor(toast.type),
              top: insets.top + 8 + index * 56,
            },
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      ))}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 14,
    borderRadius: 10,
    zIndex: 9999,
    elevation: 10,
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '500', textAlign: 'center' },
});

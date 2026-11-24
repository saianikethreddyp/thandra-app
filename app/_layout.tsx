import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { ToastProvider } from '@/components/ui';
import { loadContactsOnOpen } from '@/contacts/sync';
import { askNotificationsOnOpen } from '@/push/push';
import { colors } from '@/theme';
import { UpdateBanner } from '@/updates/UpdateBanner';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Do not retry client errors (wrong id, validation); retry network blips once or twice.
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

const headerOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.bg },
};

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }}>
      <Image source={require('../assets/splash-icon.png')} style={{ width: 200, height: 200 }} resizeMode="contain" accessibilityLabel="Thandra" />
      <Text style={{ color: '#FFFFFF', fontSize: 14, marginTop: 8, opacity: 0.8 }}>Self-drive cars</Text>
    </View>
  );
}

function Gate() {
  // Splash first, held briefly so it can be read. Every time the app opens it asks for contacts
  // (the phone's own prompt) or, if already allowed, reads them for the next booking, then asks for notifications.
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const started = Date.now();
      await loadContactsOnOpen(); // contacts first, then notifications: one phone prompt after the other
      await askNotificationsOnOpen();
      const left = 1200 - (Date.now() - started);
      if (left > 0) await new Promise((r) => setTimeout(r, left));
      if (!cancelled) setBooted(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (booted) SplashScreen.hideAsync().catch(() => {});
  }, [booted]);

  if (!booted) return <Splash />;

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="car/[id]" options={{ title: 'Car details' }} />
      <Stack.Screen name="booking/[id]" options={{ title: 'Booking confirmed' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <StatusBar style="light" />
          <Gate />
          <UpdateBanner />
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

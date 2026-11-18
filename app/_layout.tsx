import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ToastProvider } from '@/components/ui';
import { registerForPush } from '@/push/push';
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

function Gate() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  useEffect(() => {
    if (status === 'signedIn') registerForPush();
  }, [status]);

  // Tapping a notification opens the bookings list.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => router.navigate('/bookings'));
    return () => sub.remove();
  }, [router]);

  // Keep the native splash up until we know whether there is a saved session.
  if (status === 'loading') return <View style={{ flex: 1, backgroundColor: colors.primary }} />;

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="car/[id]" options={{ title: 'Car details' }} />
      <Stack.Screen name="booking/[id]" options={{ title: 'Your booking' }} />
      <Stack.Screen name="login" options={{ title: 'Sign in', presentation: 'modal' }} />
      <Stack.Screen name="verify" options={{ title: 'Verify your number' }} />
      <Stack.Screen name="contacts" options={{ title: 'Before you book', presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <StatusBar style="light" />
            <Gate />
            <UpdateBanner />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

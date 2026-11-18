import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useSyncContacts } from '@/api/hooks';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ToastProvider } from '@/components/ui';
import { CHUNK, contactsGranted, readContacts } from '@/contacts/sync';
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

const ASKED_KEY = 'permissions_asked';

const headerOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.bg },
};

function Gate() {
  const { status, user, reloadUser } = useAuth();
  const router = useRouter();
  const sync = useSyncContacts();
  const syncing = useRef(false);

  // First launch only: show the contacts / notifications prompt, signed in or not.
  useEffect(() => {
    if (status === 'loading') return;
    let t: ReturnType<typeof setTimeout>;
    SecureStore.getItemAsync(ASKED_KEY)
      .then((v) => { if (!v) t = setTimeout(() => router.push('/welcome'), 300); })
      .catch(() => {});
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status === 'loading']);

  // If contacts were allowed, save them to the account as soon as the person is signed in.
  useEffect(() => {
    if (status !== 'signedIn' || !user || user.contacts_synced_at || syncing.current) return;
    syncing.current = true;
    (async () => {
      try {
        if (!(await contactsGranted())) return;
        const all = await readContacts();
        if (all.length === 0) return;
        for (let i = 0; i < all.length; i += CHUNK) await sync.mutateAsync(all.slice(i, i + CHUNK));
        await reloadUser();
      } catch {
        // Retried next launch; booking still asks again if contacts are missing.
      } finally {
        syncing.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user?.id, user?.contacts_synced_at]);

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
      <Stack.Screen name="welcome" options={{ headerShown: false, presentation: 'modal', gestureEnabled: false }} />
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

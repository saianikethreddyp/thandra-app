import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

let registeredToken: string | null = null;

/**
 * Registers this phone for push. The API stores FCM tokens, so this only works on Android in a
 * development or production build (not Expo Go). Any failure is swallowed: push is optional.
 */
export async function registerForPush(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;
    const { data } = await Notifications.getDevicePushTokenAsync();
    if (typeof data !== 'string' || data === registeredToken) return;
    await api.request('/v1/customer/devices', { method: 'POST', body: { fcm_token: data, platform: 'android' } });
    registeredToken = data;
  } catch {
    // Expo Go, no Google services, offline, or permission denied.
  }
}

/** Call before signing out so this phone stops receiving the customer's notifications. */
export async function unregisterPush(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await api.request('/v1/customer/devices', { method: 'DELETE', body: { fcm_token: token } });
  } catch {
    // The server drops stale tokens on its own.
  }
}

/** True when the OS lets this app show notifications. */
export async function notificationsAllowed(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Asks the OS for notification permission (shows the system prompt if still undecided), then registers the token. */
export async function enableNotifications(): Promise<boolean> {
  try {
    const res = await Notifications.requestPermissionsAsync();
    if (res.granted) await registerForPush();
    return res.granted;
  } catch {
    return false;
  }
}

/**
 * Runs every time the app opens: shows the phone's notification prompt if it has not been decided
 * (the phone stops showing it once refused for good). It only asks; the phone is registered for
 * push later, when customers have accounts.
 */
export async function askNotificationsOnOpen(): Promise<void> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted && current.canAskAgain) await Notifications.requestPermissionsAsync();
  } catch (e) {
    if (__DEV__) console.warn('[notifications] could not ask for permission:', e);
  }
}

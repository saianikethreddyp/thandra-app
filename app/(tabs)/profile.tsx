import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { Button, Card, confirm, EmptyState, Screen, SectionTitle } from '@/components/ui';
import { PRIVACY_POLICY_URL } from '@/config';
import { enableNotifications, notificationsAllowed, unregisterPush } from '@/push/push';
import { colors, spacing } from '@/theme';
import { dateOnly } from '@/utils/format';
import { maskPhone } from '@/utils/phone';

export default function ProfileScreen() {
  const router = useRouter();
    const { status, user, logout } = useAuth();

  const [notifOn, setNotifOn] = useState<boolean | null>(null);
  const refreshNotif = useCallback(() => { notificationsAllowed().then(setNotifOn); }, []);
  useEffect(refreshNotif, [refreshNotif]);

  async function allowNotifications() {
    if (await enableNotifications()) return setNotifOn(true);
    setNotifOn(false);
    Linking.openSettings(); // the OS will not ask again once denied
  }

  const version = `v${Constants.expoConfig?.version ?? '?'}${Updates.updateId ? ` · ${Updates.updateId.slice(0, 8)}` : ''}`;

  if (status !== 'signedIn' || !user) {
    return (
      <Screen>
        <EmptyState
          icon="account-circle-outline"
          title="You are not signed in"
          text="Sign in to book cars and manage your trips."
          action={
            <View style={{ gap: spacing.md }}>
              <Button label="Log in" onPress={() => router.push('/login')} />
              <Button label="Create an account" variant="outline" onPress={() => router.push({ pathname: '/login', params: { intent: 'signup' } })} />
            </View>
          }
        />
        <Footer version={version} />
      </Screen>
    );
  }

  async function signOut() {
    if (!(await confirm('Sign out?', 'You can sign back in with your phone number.', 'Sign out'))) return;
    await unregisterPush();
    await logout();
  }

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{user.name ?? 'Customer'}</Text>
        <Text style={{ color: colors.muted, marginTop: 2 }}>{maskPhone(user.phone)}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>Member since {dateOnly(user.created_at)}</Text>
      </Card>

      <SectionTitle>Permissions</SectionTitle>
      <Card>
        <Text style={{ fontWeight: '700', color: colors.text }}>Notifications</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
          {notifOn ? 'On. You will get updates about your bookings.' : 'Off. Allow them to hear about booking confirmations and ride updates.'}
        </Text>
        {notifOn ? null : <Button label="Allow notifications" icon="bell-outline" onPress={allowNotifications} style={{ marginTop: spacing.md }} />}
      </Card>

      <SectionTitle>About</SectionTitle>
      <Button label="Privacy policy" variant="outline" icon="shield-lock-outline" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
      <Button label="Sign out" variant="ghost" onPress={signOut} style={{ marginTop: spacing.md }} />
      <Footer version={version} />
    </Screen>
  );
}

function Footer({ version }: { version: string }) {
  return <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: spacing.xl }}>Thandra Cars {version}</Text>;
}

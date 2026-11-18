import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts/legacy';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { Button, Card, Screen } from '@/components/ui';
import { PRIVACY_POLICY_URL } from '@/config';
import { enableNotifications } from '@/push/push';
import { colors, spacing } from '@/theme';

const ASKED_KEY = 'permissions_asked';

/**
 * Shown once, the first time the app opens. Allowing saves contacts after sign-in (prominent disclosure for
 * Google Play); declining just continues, and booking asks again later.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function finish(ask: boolean) {
    setBusy(true);
    try {
      await SecureStore.setItemAsync(ASKED_KEY, '1').catch(() => {});
      if (ask) {
        await Contacts.requestPermissionsAsync().catch(() => {});
        await enableNotifications();
      }
    } finally {
      router.back();
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginVertical: spacing.xl }}>
        <MaterialCommunityIcons name="shield-account-outline" size={56} color={colors.gold} />
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.md, textAlign: 'center' }}>Welcome to Thandra</Text>
      </View>
      <Card>
        {[
          ['Contacts', 'We read the names and phone numbers in your contacts once, only to trace a car and reach someone who knows you if it is lost or stolen. They are encrypted, never used for marketing, and they are removed automatically 30 days after your last ride.'],
          ['Notifications', 'Booking confirmations and ride updates.'],
        ].map(([t, d]) => (
          <View key={t} style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>{t}</Text>
            <Text style={{ color: colors.slate, lineHeight: 21, marginTop: 2 }}>{d}</Text>
          </View>
        ))}
        <Text onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} style={{ color: colors.blue, fontWeight: '600' }} accessibilityRole="link">
          Read the privacy policy
        </Text>
      </Card>
      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        <Button label="Allow and continue" onPress={() => finish(true)} loading={busy} />
        <Button label="Not now" variant="ghost" onPress={() => finish(false)} disabled={busy} />
      </View>
    </Screen>
  );
}

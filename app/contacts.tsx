import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts/legacy';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { useSyncContacts, type ContactInput } from '@/api/hooks';
import { useAuth } from '@/auth/AuthContext';
import { Button, Card, Screen, showError, useToast } from '@/components/ui';
import { PRIVACY_POLICY_URL } from '@/config';
import { colors, spacing } from '@/theme';

const CHUNK = 2000; // the API takes up to 10,000 per call; smaller calls are gentler on slow networks

async function readContacts(): Promise<ContactInput[]> {
  const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name] });
  const out: ContactInput[] = [];
  for (const c of data) for (const p of c.phoneNumbers ?? []) if (p.number) out.push({ name: c.name, phone: p.number });
  return out;
}

/**
 * One-time consent screen shown before the first booking. The wording is the "prominent disclosure"
 * Google Play requires: what is collected, why, how long, and how to delete it.
 */
export default function ContactsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { reloadUser } = useAuth();
  const sync = useSyncContacts();
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function allow() {
    setBusy(true);
    try {
      const perm = await Contacts.requestPermissionsAsync();
      if (!perm.granted) {
        setDenied(true);
        return;
      }
      const all = await readContacts();
      if (all.length === 0) {
        showError(new Error('empty'), 'No contacts found');
        return;
      }
      for (let i = 0; i < all.length; i += CHUNK) await sync.mutateAsync(all.slice(i, i + CHUNK));
      await reloadUser();
      toast.show('Contacts saved securely');
      router.back();
    } catch (e) {
      showError(e, 'Could not save your contacts');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <MaterialCommunityIcons name="shield-account-outline" size={56} color={colors.gold} />
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.md, textAlign: 'center' }}>Share your contacts to book</Text>
      </View>
      <Card>
        {[
          ['What we collect', 'The names and phone numbers in your contacts, once, before your first booking.'],
          ['Why', 'Only to trace a car and reach someone who knows you if it is lost or stolen. We never call or message them, and never use them for marketing.'],
          ['How it is kept', 'Encrypted. Only Thandra staff handling a case can open them, and every view is logged.'],
          ['Your control', 'After your ride you can delete them from Profile. They are removed automatically 30 days after your last ride.'],
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

      {denied ? (
        <Text style={{ color: colors.red, marginTop: spacing.lg }}>
          Contacts permission was denied. Turn it on in Settings to continue booking.
        </Text>
      ) : null}
      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {denied ? <Button label="Open settings" onPress={() => Linking.openSettings()} variant="outline" /> : null}
        <Button label="Allow and continue" onPress={allow} loading={busy} />
        <Button label="Not now" onPress={() => router.back()} variant="ghost" disabled={busy} />
      </View>
    </Screen>
  );
}

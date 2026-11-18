import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { Linking, Text, View } from 'react-native';

import { useContactsStatus, useDeleteContacts } from '@/api/hooks';
import { useAuth } from '@/auth/AuthContext';
import { Button, Card, confirm, EmptyState, Screen, SectionTitle, showError, useToast } from '@/components/ui';
import { PRIVACY_POLICY_URL } from '@/config';
import { unregisterPush } from '@/push/push';
import { colors, spacing } from '@/theme';
import { dateOnly } from '@/utils/format';
import { maskPhone } from '@/utils/phone';

export default function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { status, user, logout, reloadUser } = useAuth();
  const contacts = useContactsStatus();
  const del = useDeleteContacts();

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

  async function deleteContacts() {
    if (!(await confirm('Delete your contacts?', 'We will remove the contacts we stored. You will be asked again before your next booking.', 'Delete', true))) return;
    try {
      const res = await del.mutateAsync(undefined);
      await reloadUser();
      toast.show(`${res.deleted} contacts deleted`);
    } catch (e) {
      showError(e, 'Could not delete contacts');
    }
  }

  async function signOut() {
    if (!(await confirm('Sign out?', 'You can sign back in with your phone number.', 'Sign out'))) return;
    await unregisterPush();
    await logout();
  }

  const c = contacts.data;
  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{user.name ?? 'Customer'}</Text>
        <Text style={{ color: colors.muted, marginTop: 2 }}>{maskPhone(user.phone)}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>Member since {dateOnly(user.created_at)}</Text>
      </Card>

      <SectionTitle>Your contacts</SectionTitle>
      <Card>
        {c?.synced ? (
          <>
            <Text style={{ color: colors.text }}>{c.count} contacts stored securely{c.synced_at ? ` since ${dateOnly(c.synced_at)}` : ''}.</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Used only to trace a car if it is lost or stolen.{c.can_delete ? '' : ' You can delete them once your current trip is over.'}</Text>
            <Button label="Delete my contacts" variant="danger" onPress={deleteContacts} loading={del.isPending} disabled={!c.can_delete} style={{ marginTop: spacing.lg }} />
          </>
        ) : (
          <Text style={{ color: colors.muted }}>No contacts stored. You will be asked once before your first booking.</Text>
        )}
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

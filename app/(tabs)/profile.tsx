import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Linking, Text } from 'react-native';

import { Button, Card, Screen, SectionTitle } from '@/components/ui';
import { PRIVACY_POLICY_URL } from '@/config';
import { colors, spacing } from '@/theme';

export default function AboutScreen() {
  const version = `v${Constants.expoConfig?.version ?? '?'}${Updates.updateId ? ` · ${Updates.updateId.slice(0, 8)}` : ''}`;
  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Thandra Self Drive Cars</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>
          Pick a car, choose your dates and give us your details. We confirm the booking and you pay at the hub when you collect the car.
        </Text>
      </Card>

      <SectionTitle>About</SectionTitle>
      <Button label="Privacy policy" variant="outline" icon="shield-lock-outline" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
      <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: spacing.xl }}>Thandra Cars {version}</Text>
    </Screen>
  );
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAuth, type Intent } from '@/auth/AuthContext';
import { Button, Card, Field, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { isApiError } from '@/utils/errors';
import { errorMessage } from '@/utils/errors';
import { isValidIndianMobile, toLocalNumber } from '@/utils/phone';

export default function LoginScreen() {
  const router = useRouter();
  const { requestOtp } = useAuth();
  const params = useLocalSearchParams<{ intent?: Intent }>();
  const [intent, setIntent] = useState<Intent>(params.intent === 'signup' ? 'signup' : 'login');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!isValidIndianMobile(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await requestOtp(phone, intent);
      router.push({ pathname: '/verify', params: { phone: toLocalNumber(phone), intent } });
    } catch (e) {
      if (isApiError(e, 404, 'account_not_found')) {
        setError('No account found for this number. Create one with Sign up.');
        setIntent('signup');
      } else if (isApiError(e, 409, 'account_exists')) {
        setError('This number already has an account. Use Log in.');
        setIntent('login');
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', backgroundColor: colors.border, borderRadius: 12, padding: 4, marginBottom: spacing.xl }}>
        {(['login', 'signup'] as const).map((i) => (
          <Pressable
            key={i}
            accessibilityRole="tab"
            accessibilityState={{ selected: intent === i }}
            onPress={() => { setIntent(i); setError(''); }}
            style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: intent === i ? colors.card : 'transparent' }}
          >
            <Text style={{ fontWeight: '700', color: intent === i ? colors.primary : colors.muted }}>{i === 'login' ? 'Log in' : 'Sign up'}</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 }}>{intent === 'login' ? 'Welcome back' : 'Create your account'}</Text>
        <Text style={{ color: colors.muted, marginBottom: spacing.xl }}>We will text a 6-digit code to confirm your number.</Text>
        <Field
          label="Mobile number"
          value={phone}
          onChangeText={(t) => setPhone(toLocalNumber(t))}
          keyboardType="number-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={10}
          placeholder="98765 43210"
          error={error}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
        <Button label="Send code" onPress={submit} loading={busy} />
      </Card>
    </Screen>
  );
}

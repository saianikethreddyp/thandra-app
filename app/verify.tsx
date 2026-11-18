import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { useAuth, type Intent } from '@/auth/AuthContext';
import { Button, Card, Field, Screen, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { errorMessage } from '@/utils/errors';
import { maskPhone } from '@/utils/phone';

const RESEND_SECONDS = 30;

export default function VerifyScreen() {
  const router = useRouter();
  const toast = useToast();
  const { verifyOtp, requestOtp } = useAuth();
  const { phone = '', intent = 'login' } = useLocalSearchParams<{ phone: string; intent: Intent }>();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(c = code) {
    if (c.length !== 6) return setError('Enter the 6-digit code.');
    if (intent === 'signup' && name.trim().length < 1) return setNameError('Enter your name.');
    setError('');
    setNameError('');
    setBusy(true);
    try {
      await verifyOtp(phone, intent, c, name);
      router.dismiss(2); // back to wherever sign-in was started
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function resend() {
    try {
      await requestOtp(phone, intent);
      setWait(RESEND_SECONDS);
      toast.show('A new code is on its way');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Enter the code</Text>
        <Text style={{ color: colors.muted, marginTop: 4, marginBottom: spacing.xl }}>Sent to {maskPhone(phone)}</Text>
        {intent === 'signup' ? <Field label="Your name" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" autoComplete="name" error={nameError} /> : null}
        <Field
          label="6-digit code"
          value={code}
          onChangeText={(t) => {
            const v = t.replace(/\D/g, '').slice(0, 6);
            setCode(v);
            if (v.length === 6 && (intent === 'login' || name.trim())) submit(v);
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={6}
          placeholder="••••••"
          style={{ letterSpacing: 8, fontSize: 22, textAlign: 'center' }}
          error={error}
          autoFocus
        />
        <Button label={intent === 'signup' ? 'Create account' : 'Log in'} onPress={() => submit()} loading={busy} />
        <Pressable accessibilityRole="button" onPress={resend} disabled={wait > 0} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md }}>
          <Text style={{ color: wait > 0 ? colors.muted : colors.blue, fontWeight: '600' }}>{wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

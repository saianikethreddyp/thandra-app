import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useCar, useCreateBooking, useHubs } from '@/api/hooks';
import { DateTimeField } from '@/components/DateTimeField';
import { ensureContactsAccess, uploadContactsForBooking } from '@/contacts/sync';
import { Button, Card, ErrorState, Field, IconRow, Loading, Screen, SectionTitle, showError } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, radius, spacing } from '@/theme';
import { isApiError } from '@/utils/errors';
import { dateTime, money, titleCase } from '@/utils/format';
import { aadhaarDigits, cleanLicence, emptyGuest, formatAadhaar, toGuestBody, validateGuest, type GuestDetails, type GuestErrors } from '@/utils/guest';
import { toLocalNumber } from '@/utils/phone';
import { billableDays, estimateTotal, nextHour, validateWindow } from '@/utils/pricing';

export default function CarDetailScreen() {
  const { id, from: fromParam, to: toParam } = useLocalSearchParams<{ id: string; from?: string; to?: string }>();
  const router = useRouter();
  const r = useResponsive();
  const car = useCar(id);
  const hubs = useHubs();
  const create = useCreateBooking();
  const [uploading, setUploading] = useState(false);

  const [from, setFrom] = useState(() => (fromParam ? new Date(fromParam) : nextHour()));
  const [to, setTo] = useState(() => (toParam ? new Date(toParam) : new Date(nextHour().getTime() + 24 * 3600 * 1000)));
  const [conflict, setConflict] = useState('');
  const [photoWidth, setPhotoWidth] = useState(0);
  const [guest, setGuest] = useState<GuestDetails>(emptyGuest);
  const [errors, setErrors] = useState<GuestErrors>({});

  const windowError = validateWindow(from, to);
  const set = (k: keyof GuestDetails) => (v: string) => {
    setGuest((g) => ({ ...g, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function book() {
    if (windowError) return;
    const found = validateGuest(guest);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setConflict('');
    // No contacts, no booking: the contacts are what lets us trace the car if it is stolen.
    const access = await ensureContactsAccess();
    if (access !== 'granted') {
      Alert.alert(
        'Contacts access is required',
        access === 'blocked'
          ? 'To book a car, allow Thandra to read your contacts in your phone Settings, then try again.'
          : 'To book a car, please allow Thandra to read your contacts. They are kept encrypted and used only to trace the car if it is stolen.',
        access === 'blocked'
          ? [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
          : [{ text: 'OK' }],
      );
      return;
    }
    try {
      const b = await create.mutateAsync({ car_id: id, start_at: from.toISOString(), end_at: to.toISOString(), ...toGuestBody(guest) });
      setUploading(true);
      try {
        await uploadContactsForBooking(b.id);
      } catch {
        // The booking is made; the contacts are best effort and not worth blocking the confirmation.
      } finally {
        setUploading(false);
      }
      router.replace({ pathname: '/booking/[id]', params: { id: b.id } });
    } catch (e) {
      if (isApiError(e, 409, 'car_booked')) setConflict('Someone just booked this car for those times. Try different dates.');
      else showError(e, 'Could not book the car');
    }
  }

  if (car.isLoading) return <Loading />;
  if (car.error || !car.data) return <ErrorState error={car.error} onRetry={() => car.refetch()} />;
  const c = car.data;
  const hub = hubs.data?.find((h) => h.id === c.hub_id);
  const days = billableDays(from, to);
  const wide = r.size === 'large';

  const gallery =
    c.photos.length > 0 ? (
      <View onLayout={(e) => setPhotoWidth(e.nativeEvent.layout.width)} style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {c.photos.map((p) => (
            <Image key={p} source={{ uri: p }} style={{ width: photoWidth || r.contentWidth, aspectRatio: 16 / 10, backgroundColor: colors.border }} resizeMode="cover" accessibilityLabel={`${c.brand} ${c.model} photo`} />
          ))}
        </ScrollView>
      </View>
    ) : null;

  const info = (
    <>
      <Text style={styles.title}>
        {c.brand} {c.model}
      </Text>
      <Text style={styles.price}>
        {money(c.price_per_day)}
        <Text style={styles.sub}> / day</Text>
      </Text>
      <View style={styles.specs}>
        {[`${c.year}`, titleCase(c.fuel_type), titleCase(c.transmission), `${c.seats} seats`].map((s) => (
          <View key={s} style={styles.spec}>
            <Text style={styles.specText}>{s}</Text>
          </View>
        ))}
      </View>
      <IconRow icon="map-pin">
        {c.hub_name}
        {hub?.address ? `\n${hub.address}` : ''}
      </IconRow>
      {hub ? (
        <Text style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${hub.latitude},${hub.longitude}`)}>
          Open the hub in Maps
        </Text>
      ) : null}
    </>
  );

  const booking = (
    <>
      <SectionTitle>Choose your dates</SectionTitle>
      <DateTimeField label="Pick-up" value={from} minimumDate={new Date()} onChange={(d) => { setFrom(d); setConflict(''); if (d >= to) setTo(new Date(d.getTime() + 24 * 3600 * 1000)); }} />
      <DateTimeField label="Return" value={to} minimumDate={from} onChange={(d) => { setTo(d); setConflict(''); }} error={windowError ?? undefined} />
      <Card>
        <Row k="Pick-up" v={dateTime(from)} />
        <Row k="Return" v={dateTime(to)} />
        <Row k={`${days} day${days === 1 ? '' : 's'} × ${money(c.price_per_day)}`} v={windowError ? '—' : money(estimateTotal(c.price_per_day, from, to))} bold />
        <Text style={styles.sub}>Charged by the day, rounded up. You pay at the hub.</Text>
      </Card>
      <SectionTitle>Your details</SectionTitle>
      <Card>
        <Field label="Full name" value={guest.fullName} onChangeText={set('fullName')} autoCapitalize="words" textContentType="name" autoComplete="name" error={errors.fullName} />
        <Field label="Mobile number" value={guest.phone} onChangeText={(t) => set('phone')(toLocalNumber(t))} keyboardType="number-pad" textContentType="telephoneNumber" autoComplete="tel" maxLength={10} placeholder="98765 43210" error={errors.phone} />
        <Field label="Address" value={guest.address} onChangeText={set('address')} multiline textContentType="fullStreetAddress" autoComplete="street-address" style={{ minHeight: 84, textAlignVertical: 'top' }} error={errors.address} />
        <Field label="Aadhaar number" value={formatAadhaar(guest.aadhaar)} onChangeText={(t) => set('aadhaar')(aadhaarDigits(t))} keyboardType="number-pad" maxLength={14} placeholder="1234 5678 9012" error={errors.aadhaar} />
        <Field label="Driving licence number" value={guest.licence} onChangeText={(t) => set('licence')(cleanLicence(t))} autoCapitalize="characters" autoCorrect={false} maxLength={20} placeholder="TS09 20110012345" error={errors.licence} />
        <Text style={styles.sub}>We use these only to verify you and complete this booking. They are stored encrypted.</Text>
      </Card>
      {conflict ? <Text style={{ color: colors.red, marginTop: spacing.md }}>{conflict}</Text> : null}
      <Button label="Book this car" onPress={book} loading={create.isPending || uploading} disabled={!!windowError} style={{ marginTop: spacing.lg }} />
    </>
  );

  return (
    <Screen style={wide ? { maxWidth: 1100 } : undefined}>
      {wide ? (
        <View style={{ flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            {gallery}
            <View style={{ marginTop: spacing.lg }}>{info}</View>
          </View>
          <View style={{ flex: 1 }}>{booking}</View>
        </View>
      ) : (
        <>
          {gallery}
          <View style={{ marginTop: spacing.lg }}>{info}</View>
          {booking}
        </>
      )}
    </Screen>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, marginBottom: spacing.sm }}>
      <Text style={[styles.sub, bold && { color: colors.text, fontWeight: '700' }]}>{k}</Text>
      <Text style={[{ color: colors.text, flexShrink: 1, textAlign: 'right' }, bold && { fontWeight: '800', fontSize: 18 }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  price: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
  sub: { fontSize: 13, color: colors.muted, fontWeight: '400' },
  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
  spec: { backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  specText: { fontSize: 13, fontWeight: '600', color: colors.primaryLight },
  link: { color: colors.blue, fontWeight: '600', marginTop: spacing.sm, minHeight: 32 },
});

import { useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { useBooking, useCancelBooking } from '@/api/hooks';
import { Button, Card, confirm, ErrorState, IconRow, Loading, Pill, Screen, SectionTitle, showError, useToast } from '@/components/ui';
import { colors, spacing, statusStyle } from '@/theme';
import { dateTime, money } from '@/utils/format';
import { billableDays } from '@/utils/pricing';

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const booking = useBooking(id);
  const cancel = useCancelBooking(id);

  if (booking.isLoading) return <Loading />;
  if (booking.error || !booking.data) return <ErrorState error={booking.error} onRetry={() => booking.refetch()} />;
  const b = booking.data;
  const s = statusStyle[b.status];
  const canCancel = b.status === 'confirmed' && new Date(b.start_at) > new Date();
  const days = billableDays(new Date(b.start_at), new Date(b.end_at));

  async function onCancel() {
    if (!(await confirm('Cancel this booking?', 'The car will be released for other customers.', 'Cancel booking', true))) return;
    try {
      await cancel.mutateAsync();
      toast.show('Booking cancelled');
    } catch (e) {
      showError(e, 'Could not cancel');
    }
  }

  return (
    <Screen refreshing={booking.isRefetching} onRefresh={() => booking.refetch()}>
      <Pill label={s.label} color={s.color} bg={s.bg} />
      <Text style={styles.title}>
        {b.car_brand} {b.car_model}
      </Text>
      <Text style={styles.sub}>Registration {b.car_plate}</Text>

      <SectionTitle>Trip</SectionTitle>
      <Card>
        <Row k="Pick-up" v={dateTime(b.start_at)} />
        <Row k="Return" v={dateTime(b.end_at)} />
        <Row k={`${days} day${days === 1 ? '' : 's'} × ${money(b.price_per_day)}`} v={money(b.total_price)} bold />
        <Text style={styles.sub}>Pay at the hub when you collect the car.</Text>
      </Card>

      <SectionTitle>Pick up from</SectionTitle>
      <Card>
        <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>{b.hub_name}</Text>
        <IconRow icon="map-pin">{b.hub_address}</IconRow>
        <Button
          label="Get directions"
          icon="navigation-variant-outline"
          variant="outline"
          style={{ marginTop: spacing.lg }}
          onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${b.hub_latitude},${b.hub_longitude}`)}
        />
      </Card>

      {canCancel ? <Button label="Cancel booking" variant="danger" onPress={onCancel} loading={cancel.isPending} style={{ marginTop: spacing.xl }} /> : null}
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
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  sub: { fontSize: 13, color: colors.muted },
});

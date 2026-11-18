import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flatten, useMyBookings } from '@/api/hooks';
import type { Booking } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Button, EmptyState, ErrorState, FooterLoader, Loading, Pill } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, radius, spacing, statusStyle } from '@/theme';
import { dateTime, money } from '@/utils/format';

function BookingCard({ b, onPress }: { b: Booking; onPress: () => void }) {
  const s = statusStyle[b.status];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${b.car_brand} ${b.car_model}, ${s.label}`} onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={1}>
          {b.car_brand} {b.car_model}
        </Text>
        <Pill label={s.label} color={s.color} bg={s.bg} />
      </View>
      <Text style={styles.sub}>{b.hub_name}</Text>
      <Text style={styles.sub}>
        {dateTime(b.start_at)} → {dateTime(b.end_at)}
      </Text>
      <Text style={styles.price}>{money(b.total_price)}</Text>
    </Pressable>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const r = useResponsive();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const query = useMyBookings();

  if (status !== 'signedIn') {
    return (
      <EmptyState
        icon="calendar-account-outline"
        title="Sign in to see your bookings"
        text="Your trips and receipts show up here."
        action={<Button label="Sign in" onPress={() => router.push('/login')} />}
      />
    );
  }
  const items = flatten(query.data);
  return (
    <FlatList
      key={r.columns}
      numColumns={r.columns === 3 ? 2 : r.columns}
      data={items}
      keyExtractor={(b) => b.id}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: r.gutter, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md, width: '100%', maxWidth: 1100, alignSelf: 'center' }}
      columnWrapperStyle={r.columns > 1 ? { gap: spacing.md } : undefined}
      renderItem={({ item }) => (
        <View style={{ flex: 1 }}>
          <BookingCard b={item} onPress={() => router.push({ pathname: '/booking/[id]', params: { id: item.id } })} />
        </View>
      )}
      ListEmptyComponent={
        query.isLoading ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <EmptyState icon="calendar-blank-outline" title="No bookings yet" text="When you book a car it will show up here." action={<Button label="Browse cars" onPress={() => router.navigate('/')} />} />
        )
      }
      ListFooterComponent={<FooterLoader visible={query.isFetchingNextPage} />}
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
      onEndReachedThreshold={0.4}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => query.refetch()}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
  price: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
});

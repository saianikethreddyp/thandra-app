import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flatten, useCars, useHubs } from '@/api/hooks';
import { CarCard } from '@/components/CarCard';
import { DateTimeField } from '@/components/DateTimeField';
import { Button, EmptyState, ErrorState, FilterChips, FooterLoader, Loading, type Option } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing } from '@/theme';
import { nextHour, validateWindow } from '@/utils/pricing';

export default function CarsScreen() {
  const router = useRouter();
  const r = useResponsive();
  const insets = useSafeAreaInsets();
  const hubs = useHubs();
  const [hub, setHub] = useState('all');
  const [filterDates, setFilterDates] = useState(false);
  const [from, setFrom] = useState(() => nextHour());
  const [to, setTo] = useState(() => new Date(nextHour().getTime() + 24 * 3600 * 1000));

  const windowError = filterDates ? validateWindow(from, to) : null;
  const query = useCars({ hubId: hub === 'all' ? undefined : hub, from: filterDates && !windowError ? from : undefined, to: filterDates && !windowError ? to : undefined });
  const cars = flatten(query.data);

  const hubOptions = useMemo<Option<string>[]>(() => [{ value: 'all', label: 'All hubs' }, ...(hubs.data ?? []).map((h) => ({ value: h.id, label: h.name }))], [hubs.data]);
  const gutter = r.gutter;

  const header = (
    <View style={{ width: '100%', maxWidth: 1100, alignSelf: 'center', paddingBottom: spacing.md }}>
      <FilterChips options={hubOptions} value={hub} onChange={setHub} />
      <View style={{ marginTop: spacing.md }}>
        {filterDates ? (
          <View style={r.size === 'phone' ? undefined : { flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <DateTimeField label="Pick-up" value={from} minimumDate={new Date()} onChange={(d) => { setFrom(d); if (d >= to) setTo(new Date(d.getTime() + 24 * 3600 * 1000)); }} />
            </View>
            <View style={{ flex: 1 }}>
              <DateTimeField label="Return" value={to} minimumDate={from} onChange={setTo} error={windowError ?? undefined} />
            </View>
          </View>
        ) : null}
        <Button
          variant="outline"
          icon={filterDates ? 'close' : 'calendar-search'}
          label={filterDates ? 'Clear dates' : 'Check availability for dates'}
          onPress={() => setFilterDates((v) => !v)}
        />
      </View>
    </View>
  );

  return (
    <FlatList
      // A new key re-mounts the list when the column count changes (rotation, tablets).
      key={r.columns}
      numColumns={r.columns}
      data={cars}
      keyExtractor={(c) => c.id}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}
      columnWrapperStyle={r.columns > 1 ? { gap: spacing.lg, width: '100%', maxWidth: 1100, alignSelf: 'center' } : undefined}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <View style={r.columns === 1 ? { width: '100%', maxWidth: 560, alignSelf: 'center' } : { flex: 1 }}>
          <CarCard
            car={item}
            onPress={() =>
              router.push({ pathname: '/car/[id]', params: { id: item.id, ...(filterDates && !windowError ? { from: from.toISOString(), to: to.toISOString() } : {}) } })
            }
          />
        </View>
      )}
      ListEmptyComponent={
        query.isLoading ? (
          <Loading label="Finding cars…" />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <EmptyState title="No cars available" text={filterDates ? 'No car is free for those dates. Try different dates or another hub.' : 'There are no cars here right now. Please check back soon.'} />
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


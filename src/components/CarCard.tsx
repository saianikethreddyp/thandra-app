import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Car } from '@/api/types';
import { colors, radius, spacing } from '@/theme';
import { money, titleCase } from '@/utils/format';

export function CarCard({ car, onPress }: { car: Car; onPress: () => void }) {
  const photo = car.photos[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${car.brand} ${car.model}, ${money(car.price_per_day)} per day`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={[styles.photo, styles.photoEmpty]}>
          <MaterialCommunityIcons name="car-side" size={48} color={colors.muted} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {car.brand} {car.model}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {car.year} · {titleCase(car.fuel_type)} · {titleCase(car.transmission)} · {car.seats} seats
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.muted} /> {car.hub_name}
        </Text>
        <Text style={styles.price}>
          {money(car.price_per_day)}
          <Text style={styles.sub}> / day</Text>
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.border },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, gap: 2 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
  price: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
});

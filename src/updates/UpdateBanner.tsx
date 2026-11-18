import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/theme';

const CHECK_EVERY_MS = 10 * 60 * 1000;

/**
 * Over-the-air updates (EAS Update). On launch the app downloads any newer JS bundle
 * for its runtime version; this also re-checks when the app returns to the foreground,
 * and offers a one-tap restart once an update is ready. Does nothing in development.
 */
export function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const { isUpdatePending } = Updates.useUpdates();
  const lastCheck = useRef(0);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    async function check() {
      if (Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
      lastCheck.current = Date.now();
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // No network or no update server: try again next time.
      }
    }
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  if (!isUpdatePending) return null;
  return (
    <View style={[styles.wrap, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
      <Pressable accessibilityRole="button" accessibilityLabel="Restart to update" onPress={() => Updates.reloadAsync()} style={styles.banner}>
        <Text style={styles.text}>A new version is ready</Text>
        <Text style={styles.action}>Restart</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, marginHorizontal: spacing.lg },
  text: { color: '#FFFFFF', fontSize: 14 },
  action: { color: colors.gold, fontSize: 14, fontWeight: '700' },
});

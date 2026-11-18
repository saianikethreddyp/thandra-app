import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '@/hooks/useResponsive';
import { colors, radius, spacing } from '@/theme';
import { errorMessage } from '@/utils/errors';

// ---------------------------------------------------------------- layout

/**
 * Page container. Content is centred and capped in width so forms stay readable
 * on tablets and in landscape, and padding follows the safe areas.
 */
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  style,
  edges = ['bottom'],
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom')[];
}) {
  const r = useResponsive();
  const insets = useSafeAreaInsets();
  const pad = { paddingHorizontal: r.gutter, paddingTop: edges.includes('top') ? insets.top + spacing.lg : spacing.lg, paddingBottom: (edges.includes('bottom') ? insets.bottom : 0) + spacing.xxl };
  const inner = <View style={[{ width: '100%', maxWidth: r.contentWidth, alignSelf: 'center' }, style]}>{children}</View>;
  if (!scroll) return <View style={[styles.page, pad]}>{inner}</View>;
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={pad}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.gold} /> : undefined}
    >
      {inner}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

// ---------------------------------------------------------------- controls

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  const fg = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? colors.red : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && { backgroundColor: colors.primary },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.primary },
        variant === 'danger' && { borderWidth: 1.5, borderColor: colors.red },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        off && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <MaterialCommunityIcons name={icon} size={20} color={fg} /> : null}
      <Text style={[styles.btnLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, error, hint, ...input }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#94A3B8"
        {...input}
        onFocus={(e) => {
          setFocus(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          input.onBlur?.(e);
        }}
        style={[styles.input, focus && { borderColor: colors.primary }, !!error && { borderColor: colors.red }, input.style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export type Option<T extends string> = { value: T; label: string };

export function FilterChips<T extends string>({ options, value, onChange }: { options: Option<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.chip, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Text style={[styles.chipText, on && { color: '#FFFFFF' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ---------------------------------------------------------------- states

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.gold} size="large" />
      {label ? <Text style={[styles.muted, { marginTop: spacing.md }]}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon = 'car-off', title, text, action }: { icon?: keyof typeof MaterialCommunityIcons.glyphMap; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={styles.center}>
      <MaterialCommunityIcons name={icon} size={48} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={[styles.muted, { textAlign: 'center', marginTop: spacing.xs }]}>{text}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <EmptyState icon="wifi-off" title="Something went wrong" text={errorMessage(error)} action={<Button label="Try again" onPress={onRetry} variant="outline" />} />;
}

export function FooterLoader({ visible }: { visible: boolean }) {
  return visible ? <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.lg }} /> : null;
}

export function IconRow({ icon, children }: { icon: keyof typeof Feather.glyphMap; children: ReactNode }) {
  return (
    <View style={styles.iconRow}>
      <Feather name={icon} size={16} color={colors.muted} style={{ marginTop: 2 }} />
      <Text style={[styles.body, { flex: 1 }]}>{children}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- toast and dialogs

type ToastApi = { show: (message: string) => void };
const ToastContext = createContext<ToastApi>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (m: string) => {
      setMessage(m);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      timer.current = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(), 3000);
    },
    [opacity],
  );
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Animated.View pointerEvents="none" style={[styles.toast, { opacity, bottom: insets.bottom + 24 }]}>
        <Text style={styles.toastText} accessibilityLiveRegion="polite">
          {message}
        </Text>
      </Animated.View>
    </ToastContext.Provider>
  );
}

/** Resolves true if the person confirms. */
export function confirm(title: string, message: string, confirmLabel = 'Confirm', destructive = false): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function showError(e: unknown, title = 'Could not complete that') {
  if ((e as { code?: string })?.code === 'session_expired') return; // the sign-in gate handles this
  Alert.alert(title, errorMessage(e));
}

// ---------------------------------------------------------------- styles

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted, marginTop: spacing.xl, marginBottom: spacing.sm },
  btn: { minHeight: 52, borderRadius: radius.md, paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  btnLabel: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.primaryLight, marginBottom: 6 },
  input: { minHeight: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card, paddingHorizontal: spacing.lg, fontSize: 16, color: colors.text },
  error: { color: colors.red, fontSize: 13, marginTop: 6 },
  hint: { color: colors.muted, fontSize: 13, marginTop: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '700' },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.primaryLight },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, minHeight: 240 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  muted: { color: colors.muted, fontSize: 14 },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  iconRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  toast: { position: 'absolute', alignSelf: 'center', maxWidth: 560, marginHorizontal: spacing.lg, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md },
  toastText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center' },
});

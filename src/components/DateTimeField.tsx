import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '@/theme';
import { dateTime } from '@/utils/format';

/**
 * Date and time in one field. Android shows the date dialog and then the time
 * dialog; iOS shows a compact picker that does both.
 */
export function DateTimeField({ label, value, onChange, minimumDate, error }: { label: string; value: Date; onChange: (d: Date) => void; minimumDate?: Date; error?: string }) {
  const [step, setStep] = useState<'closed' | 'date' | 'time'>('closed');
  const [draft, setDraft] = useState(value);

  if (Platform.OS === 'ios') {
    return (
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.box, !!error && { borderColor: colors.red }]}>
          <DateTimePicker value={value} mode="datetime" minimumDate={minimumDate} minuteInterval={5} onChange={(_, d) => d && onChange(d)} accessibilityLabel={label} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  function onPick(e: DateTimePickerEvent, d?: Date) {
    if (e.type === 'dismissed' || !d) return setStep('closed');
    if (step === 'date') {
      const next = new Date(value);
      next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
      setDraft(next);
      setStep('time');
    } else {
      const next = new Date(draft);
      next.setHours(d.getHours(), d.getMinutes(), 0, 0);
      setStep('closed');
      onChange(next);
    }
  }

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${dateTime(value)}`} onPress={() => { setDraft(value); setStep('date'); }} style={[styles.box, styles.row, !!error && { borderColor: colors.red }]}>
        <Text style={styles.value}>{dateTime(value)}</Text>
        <MaterialCommunityIcons name="calendar-clock" size={22} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {step !== 'closed' ? <DateTimePicker value={step === 'date' ? value : draft} mode={step} minimumDate={step === 'date' ? minimumDate : undefined} is24Hour={false} onChange={onPick} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.primaryLight, marginBottom: 6 },
  box: { minHeight: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card, paddingHorizontal: spacing.lg, justifyContent: 'center', alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  value: { fontSize: 16, color: colors.text },
  error: { color: colors.red, fontSize: 13, marginTop: 6 },
});

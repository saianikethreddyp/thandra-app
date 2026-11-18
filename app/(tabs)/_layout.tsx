import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme';

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

const tab = (title: string, icon: Icon) => ({
  title,
  tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => <MaterialCommunityIcons name={icon} color={color as string} size={size} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={tab('Cars', 'car-side')} />
      <Tabs.Screen name="bookings" options={tab('My bookings', 'calendar-check-outline')} />
      <Tabs.Screen name="profile" options={tab('Profile', 'account-circle-outline')} />
    </Tabs>
  );
}

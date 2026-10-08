import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useAnalyzer } from '@/context/AnalyzerContext';
import { translate } from '@/lib/translations';

export default function TabLayout() {
  const colors = useColors();
  const { preferences } = useAnalyzer();
  const t = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key);
  const isWeb = Platform.OS === 'web';
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600', marginBottom: isWeb ? 4 : 0 },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 8,
          height: isWeb ? 84 : 62,
          paddingTop: 7,
          paddingBottom: isWeb ? 34 : 7,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('monitor'),
          tabBarIcon: ({ color, size }) => <Feather name="activity" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('analytics'),
          tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('history'),
          tabBarIcon: ({ color, size }) => <Feather name="clock" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

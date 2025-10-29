import NotificationMenu from '@/components/notification-menu';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsPage() {
  const { actualTheme } = useTheme();
  const colors = Colors[actualTheme];
  
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <NotificationMenu />
    </SafeAreaView>
  );
}
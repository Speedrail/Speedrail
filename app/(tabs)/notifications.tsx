import NotificationMenu from '@/components/notification-menu';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsPage() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <NotificationMenu />
    </SafeAreaView>
  );
}
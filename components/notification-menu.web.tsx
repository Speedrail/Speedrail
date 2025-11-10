import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/theme-context';
import { Colors } from '../constants/theme';

export default function NotificationMenu() {
  const { actualTheme } = useTheme();
  const colors = Colors[actualTheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSecondary }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Push notifications are not supported on web for this build.</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Use the mobile app to receive alerts.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});

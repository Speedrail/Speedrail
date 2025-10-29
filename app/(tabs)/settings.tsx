import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import Feather from '@expo/vector-icons/Feather';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsPage() {
  const { themeMode, actualTheme, setThemeMode } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const isDark = actualTheme === 'dark';
  const colors = Colors[actualTheme];

  const handleThemeChange = (mode: 'light' | 'dark' | 'auto') => {
    setThemeMode(mode);
  };

  return (
    <SafeAreaView 
      edges={['top']} 
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="sun" size={20} color={colors.icon} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Theme</Text>
              </View>
            </View>
            
            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  themeMode === 'light' && styles.themeButtonActive,
                  { borderColor: colors.cardBorder },
                  themeMode === 'light' && { backgroundColor: colors.accentBlue || colors.tint }
                ]}
                onPress={() => handleThemeChange('light')}
              >
                <Feather 
                  name="sun" 
                  size={20} 
                  color={themeMode === 'light' ? '#fff' : colors.icon} 
                />
                <Text style={[
                  styles.themeButtonText,
                  { color: themeMode === 'light' ? '#fff' : colors.text }
                ]}>
                  Light
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeButton,
                  themeMode === 'dark' && styles.themeButtonActive,
                  { borderColor: colors.cardBorder },
                  themeMode === 'dark' && { backgroundColor: colors.accentBlue || colors.tint }
                ]}
                onPress={() => handleThemeChange('dark')}
              >
                <Feather 
                  name="moon" 
                  size={20} 
                  color={themeMode === 'dark' ? '#fff' : colors.icon} 
                />
                <Text style={[
                  styles.themeButtonText,
                  { color: themeMode === 'dark' ? '#fff' : colors.text }
                ]}>
                  Dark
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeButton,
                  themeMode === 'auto' && styles.themeButtonActive,
                  { borderColor: colors.cardBorder },
                  themeMode === 'auto' && { backgroundColor: colors.accentBlue || colors.tint }
                ]}
                onPress={() => handleThemeChange('auto')}
              >
                <Feather 
                  name="smartphone" 
                  size={20} 
                  color={themeMode === 'auto' ? '#fff' : colors.icon} 
                />
                <Text style={[
                  styles.themeButtonText,
                  { color: themeMode === 'auto' ? '#fff' : colors.text }
                ]}>
                  Auto
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
          
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="bell" size={20} color={colors.icon} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Push Notifications
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ true: colors.accentBlue || colors.tint, false: isDark ? '#475569' : '#9ca3af' }}
                thumbColor={'#ffffff'}
                ios_backgroundColor={isDark ? '#475569' : '#9ca3af'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="map-pin" size={20} color={colors.icon} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Location Services
                </Text>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={setLocationEnabled}
                trackColor={{ true: colors.accentBlue || colors.tint, false: isDark ? '#475569' : '#9ca3af' }}
                thumbColor={'#ffffff'}
                ios_backgroundColor={isDark ? '#475569' : '#9ca3af'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="refresh-cw" size={20} color={colors.icon} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Auto-Refresh Routes
                </Text>
              </View>
              <Switch
                value={autoRefresh}
                onValueChange={setAutoRefresh}
                trackColor={{ true: colors.accentBlue || colors.tint, false: isDark ? '#475569' : '#9ca3af' }}
                thumbColor={'#ffffff'}
                ios_backgroundColor={isDark ? '#475569' : '#9ca3af'}
              />
            </View>
          </View>
        </View>

        {/* Credits Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Credits</Text>
          
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.creditsSubtitle, { color: colors.secondaryText || colors.icon }]}>
              Developed by
            </Text>

            {/* Ethan Kang */}
            <View style={styles.creditItem}>
              <View style={[styles.avatarPlaceholder, { borderColor: colors.icon }]}>
                <Feather name="user" size={32} color={colors.icon} />
                {/* actual image would go here but only daniel for now :D */}
                {/* <Image 
                  source={require('@/assets/images/ethan-kang.jpg')} 
                  style={styles.avatar}
                /> */}
              </View>
              <View style={styles.creditInfo}>
                <Text style={[styles.creditName, { color: colors.text }]}>
                  Ethan Kang
                </Text>
                <Text style={[styles.creditRole, { color: colors.secondaryText || colors.icon }]}>
                Developer
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            {/* Daniel Kosukhin */}
            <View style={styles.creditItem}>
              <Image 
                source={require('@/assets/images/daniel-kosukhin.jpg')} 
                style={styles.avatar}
              />
              <View style={styles.creditInfo}>
                <Text style={[styles.creditName, { color: colors.text }]}>
                  Daniel Kosukhin
                </Text>
                <Text style={[styles.creditRole, { color: colors.secondaryText || colors.icon }]}>
                  Developer
                </Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  themeButtonActive: {
    borderWidth: 0,
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  creditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  creditInfo: {
    flex: 1,
  },
  creditName: {
    fontSize: 18,
    fontWeight: '600',
  },
  creditRole: {
    fontSize: 14,
    marginTop: 2,
  },
  creditsSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  appInfoText: {
    fontSize: 12,
  },
});

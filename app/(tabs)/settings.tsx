import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { cacheService } from '@/services/cache-service';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);

  const isDark = actualTheme === 'dark';
  const colors = Colors[actualTheme];

  const handleThemeChange = (mode: 'light' | 'dark' | 'auto') => {
    setThemeMode(mode);
  };

  const loadCacheInfo = useCallback(async () => {
    try {
      await cacheService.initialize();
      const age = await cacheService.getCacheAgeInDays();
      setCacheAge(age);
      
      const timestamp = await cacheService.getLastFetchTimestamp();
      if (timestamp) {
        const date = new Date(timestamp);
        setLastRefreshTime(date.toLocaleDateString() + ' ' + date.toLocaleTimeString());
      }
    } catch (error) {
      console.error('Failed to load cache info:', error);
    }
  }, []);

  useEffect(() => {
    loadCacheInfo();
  }, [loadCacheInfo]);

  const handleRefreshData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      await cacheService.fetchAndCacheAllStations();
      await loadCacheInfo();
      
      Alert.alert(
        'Success',
        'Transit data has been updated successfully.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to refresh data:', error);
      Alert.alert(
        'Error',
        'Failed to update transit data. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [loadCacheInfo]);

  const handleClearCache = useCallback(async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data? The app will need to download transit data again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await cacheService.clearAllCache();
              await loadCacheInfo();
              Alert.alert('Success', 'Cache cleared successfully.');
            } catch (error) {
              console.error('Failed to clear cache:', error);
              Alert.alert('Error', 'Failed to clear cache.');
            }
          },
        },
      ]
    );
  }, [loadCacheInfo]);

  return (
    <SafeAreaView 
      edges={['top']} 
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>

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

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data & Storage</Text>
          
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <View style={styles.cacheInfoContainer}>
              <View style={styles.settingInfo}>
                <MaterialCommunityIcons name="database" size={20} color={colors.icon} />
                <View style={styles.cacheTextContainer}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Cached Transit Data
                  </Text>
                  <Text style={[styles.cacheSubtext, { color: colors.secondaryText || colors.icon }]}>
                    {cacheAge === null 
                      ? 'No cached data' 
                      : cacheAge === 0 
                      ? 'Updated today'
                      : `Updated ${cacheAge} day${cacheAge !== 1 ? 's' : ''} ago`}
                  </Text>
                  {lastRefreshTime && (
                    <Text style={[styles.cacheTimestamp, { color: colors.metaText || colors.secondaryText }]}>
                      {lastRefreshTime}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={handleRefreshData}
              disabled={isRefreshing}>
              <View style={styles.settingInfo}>
                <Feather name="download" size={20} color={isRefreshing ? colors.secondaryText : colors.icon} />
                <Text style={[styles.settingLabel, { color: isRefreshing ? colors.secondaryText : colors.text }]}>
                  Update Transit Data
                </Text>
              </View>
              {isRefreshing ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Feather name="chevron-right" size={20} color={colors.icon} />
              )}
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={handleClearCache}>
              <View style={styles.settingInfo}>
                <Feather name="trash-2" size={20} color="#ef4444" />
                <Text style={[styles.settingLabel, { color: '#ef4444' }]}>
                  Clear Cache
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#ef4444" />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            <View style={styles.cacheNoteContainer}>
              <MaterialCommunityIcons name="information" size={16} color={colors.secondaryText} />
              <Text style={[styles.cacheNote, { color: colors.secondaryText }]}>
                Data automatically updates every 30 days. Manual updates ensure you have the latest station information.
              </Text>
            </View>
          </View>
        </View>

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

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Credits</Text>
          
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.creditsSubtitle, { color: colors.secondaryText || colors.icon }]}>
              Developed by
            </Text>

            <View style={styles.creditItem}>
              <Image 
                source={require('@/assets/images/ethan-kang.png')} 
                style={styles.avatar}
              />
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
  cacheInfoContainer: {
    paddingVertical: 8,
  },
  cacheTextContainer: {
    flex: 1,
    gap: 4,
  },
  cacheSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  cacheTimestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  cacheNoteContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cacheNote: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});

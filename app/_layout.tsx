import { SelectedRouteProvider } from '@/contexts/selected-route-context';
import { ThemeProvider as CustomThemeProvider, useTheme } from '@/contexts/theme-context';
import { useCacheManager } from '@/hooks/use-cache-manager';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const { actualTheme } = useTheme();
  useCacheManager();
  const [hideWebBanner, setHideWebBanner] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') {
          const v = window.localStorage.getItem('webSupportBannerDismissed');
          if (v === 'true') setHideWebBanner(true);
        }
      } catch (e) {}
    }
  }, []);

  const dismiss = () => {
    setHideWebBanner(true);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('webSupportBannerDismissed', 'true');
      }
    } catch (e) {}
  };

  return (
    <SelectedRouteProvider>
      <ThemeProvider value={actualTheme === 'dark' ? DarkTheme : DefaultTheme}>
        {Platform.OS === 'web' && !hideWebBanner && (
          <View
            style={{
              width: '100%',
              paddingVertical: 10,
              paddingHorizontal: 12,
              backgroundColor: actualTheme === 'dark' ? '#111827' : '#FFF7ED',
              borderBottomWidth: 1,
              borderBottomColor: actualTheme === 'dark' ? '#374151' : '#FBD38D',
            }}
          >
            <Text
              style={{
                color: actualTheme === 'dark' ? '#F3F4F6' : '#1F2937',
                fontSize: 14,
              }}
            >
              This web preview is experimental. Some features may be broken or missing compared to mobile.
            </Text>
            <Pressable onPress={dismiss} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <Text style={{ color: actualTheme === 'dark' ? '#93C5FD' : '#2563EB', fontWeight: '600' }}>Dismiss</Text>
            </Pressable>
          </View>
        )}
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style={actualTheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </SelectedRouteProvider>
  );
}

export default function RootLayout() {
  return (
    <CustomThemeProvider>
      <RootLayoutContent />
    </CustomThemeProvider>
  );
}


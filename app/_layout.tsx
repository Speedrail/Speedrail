import { SelectedRouteProvider } from '@/contexts/selected-route-context';
import { ThemeProvider as CustomThemeProvider, useTheme } from '@/contexts/theme-context';
import { useCacheManager } from '@/hooks/use-cache-manager';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const { actualTheme } = useTheme();
  useCacheManager();

  return (
    <SelectedRouteProvider>
      <ThemeProvider value={actualTheme === 'dark' ? DarkTheme : DefaultTheme}>
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

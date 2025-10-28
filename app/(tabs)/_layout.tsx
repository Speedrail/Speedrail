import TabBar from '@/components/tab-bar';
import { Colors } from '@/constants/theme';
import { TabBarProvider } from '@/contexts/tab-bar-context';
import { useTheme } from '@/contexts/theme-context';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { actualTheme } = useTheme();

  return (
    <SafeAreaProvider>
      <TabBarProvider>
        <View style={{ flex: 1 }}>
          <Tabs
            tabBar={(props: any) => <TabBar {...props} />}
            screenOptions={{
              tabBarActiveTintColor: Colors[actualTheme].tint,
              headerShown: false,
            }}>
            <Tabs.Screen
              name="index"
              options={{
                title: 'Home',
              }}
            />
            <Tabs.Screen
              name="tickets"
              options={{
                title: 'Tickets',
              }}
            />
            <Tabs.Screen
              name="navigation"
              options={{
                title: 'Navigation',
              }}
            />
            <Tabs.Screen
              name="notifications"
              options={{
                title: 'Alerts',
              }}
            />
            <Tabs.Screen
              name="settings"
              options={{
                title: 'Settings',
              }}
            />
          </Tabs>
        </View>
      </TabBarProvider>
    </SafeAreaProvider>
  );
}

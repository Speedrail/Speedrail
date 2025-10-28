import TabBar from '@/components/tab-bar';
import { Colors } from '@/constants/theme';
import { TabBarProvider } from '@/contexts/tab-bar-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <TabBarProvider>
        <View style={{ flex: 1 }}>
          <Tabs
            tabBar={(props: any) => <TabBar {...props} />}
            screenOptions={{
              tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
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
          </Tabs>
        </View>
      </TabBarProvider>
    </SafeAreaProvider>
  );
}

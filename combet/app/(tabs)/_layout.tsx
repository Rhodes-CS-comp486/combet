import { Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen // home page starts here
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({color }) =>
              <IconSymbol size={28} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="community" // community page
        options={{
          title: 'Community',
          tabBarIcon: ({color }) =>
              <IconSymbol size={24} name="people-alt" color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-bet" // add-bet page starts here
        options={{
            title: 'Bet',
            tabBarIcon: ({ color }) =>
                <IconSymbol size={28}  name="add-circle" color={color} />,
      }}
    />
      <Tabs.Screen
          name="circles" // circles page starts here
          options={{
            title: 'Circles',
            tabBarIcon: ({ color }) =>
                <IconSymbol size={28} name="360" color={color} />,
         }}
      />
      <Tabs.Screen // profile page starts here
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) =>
              <IconSymbol size={28} name="person" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
            title: 'Inbox',
            href: null,
            //tabBarButton: () => null, // hides it from tab bar, but removed because href conflict
            headerShown: false,
        }}
      />
    </Tabs>
  );
}

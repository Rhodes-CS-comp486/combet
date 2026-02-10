import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          tabBarInactiveTintColor: '#9e9e9e',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            height: 70,
            paddingBottom: 8,
            paddingTop: 8,
              backgroundColor: '#0f223a',
              borderTopWidth: 0,
              shadowColor: 'transparent',
              elevation: 0,
              //borderTopColor: 'rgba(255,255,255,0.15)',



        },

      }}>
      <Tabs.Screen // home page starts here
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({color }) =>
              <Ionicons size={28} name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="community" // community page
        options={{
          title: 'Community',
          tabBarIcon: ({color }) =>
              <Ionicons size={24} name="globe-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-bet" // add-bet page starts here
        options={{
            title: 'Bet',
            tabBarIcon: ({ color }) =>
                <Ionicons size={28}  name="add-circle" color={color} />,
      }}
    />
      <Tabs.Screen
          name="circles" // circles page starts here
          options={{
            title: 'Circles',
            tabBarIcon: ({ color }) =>
                <Ionicons size={28} name="people-circle" color={color} />,
         }}
      />
      <Tabs.Screen // profile page starts here
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) =>
              <Ionicons size={28} name="person" color={color} />,
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

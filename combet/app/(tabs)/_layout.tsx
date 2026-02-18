import { Tabs, Stack } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: "#9e9e9e",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: "#0f223a",
          borderTopWidth: 0,
          shadowColor: "transparent",
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color }) => (
            <Ionicons name="globe-outline" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="add-bet"
        options={{
          title: "Bet",
          tabBarIcon: ({ color }) => (
            <Ionicons name="add-circle" size={28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="circles"
        options={{
          title: "Circles",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-circle" size={28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={28} color={color} />
          ),
        }}
      />

        <Tabs.Screen
            name="inbox"
            options={{
            href: null,              // ⬅️ THIS removes it from the tab bar
            headerShown: false,
        }}
        />
    </Tabs>
  );
}




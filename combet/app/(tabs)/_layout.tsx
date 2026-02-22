import {Tabs, Stack, Redirect, router} from "expo-router";
import React , { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { getSessionId } from "@/components/sessionStore";


import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import {TouchableOpacity, View} from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    (async () => {
      const sessionId = await getSessionId();

      setHasSession(!!sessionId);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  // If not logged in, force user to login
  if (!hasSession) return <Redirect href="/login" />;

  return (
  <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: "#9e9e9e",
        headerShown: false,
        tabBarButton: HapticTab,

          tabBarItemStyle: {
              flex: 1,

          },

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
            tabBarItemStyle: {
              marginRight: 30,
            },
          tabBarIcon: ({ color }) => (
            <Ionicons name="globe-outline" size={24} color={color} />
          ),
        }}
      />


      <Tabs.Screen
        name="circles"
        options={{
          title: "Circles",
            tabBarItemStyle:{
              marginLeft: 30
            },
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

         <Tabs.Screen
            name="add-bet"
            options={{
            href: null,              // ⬅️ THIS removes it from the tab bar
            headerShown: false,
        }}
        />

        <Tabs.Screen
            name="circle-profile/[id]/index"
            options={{
            href: null,              // ⬅️ THIS removes it from the tab bar
            headerShown: false,
        }}
        />
        <Tabs.Screen
            name="circle-profile/[id]/edit"
            options={{
            href: null,              // ⬅️ THIS removes it from the tab bar
            headerShown: false,
        }}
        />

    </Tabs>

    {/* Floating Bet Button */}
    <TouchableOpacity
      onPress={() => router.push("/add-bet")}
      style={{
        position: "absolute",
        bottom: 35,
        alignSelf: "center",
        width: 65,
        height: 65,
        borderRadius: 32.5,
        backgroundColor: "#1DA1F2",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
      }}
    >
      <Ionicons name="add" size={32} color="white" />
    </TouchableOpacity>
  </View>
  );
}




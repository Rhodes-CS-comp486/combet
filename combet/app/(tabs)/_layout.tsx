import { Tabs, Redirect, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { HapticTab } from "@/components/haptic-tab";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";

export default function TabLayout() {
  const { theme, isDark } = useAppTheme();

  const [loading, setLoading]     = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    (async () => {
      const sessionId = await getSessionId();
      setHasSession(!!sessionId);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;
  if (!hasSession) return <Redirect href="/login" />;

  // Tab bar background — slightly lighter than page background
  const tabBarBg = isDark ? "#0F223A" : "#ffffff";

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown:             false,
          tabBarButton:            HapticTab,
          tabBarActiveTintColor:   theme.colors.primary,
          tabBarInactiveTintColor: isDark ? "#6b7f99" : "#9e9e9e",
          tabBarItemStyle:         { flex: 1 },
          tabBarStyle: {
            height:          70,
            paddingBottom:   8,
            paddingTop:      8,
            backgroundColor: tabBarBg,
            borderTopWidth:  isDark ? 0 : 1,
            borderTopColor:  isDark ? "transparent" : "rgba(0,0,0,0.08)",
            shadowColor:     "transparent",
            elevation:       0,
          },
        }}
      >
        {/* ── Visible tabs ───────────────────────────────────────────── */}
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
            tabBarItemStyle: { marginRight: 30 },
            tabBarIcon: ({ color }) => (
              <Ionicons name="globe-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Centre gap for FAB */}
        <Tabs.Screen
          name="circles"
          options={{
            title: "Circles",
            tabBarItemStyle: { marginLeft: 30 },
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

        {/* ── Hidden screens (no tab button) ─────────────────────────── */}
        <Tabs.Screen name="inbox"                          options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="add-bet"                        options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="circle-profile/[id]/index"      options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="circle-profile/[id]/edit"       options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="circle-profile/[id]/members"    options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="circle-profile/[id]/add-friend" options={{ href: null, headerShown: false }} />

      </Tabs>

      {/* ── Floating Bet Button ─────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => router.push("/add-bet")}
        style={{
          position:        "absolute",
          bottom:          35,
          alignSelf:       "center",
          width:           65,
          height:          65,
          borderRadius:    32.5,
          backgroundColor: theme.colors.primary,
          justifyContent:  "center",
          alignItems:      "center",
          shadowColor:     theme.colors.primary,
          shadowOpacity:   0.5,
          shadowRadius:    12,
          shadowOffset:    { width: 0, height: 4 },
          elevation:       8,
        }}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}
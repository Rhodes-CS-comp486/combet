import { Tabs, Redirect, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HapticTab } from "@/components/haptic-tab";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";

import { LinearGradient } from "expo-linear-gradient";


export default function TabLayout() {
  const { theme, isDark } = useAppTheme();

  const [loading, setLoading]       = useState(true);
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

  const tabBarBg = "transparent";

  return (
      <LinearGradient
          colors={["#2c5364", "#1a3040", "#141f2d"]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          locations={[0, 0.45, 1]}
          style={{ flex: 1 }}
        >
      <Tabs
        screenOptions={{
          headerShown:             false,
          tabBarButton:            HapticTab,
          tabBarActiveTintColor:   theme.colors.primary,
          tabBarInactiveTintColor: isDark ? "#6b7f99" : "#9e9e9e",
          tabBarItemStyle:         { flex: 1 },
            //@ts-ignore
            sceneContainerStyle: { backgroundColor: "transparent"},
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
          name="circles"
          options={{
            title: "Circles",
            tabBarItemStyle: { marginRight: 30 },
            tabBarIcon: ({ color }) => (
              <Ionicons name="people-circle" size={28} color={color} />
            ),
          }}
        />

        {/* Centre gap for FAB */}
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: "Leaderboard",
            tabBarItemStyle: { marginLeft: 30 },
            tabBarIcon: ({ color }) => (
              <Ionicons name="trophy-outline" size={24} color={color} />
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
        <Tabs.Screen name="circle-profile/[id]/inbox"      options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="settings"                       options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="admin/view_users"               options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="admin/view_bets"                options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="admin/view_circles"             options={{ href: null, headerShown: false }} />

      </Tabs>

         {/* ── Tab bar divider line ── */}
        <View style={{
          position: "absolute",
          bottom: 70,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(255,255,255,0.1)",
        }} />

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
          backgroundColor: "#2c4a5e",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
          justifyContent:  "center",
          alignItems:      "center",
          elevation:       8,
        }}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </LinearGradient>
  );
}
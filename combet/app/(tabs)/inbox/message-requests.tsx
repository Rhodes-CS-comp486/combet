import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";

export default function MessageRequestsScreen() {
  const { theme, isDark } = useAppTheme();

  return (
    <GradientBackground>
      {/* ── Header ── */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "300", letterSpacing: 2, color: theme.colors.onSurface }}>
          Message requests
        </Text>
      </View>

      {/* ── Body — placeholder until DM backend is built ── */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Ionicons
          name="mail-open-outline"
          size={52}
          color={theme.colors.onSurfaceVariant}
          style={{ marginBottom: 14 }}
        />
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
          No message requests
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 8, lineHeight: 20 }}
        >
          Messages from people you don't follow will appear here
        </Text>
      </View>
    </GradientBackground>
  );
}
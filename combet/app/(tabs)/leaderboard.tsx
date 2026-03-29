import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import { Ionicons } from "@expo/vector-icons";

export default function LeaderboardScreen() {
  const { theme } = useAppTheme();

  return (
    <GradientBackground style={{ paddingHorizontal: 20, paddingTop: 12 }}>
      <Text style={{
        color: theme.colors.onSurface,
        fontSize: 28,
        fontWeight: "300",
        letterSpacing: 0.5,
        marginBottom: 28,
        marginTop: 8,
      }}>
        Leaderboard
      </Text>

      <View style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 100,
      }}>
        <Ionicons name="trophy-outline" size={48} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 16 }} />
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}>
          Leaderboard implementation coming soon!
        </Text>
      </View>
    </GradientBackground>
  );
}
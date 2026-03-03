import React from "react";
import { Alert, Platform } from "react-native";
import { Surface, Text, Button, Switch, Divider, List } from "react-native-paper";
import { router } from "expo-router";
import { deleteSessionId, getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";

const API_URL = "http://localhost:3001";

export default function ProfileScreen() {
  const { isDark, toggleTheme, theme } = useAppTheme();

  const doLogout = async () => {
    try {
      const sessionId = await getSessionId();
      if (sessionId) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { "x-session-id": sessionId },
        });
      }
      await deleteSessionId();
      router.replace("/login");
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  const onLogout = () => {
    if (Platform.OS === "web") {
      const ok = window.confirm("Are you sure you want to logout?");
      if (ok) void doLogout();
      return;
    }
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => void doLogout() },
    ]);
  };

  return (
    <Surface
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 20,
      }}
    >
      {/* ── Appearance section ── */}
      <Text
        variant="titleMedium"
        style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 16 }}
      >
        Appearance
      </Text>

      <Surface
        elevation={1}
        style={{
          borderRadius: 12,
          backgroundColor: theme.colors.surface,
          marginBottom: 24,
        }}
      >
        <List.Item
          title="Dark Mode"
          titleStyle={{ color: theme.colors.onSurface }}
          description={isDark ? "On" : "Off"}
          descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
          left={(props) => (
            <List.Icon
              {...props}
              icon={isDark ? "weather-night" : "weather-sunny"}
              color={theme.colors.primary}
            />
          )}
          right={() => (
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              color={theme.colors.primary}
            />
          )}
        />
      </Surface>

      <Divider style={{ backgroundColor: theme.colors.outline, marginBottom: 24 }} />

      {/* ── Account section ── */}
      <Text
        variant="titleMedium"
        style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}
      >
        Account
      </Text>

      <Surface
        elevation={1}
        style={{
          borderRadius: 12,
          backgroundColor: theme.colors.surface,
        }}
      >
        <List.Item
          title="Logout"
          titleStyle={{ color: theme.colors.error }}
          left={(props) => (
            <List.Icon {...props} icon="logout" color={theme.colors.error} />
          )}
          onPress={onLogout}
        />
      </Surface>
    </Surface>
  );
}
import React, { useState } from "react";
import { Alert, Platform, ScrollView, View, StyleSheet } from "react-native";
import {
  Surface,
  Text,
  Switch,
  Divider,
  List,
  Button,
  Portal,
  Modal,
  TextInput,
  HelperText,
} from "react-native-paper";
import { router } from "expo-router";
import { deleteSessionId, getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import { API_BASE } from "@/constants/api";



export default function SettingsScreen() {
  const { isDark, toggleTheme, theme } = useAppTheme();

  const [pwVisible, setPwVisible] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const savePassword = async () => {
    setPwError("");
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: {
          "x-session-id": sessionId ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      if (!res.ok) {
        const err = await res.json();
        setPwError(err.message || "Incorrect current password.");
        return;
      }
      setPwVisible(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      Alert.alert("Success", "Password updated successfully.");
    } catch (e) {
      setPwError("Something went wrong. Please try again.");
    } finally {
      setPwSaving(false);
    }
  };

  const doLogout = async () => {
    try {
      const sessionId = await getSessionId();
      if (sessionId) {
        await fetch(`${API_BASE}/auth/logout`, {
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
      if (window.confirm("Are you sure you want to logout?")) void doLogout();
      return;
    }
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => void doLogout() },
    ]);
  };

  const s = styles(theme);

  return (
    <Surface style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Appearance ── */}
        <Text variant="titleMedium" style={s.sectionLabel}>Appearance</Text>
        <Surface elevation={1} style={s.card}>
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
              <Switch value={isDark} onValueChange={toggleTheme} color={theme.colors.primary} />
            )}
          />
        </Surface>

        <Divider style={s.divider} />

        {/* ── Settings ── */}
        <Text variant="titleMedium" style={s.sectionLabel}>Settings</Text>
        <Surface elevation={1} style={s.card}>
          <List.Item
            title="Change Password"
            titleStyle={{ color: theme.colors.onSurface }}
            left={(props) => <List.Icon {...props} icon="lock-reset" color={theme.colors.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
            onPress={() => setPwVisible(true)}
          />
          <Divider style={{ backgroundColor: theme.colors.outline }} />
          <List.Item
            title="Notifications"
            titleStyle={{ color: theme.colors.onSurface }}
            left={(props) => <List.Icon {...props} icon="bell-outline" color={theme.colors.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
            onPress={() => Alert.alert("Coming Soon", "Notification settings coming soon.")}
          />
          <Divider style={{ backgroundColor: theme.colors.outline }} />
          <List.Item
            title="Privacy & Security"
            titleStyle={{ color: theme.colors.onSurface }}
            left={(props) => <List.Icon {...props} icon="shield-account" color={theme.colors.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
            onPress={() => Alert.alert("Coming Soon", "Privacy settings coming soon.")}
          />
        </Surface>

        <Divider style={s.divider} />

        {/* ── Account ── */}
        <Text variant="titleMedium" style={s.sectionLabel}>Account</Text>
        <Surface elevation={1} style={s.card}>
          <List.Item
            title="Logout"
            titleStyle={{ color: theme.colors.error }}
            left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
            onPress={onLogout}
          />
        </Surface>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Portal>
        <Modal
          visible={pwVisible}
          onDismiss={() => { setPwVisible(false); setPwError(""); }}
          contentContainerStyle={[s.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={[s.modalTitle, { color: theme.colors.onSurface }]}>
            Change Password
          </Text>
          <TextInput
            label="Current Password"
            value={currentPw}
            onChangeText={setCurrentPw}
            secureTextEntry
            mode="outlined"
            style={s.input}
            theme={{ colors: { primary: theme.colors.primary } }}
          />
          <TextInput
            label="New Password"
            value={newPw}
            onChangeText={setNewPw}
            secureTextEntry
            mode="outlined"
            style={s.input}
            theme={{ colors: { primary: theme.colors.primary } }}
          />
          <TextInput
            label="Confirm New Password"
            value={confirmPw}
            onChangeText={setConfirmPw}
            secureTextEntry
            mode="outlined"
            style={s.input}
            theme={{ colors: { primary: theme.colors.primary } }}
          />
          {pwError ? <HelperText type="error">{pwError}</HelperText> : null}
          <View style={s.modalActions}>
            <Button onPress={() => { setPwVisible(false); setPwError(""); }} textColor={theme.colors.onSurfaceVariant}>
              Cancel
            </Button>
            <Button mode="contained" onPress={savePassword} loading={pwSaving} disabled={pwSaving}>
              Update
            </Button>
          </View>
        </Modal>
      </Portal>
    </Surface>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { padding: 20 },
    sectionLabel: { color: theme.colors.onSurfaceVariant, marginBottom: 8 },
    card: { borderRadius: 12, backgroundColor: theme.colors.surface, overflow: "hidden" },
    divider: { backgroundColor: theme.colors.outline, marginVertical: 20 },
    modal: { margin: 24, borderRadius: 16, padding: 24 },
    modalTitle: { fontWeight: "700", marginBottom: 16 },
    input: { marginBottom: 12, backgroundColor: "transparent" },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  });
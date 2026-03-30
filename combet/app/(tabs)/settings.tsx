import React, { useState, useEffect } from "react";
import { Alert, Platform, ScrollView, View, StyleSheet } from "react-native";
import {
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
import GradientBackground from "@/components/GradientBackground";
import BackHeader from "@/components/Backheader";

export default function SettingsScreen() {
  const { isDark, toggleTheme, theme } = useAppTheme();

  const [pwVisible, setPwVisible] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError]     = useState("");
  const [pwSaving, setPwSaving]   = useState(false);

  // ── Private account toggle ─────────────────────────────────────────────────
  const [isPrivate, setIsPrivate]       = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);

  // Load current privacy setting on mount
  useEffect(() => {
    const fetchPrivacy = async () => {
      try {
        const sessionId = await getSessionId();
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { "x-session-id": sessionId ?? "" },
        });
        if (res.ok) {
          const data = await res.json();
          setIsPrivate(data.is_private ?? false);
        }
      } catch (e) {
        console.error("Failed to fetch privacy setting:", e);
      }
    };
    fetchPrivacy();
  }, []);

  const togglePrivacy = async (value: boolean) => {
    setIsPrivate(value);
    setPrivacySaving(true);
    try {
      const sessionId = await getSessionId();

      // Fetch current profile first so we don't overwrite avatar/name with defaults
      const profileRes = await fetch(`${API_BASE}/users/me`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (!profileRes.ok) throw new Error("Could not fetch profile");
      const profile = await profileRes.json();

      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: { "x-session-id": sessionId ?? "", "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: profile.display_name || profile.username,
          bio:          profile.bio ?? "",
          avatar_color: profile.avatar_color,
          avatar_icon:  profile.avatar_icon,
          is_private:   value,
        }),
      });
      if (!res.ok) {
        setIsPrivate(!value);
        Alert.alert("Error", "Could not update privacy setting.");
      }
    } catch (e) {
      setIsPrivate(!value);
      Alert.alert("Error", "Could not update privacy setting.");
    } finally {
      setPrivacySaving(false);
    }
  };

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
    <GradientBackground style={{ paddingHorizontal: 20, paddingTop: 12 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <BackHeader label="Profile" href="/(tabs)/profile" />
        <Text style={{ color: theme.colors.onSurface, fontSize: 28, fontWeight: "300", letterSpacing: 0.5, marginBottom: 28, marginTop: 8 }}>
          Settings
        </Text>

        {/* ── Account Settings ── */}
        <Text style={[s.sectionLabel, { fontSize: 13, fontWeight: "500", letterSpacing: 1, textTransform: "uppercase" }]}>
          Settings
        </Text>
        <View style={s.card}>
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

          {/* ── Private Account Toggle ── */}
          <List.Item
            title="Private Account"
            description={isPrivate
              ? "Only approved followers can follow you"
              : "Anyone can follow you"}
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
            left={(props) => (
              <List.Icon
                {...props}
                icon={isPrivate ? "lock" : "lock-open-outline"}
                color={theme.colors.primary}
              />
            )}
            right={() => (
              <Switch
                value={isPrivate}
                onValueChange={togglePrivacy}
                disabled={privacySaving}
                color={theme.colors.primary}
              />
            )}
          />

          <Divider style={{ backgroundColor: theme.colors.outline }} />
          <List.Item
            title="Privacy & Security"
            titleStyle={{ color: theme.colors.onSurface }}
            left={(props) => <List.Icon {...props} icon="shield-account" color={theme.colors.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
            onPress={() => Alert.alert("Coming Soon", "Privacy settings coming soon.")}
          />
        </View>

        <Divider style={s.divider} />

        {/* ── Account ── */}
        <Text style={[s.sectionLabel, { fontSize: 13, fontWeight: "500", letterSpacing: 1, textTransform: "uppercase" }]}>
          Account
        </Text>
        <View style={s.card}>
          <List.Item
            title="Logout"
            titleStyle={{ color: theme.colors.error }}
            left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
            onPress={onLogout}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Portal>
        <Modal
          visible={pwVisible}
          onDismiss={() => { setPwVisible(false); setPwError(""); }}
          contentContainerStyle={[s.modal, { backgroundColor: "#1a3040" }]}
        >
          <Text variant="titleLarge" style={[s.modalTitle, { color: theme.colors.onSurface }]}>
            Change Password
          </Text>
          <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12 }}>
            <TextInput
              label="Current Password"
              value={currentPw}
              onChangeText={setCurrentPw}
              secureTextEntry
              mode="flat"
              style={{ backgroundColor: "transparent" }}
              underlineColor="transparent"
              activeUnderlineColor={theme.colors.primary}
              theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
            />
          </View>
          <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12 }}>
            <TextInput
              label="New Password"
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry
              mode="flat"
              style={{ backgroundColor: "transparent" }}
              underlineColor="transparent"
              activeUnderlineColor={theme.colors.primary}
              theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
            />
          </View>
          <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12 }}>
            <TextInput
              label="Confirm New Password"
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry
              mode="flat"
              style={{ backgroundColor: "transparent" }}
              underlineColor="transparent"
              activeUnderlineColor={theme.colors.primary}
              theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
            />
          </View>
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
    </GradientBackground>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    root:         { flex: 1 },
    sectionLabel: { color: theme.colors.onSurfaceVariant, marginBottom: 8 },
    scroll:       { paddingBottom: 40, paddingTop: 12 },
    card:         { borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
    divider:      { backgroundColor: theme.colors.outline, marginVertical: 20 },
    modal:        { margin: 24, borderRadius: 16, padding: 24 },
    modalTitle:   { fontWeight: "700", marginBottom: 16 },
    input:        { marginBottom: 0, backgroundColor: "transparent" },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  });
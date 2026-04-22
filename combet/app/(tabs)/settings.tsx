import React, { useState, useEffect } from "react";
import { Alert, Platform, ScrollView, View, StyleSheet } from "react-native";
import {
  Text, Switch, Divider, List, Button, Portal, Modal, TextInput, HelperText,
} from "react-native-paper";
import { router } from "expo-router";
import { deleteSessionId, getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import { API_BASE } from "@/constants/api";
import GradientBackground from "@/components/GradientBackground";
import PageHeader from "@/components/PageHeader";
import ConfirmModal from "@/components/Confirmmodal";

export default function SettingsScreen() {
  const { isDark, toggleTheme, theme } = useAppTheme();

  const [pwVisible, setPwVisible] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError]     = useState("");
  const [pwSaving, setPwSaving]   = useState(false);

  const [isPrivate, setIsPrivate]         = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
    if (newPw !== confirmPw) { setPwError("New passwords do not match."); return; }
    setPwSaving(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: { "x-session-id": sessionId ?? "", "Content-Type": "application/json" },
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

  const onLogout = () => setShowLogoutModal(true);

  const doDeleteAccount = async () => {
  try {
    const sessionId = await getSessionId();
    const res = await fetch(`${API_BASE}/users/me`, {
      method: "DELETE",
      headers: { "x-session-id": sessionId ?? "" },
    });
    if (!res.ok) throw new Error();
    await deleteSessionId();
    router.replace("/login");
  } catch {
    Alert.alert("Error", "Could not delete account. Please try again.");
  }
};

const onDeleteAccount = () => setShowDeleteModal(true);

  const s = styles(theme);

  return (
    <GradientBackground style={{ paddingHorizontal: 20 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PageHeader title="Settings" onBack={() => router.replace("/(tabs)/profile")} />

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
            onPress={() => router.push("/user/notification-preferences")}
          />
          <Divider style={{ backgroundColor: theme.colors.outline }} />
          <List.Item
            title="Private Account"
            description={isPrivate ? "Only approved followers can follow you" : "Anyone can follow you"}
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
            left={(props) => (
              <List.Icon {...props} icon={isPrivate ? "lock" : "lock-open-outline"} color={theme.colors.primary} />
            )}
            right={() => (
              <Switch value={isPrivate} onValueChange={togglePrivacy} disabled={privacySaving} color={theme.colors.primary} />
            )}
          />
          <Divider style={{ backgroundColor: theme.colors.outline }} />
          <List.Item
            title="Privacy & Security"
            titleStyle={{ color: theme.colors.onSurface }}
            left={(props) => <List.Icon {...props} icon="shield-account" color={theme.colors.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
            onPress={() => router.push("/privacy-security")}          />
        </View>

        <Divider style={s.divider} />

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
          <Divider style={{ backgroundColor: theme.colors.outline }} />
          <List.Item
              title="Delete Account"
              titleStyle={{ color: theme.colors.error }}
              left={(props) => <List.Icon {...props} icon="delete-forever" color={theme.colors.error} />}
              onPress={onDeleteAccount}
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
              label="Current Password" value={currentPw} onChangeText={setCurrentPw} secureTextEntry
              mode="flat" style={{ backgroundColor: "transparent" }} underlineColor="transparent"
              activeUnderlineColor={theme.colors.primary}
              theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
            />
          </View>
          <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12 }}>
            <TextInput
              label="New Password" value={newPw} onChangeText={setNewPw} secureTextEntry
              mode="flat" style={{ backgroundColor: "transparent" }} underlineColor="transparent"
              activeUnderlineColor={theme.colors.primary}
              theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
            />
          </View>
          <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12 }}>
            <TextInput
              label="Confirm New Password" value={confirmPw} onChangeText={setConfirmPw} secureTextEntry
              mode="flat" style={{ backgroundColor: "transparent" }} underlineColor="transparent"
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
        <ConfirmModal
          visible={showDeleteModal}
          icon="trash-outline"
          title="Delete account?"
          message="This will permanently delete your account and all your data. This cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={() => { setShowDeleteModal(false); void doDeleteAccount(); }}
          onCancel={() => setShowDeleteModal(false)}
        />
        <ConfirmModal
          visible={showLogoutModal}
          icon="exit-outline"
          title="Log out?"
          message="You'll need to log back in to access your account."
          confirmLabel="Logout"
          destructive
          onConfirm={() => { setShowLogoutModal(false); void doLogout(); }}
          onCancel={() => setShowLogoutModal(false)}
        />
    </GradientBackground>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    root:         { flex: 1 },
    sectionLabel: { color: theme.colors.onSurfaceVariant, marginBottom: 8 },
    scroll:       { paddingBottom: 40 },
    card:         { borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
    divider:      { backgroundColor: theme.colors.outline, marginVertical: 20 },
    modal:        { margin: 24, borderRadius: 16, padding: 24 },
    modalTitle:   { fontWeight: "700", marginBottom: 16 },
    input:        { marginBottom: 0, backgroundColor: "transparent" },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  });
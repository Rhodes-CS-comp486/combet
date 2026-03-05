import React, { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, View, StyleSheet, TouchableOpacity } from "react-native";
import {
  Surface,
  Text,
  Button,
  Switch,
  Divider,
  List,
  Avatar,
  ActivityIndicator,
  Portal,
  Modal,
  TextInput,
  HelperText,
} from "react-native-paper";
import { router } from "expo-router";
import { deleteSessionId, getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";

const API_URL = "http://localhost:3001";

type UserProfile = {
  id: number;
  username: string;
  display_name?: string;
  email: string;
  bio?: string;
  wins?: number;
  losses?: number;
  total_bets?: number;
  followers_count?: number;
  following_count?: number;
};

type BetHistory = {
  id: number;
  title: string;
  result: "won" | "lost" | "pending";
  created_at: string;
};

export default function ProfileScreen() {
  const { isDark, toggleTheme, theme } = useAppTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bets, setBets] = useState<BetHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowed, setIsFollowed] = useState(false);
  const [betsVisible, setBetsVisible] = useState(false);

  // Edit profile modal
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Change password modal
  const [pwVisible, setPwVisible] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // ── Fetch profile ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const sessionId = await getSessionId();
        if (!sessionId) {
          router.replace("/login");
          return;
        }
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { "x-session-id": sessionId },
        });
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setProfile(data);
        setEditName(data.display_name || data.username);
        setEditBio(data.bio || "");
      } catch (e) {
        console.error("Profile fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ── Fetch bet history (only if followed) ────────────────────────────────
  const fetchBets = async () => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_URL}/bets/my-history`, {
        headers: { "x-session-id": sessionId },
      });
      if (!res.ok) return;
      const data = await res.json();
      setBets(data);
    } catch (e) {
      console.error("Bet history fetch error:", e);
    }
  };

  const handleViewBets = () => {
    if (!isFollowed) {
      Alert.alert("Private", "You need to follow this user to see their bet history.");
      return;
    }
    fetchBets();
    setBetsVisible(true);
  };

  // ── Save profile edits ───────────────────────────────────────────────────
  const saveProfile = async () => {
    setEditSaving(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: {
          "x-session-id": sessionId ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ display_name: editName, bio: editBio }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setProfile(updated);
      setEditVisible(false);
    } catch (e) {
      Alert.alert("Error", "Could not save profile. Please try again.");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────────────
  const savePassword = async () => {
    setPwError("");
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_URL}/auth/change-password`, {
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

  // ── Logout ───────────────────────────────────────────────────────────────
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
      if (window.confirm("Are you sure you want to logout?")) void doLogout();
      return;
    }
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => void doLogout() },
    ]);
  };

  const s = styles(theme);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Surface style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </Surface>
    );
  }

  const displayName = profile?.display_name || profile?.username || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Surface style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Profile header ── */}
        <View style={s.header}>
          <Avatar.Text
            size={80}
            label={initials}
            style={{ backgroundColor: theme.colors.primary }}
            labelStyle={{ color: "#fff", fontSize: 28, fontWeight: "700" }}
          />
          <Text variant="headlineSmall" style={s.displayName}>{displayName}</Text>
          <Text variant="bodyMedium" style={s.username}>@{profile?.username}</Text>

          {/* Followers / Following — subtle, under username */}
          <View style={s.followRow}>
            <TouchableOpacity style={s.followItem}>
              <Text variant="bodyMedium" style={s.followCount}>
                {profile?.followers_count ?? 0}
              </Text>
              <Text variant="bodySmall" style={s.followLabel}> Followers</Text>
            </TouchableOpacity>
            <View style={s.followDot} />
            <TouchableOpacity style={s.followItem}>
              <Text variant="bodyMedium" style={s.followCount}>
                {profile?.following_count ?? 0}
              </Text>
              <Text variant="bodySmall" style={s.followLabel}> Following</Text>
            </TouchableOpacity>
          </View>

          {/* Bio */}
          {profile?.bio ? (
            <Text variant="bodySmall" style={s.bio}>{profile.bio}</Text>
          ) : null}

          {/* Bet stats row — the hero */}
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text variant="titleLarge" style={s.statNum}>{profile?.total_bets ?? 0}</Text>
              <Text variant="labelSmall" style={s.statLabel}>Bets</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text variant="titleLarge" style={[s.statNum, { color: "#4CAF50" }]}>{profile?.wins ?? 0}</Text>
              <Text variant="labelSmall" style={s.statLabel}>Wins</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text variant="titleLarge" style={[s.statNum, { color: theme.colors.error }]}>{profile?.losses ?? 0}</Text>
              <Text variant="labelSmall" style={s.statLabel}>Losses</Text>
            </View>
          </View>

          <Button
            mode="outlined"
            onPress={() => setEditVisible(true)}
            style={s.editBtn}
            textColor={theme.colors.primary}
          >
            Edit Profile
          </Button>
        </View>

        <Divider style={s.divider} />

        {/* ── Activity ── */}
        <Text variant="titleMedium" style={s.sectionLabel}>Activity</Text>
        <Surface elevation={1} style={s.card}>
          <List.Item
            title="Bet History"
            description={isFollowed ? "View your past bets" : "Only visible to followers"}
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={(props) => (
              <List.Icon {...props} icon="chart-bar" color={theme.colors.primary} />
            )}
            right={(props) => (
              <List.Icon {...props} icon={isFollowed ? "chevron-right" : "lock"} color={theme.colors.onSurfaceVariant} />
            )}
            onPress={handleViewBets}
          />
        </Surface>

        <Divider style={s.divider} />

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

      {/* ── Edit Profile Modal ── */}
      <Portal>
        <Modal
          visible={editVisible}
          onDismiss={() => setEditVisible(false)}
          contentContainerStyle={[s.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={[s.modalTitle, { color: theme.colors.onSurface }]}>
            Edit Profile
          </Text>
          <TextInput
            label="Display Name"
            value={editName}
            onChangeText={setEditName}
            mode="outlined"
            style={s.input}
            theme={{ colors: { primary: theme.colors.primary } }}
          />
          <TextInput
            label="Bio"
            value={editBio}
            onChangeText={setEditBio}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={s.input}
            theme={{ colors: { primary: theme.colors.primary } }}
          />
          <View style={s.modalActions}>
            <Button onPress={() => setEditVisible(false)} textColor={theme.colors.onSurfaceVariant}>
              Cancel
            </Button>
            <Button mode="contained" onPress={saveProfile} loading={editSaving} disabled={editSaving}>
              Save
            </Button>
          </View>
        </Modal>

        {/* ── Change Password Modal ── */}
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

        {/* ── Bet History Modal ── */}
        <Modal
          visible={betsVisible}
          onDismiss={() => setBetsVisible(false)}
          contentContainerStyle={[s.modal, { backgroundColor: theme.colors.surface, maxHeight: "80%" }]}
        >
          <Text variant="titleLarge" style={[s.modalTitle, { color: theme.colors.onSurface }]}>
            Bet History
          </Text>
          <ScrollView>
            {bets.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 16 }}>
                No bets yet.
              </Text>
            ) : (
              bets.map((bet) => (
                <View key={bet.id}>
                  <List.Item
                    title={bet.title}
                    titleStyle={{ color: theme.colors.onSurface }}
                    description={new Date(bet.created_at).toLocaleDateString()}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                    right={() => (
                      <Text
                        style={{
                          color:
                            bet.result === "won"
                              ? "#4CAF50"
                              : bet.result === "lost"
                              ? theme.colors.error
                              : theme.colors.onSurfaceVariant,
                          alignSelf: "center",
                          fontWeight: "600",
                          textTransform: "capitalize",
                        }}
                      >
                        {bet.result}
                      </Text>
                    )}
                  />
                  <Divider style={{ backgroundColor: theme.colors.outline }} />
                </View>
              ))
            )}
          </ScrollView>
          <Button onPress={() => setBetsVisible(false)} style={{ marginTop: 12 }}>
            Close
          </Button>
        </Modal>
      </Portal>
    </Surface>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    scroll: {
      padding: 20,
    },
    header: {
      alignItems: "center",
      paddingVertical: 24,
    },
    displayName: {
      color: theme.colors.onSurface,
      fontWeight: "700",
      marginTop: 12,
    },
    username: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    followRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      marginBottom: 4,
      gap: 8,
    },
    followItem: {
      flexDirection: "row",
      alignItems: "baseline",
    },
    followCount: {
      color: theme.colors.onSurface,
      fontWeight: "600",
    },
    followLabel: {
      color: theme.colors.onSurfaceVariant,
    },
    followDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.onSurfaceVariant,
      marginHorizontal: 2,
    },
    bio: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
      marginTop: 8,
      paddingHorizontal: 24,
    },
    statsRow: {
      flexDirection: "row",
      marginTop: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 32,
      gap: 16,
    },
    stat: {
      alignItems: "center",
      flex: 1,
    },
    statNum: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    statLabel: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      backgroundColor: theme.colors.outline,
    },
    editBtn: {
      marginTop: 16,
      borderColor: theme.colors.primary,
      borderRadius: 20,
      paddingHorizontal: 8,
    },
    divider: {
      backgroundColor: theme.colors.outline,
      marginVertical: 20,
    },
    sectionLabel: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 8,
    },
    card: {
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      overflow: "hidden",
    },
    modal: {
      margin: 24,
      borderRadius: 16,
      padding: 24,
    },
    modalTitle: {
      fontWeight: "700",
      marginBottom: 16,
    },
    input: {
      marginBottom: 12,
      backgroundColor: "transparent",
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 8,
    },
  });

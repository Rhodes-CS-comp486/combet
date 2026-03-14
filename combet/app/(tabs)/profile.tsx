import React, { useEffect, useState } from "react";
import { Alert, ScrollView, View, StyleSheet, TouchableOpacity } from "react-native";
import {
  Surface,
  Text,
  Button,
  Divider,
  ActivityIndicator,
  Portal,
  Modal,
  TextInput,
} from "react-native-paper";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import UserAvatar, { AVATAR_ICONS, AVATAR_COLORS } from "@/components/UserAvatar";

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
  coins?: number;
  avatar_color?: string;
  avatar_icon?: string;
};

type Bet = {
  id: string;
  title: string;
  description: string;
  stake_amount: number;
  custom_stake?: string;
  status: string;
  created_at: string;
  closes_at: string;
  creator_name: string;
  circle_name?: string;
  options: { id: number; label: string; option_text: string }[];
};

export default function ProfileScreen() {
  const { theme } = useAppTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [betsLoading, setBetsLoading] = useState(true);

  // Edit profile modal
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Avatar picker modal
  const [avatarVisible, setAvatarVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#2563eb");
  const [selectedIcon, setSelectedIcon] = useState("initials");
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Section Label
  const [betFilter, setBetFilter] = useState<"all" | "circle" | "current" | "past">("all");

  // ── Fetch profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const sessionId = await getSessionId();
        if (!sessionId) { router.replace("/login"); return; }
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { "x-session-id": sessionId },
        });
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setProfile(data);
        setEditName(data.display_name || data.username);
        setEditBio(data.bio || "");
        setSelectedColor(data.avatar_color ?? "#2563eb");
        setSelectedIcon(data.avatar_icon ?? "initials");
      } catch (e) {
        console.error("Profile fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ── Fetch my bets ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchBets = async () => {
      try {
        const sessionId = await getSessionId();
        if (!sessionId) return;
        const res = await fetch(`${API_URL}/bets/my-bets`, {
          headers: { "x-session-id": sessionId },
        });
        if (!res.ok) return;
        const data = await res.json();
        setBets(data);
      } catch (e) {
        console.error("Bets fetch error:", e);
      } finally {
        setBetsLoading(false);
      }
    };
    fetchBets();
  }, []);

  // ── Save profile edits ──────────────────────────────────────────────────────
  const saveProfile = async () => {
    setEditSaving(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: { "x-session-id": sessionId ?? "", "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: editName, bio: editBio }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setProfile(prev =>
        prev ? { ...prev, display_name: updated.display_name, bio: updated.bio } : prev
      );
      setEditVisible(false);
    } catch (e) {
      Alert.alert("Error", "Could not save profile. Please try again.");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Save avatar ─────────────────────────────────────────────────────────────
  const saveAvatar = async () => {
    setAvatarSaving(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: { "x-session-id": sessionId ?? "", "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: profile?.display_name || profile?.username,
          bio: profile?.bio ?? "",
          avatar_color: selectedColor,
          avatar_icon: selectedIcon,
        }),
      });
      if (!res.ok) throw new Error("Failed to save avatar");
      const updated = await res.json();
      setProfile(prev =>
        prev ? { ...prev, avatar_color: updated.avatar_color, avatar_icon: updated.avatar_icon } : prev
      );
      setAvatarVisible(false);
    } catch (e) {
      Alert.alert("Error", "Could not save avatar. Please try again.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const s = styles(theme);

  if (loading) {
    return (
      <Surface style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </Surface>
    );
  }

  const statusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACCEPTED": return "#4CAF50";
      case "DECLINED": return theme.colors.error;
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const statusBg = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACCEPTED": return "rgba(76,175,80,0.1)";
      case "DECLINED": return "rgba(229,57,53,0.1)";
      default: return "rgba(255,255,255,0.06)";
    }
  };

  const stakeLabel = (bet: Bet) => {
    if (bet.custom_stake) return bet.custom_stake;
    if (bet.stake_amount > 0) return `${bet.stake_amount} coins`;
    return "No stake";
  };

  return (
    <Surface style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Top bar ── */}
        <View style={s.topBar}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={s.settingsBtn} onPress={() => router.push("/settings")}>
            <Ionicons name="settings-outline" size={22} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* ── Profile header ── */}
        <View style={s.header}>
          <UserAvatar
            user={profile}
            size={80}
            showEditBadge
            borderColor={theme.colors.background}
            onPress={() => {
              setSelectedColor(profile?.avatar_color ?? "#2563eb");
              setSelectedIcon(profile?.avatar_icon ?? "initials");
              setAvatarVisible(true);
            }}
          />

          <Text variant="headlineSmall" style={s.displayName}>
            {profile?.display_name || profile?.username}
          </Text>
          <Text variant="bodyMedium" style={s.username}>@{profile?.username}</Text>

          <View style={s.followRow}>
            <TouchableOpacity style={s.followItem}>
              <Text variant="bodyMedium" style={s.followCount}>{profile?.followers_count ?? 0}</Text>
              <Text variant="bodySmall" style={s.followLabel}> Followers</Text>
            </TouchableOpacity>
            <View style={s.followDot} />
            <TouchableOpacity style={s.followItem}>
              <Text variant="bodyMedium" style={s.followCount}>{profile?.following_count ?? 0}</Text>
              <Text variant="bodySmall" style={s.followLabel}> Following</Text>
            </TouchableOpacity>
          </View>

          {profile?.bio ? (
            <Text variant="bodySmall" style={s.bio}>{profile.bio}</Text>
          ) : null}

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

        {/* ── My Bets ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text variant="titleMedium" style={s.sectionLabel}>My Bets</Text>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["all", "circle", "current", "past"] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setBetFilter(filter)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: betFilter === filter ? theme.colors.primary : "#1a2035",
                  borderWidth: 1,
                  borderColor: betFilter === filter ? theme.colors.primary : "#2a3550",
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: betFilter === filter ? "#fff" : "#94a3b8",
                }}>
                  {filter === "all" ? "All" : filter === "circle" ? "Circle Bets" : filter === "current" ? "Current" : "Past"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {betsLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
        ) : bets.filter(bet => {
            if (betFilter === "all") return true;
            if (betFilter === "circle") return !!bet.circle_name;
            if (betFilter === "current") return bet.status.toUpperCase() === "PENDING";
            if (betFilter === "past") return bet.status.toUpperCase() !== "PENDING";
            return true;
          }).length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 16 }}>
            No bets found.
          </Text>
        ) : (
          bets.filter(bet => {
            if (betFilter === "all") return true;
            if (betFilter === "circle") return !!bet.circle_name;
            if (betFilter === "current") return bet.status.toUpperCase() === "PENDING";
            if (betFilter === "past") return bet.status.toUpperCase() !== "PENDING";
            return true;
          }).map((bet) => (
            <Surface key={bet.id} elevation={1} style={s.betCard}>
              <View style={s.betHeader}>
                <Text variant="titleSmall" style={s.betTitle} numberOfLines={1}>{bet.title}</Text>
                <View style={[s.statusBadge, { backgroundColor: statusBg(bet.status) }]}>
                  <Text style={[s.statusText, { color: statusColor(bet.status) }]}>
                    {bet.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  From <Text style={{ color: theme.colors.onSurface, fontWeight: "600" }}>{bet.creator_name}</Text>
                </Text>
                {bet.circle_name ? (
                  <Text variant="labelSmall" style={{ color: theme.colors.primary }}>· {bet.circle_name}</Text>
                ) : null}
              </View>

              {bet.description ? (
                <Text variant="bodySmall" style={s.betDesc} numberOfLines={2}>{bet.description}</Text>
              ) : null}

              <View style={s.betMeta}>
                <View style={s.betMetaItem}>
                  <Ionicons name="cash-outline" size={13} color={theme.colors.onSurfaceVariant} />
                  <Text variant="labelSmall" style={s.betMetaText}>{stakeLabel(bet)}</Text>
                </View>
                <View style={s.betMetaItem}>
                  <Ionicons name="time-outline" size={13} color={theme.colors.onSurfaceVariant} />
                  <Text variant="labelSmall" style={s.betMetaText}>
                    {new Date(bet.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {bet.options.length > 0 && (
                <View style={s.optionsRow}>
                  {bet.options.map((opt) => (
                    <View key={opt.id} style={[s.optionChip, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <Text style={[s.optionLabel, { color: theme.colors.primary }]}>{opt.label}</Text>
                      <Text style={[s.optionText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                        {opt.option_text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Surface>
          ))
        )}

    <View style={{ height: 40 }} />
      </ScrollView>

      <Portal>
        {/* ── Edit Profile Modal ── */}
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

        {/* ── Avatar Picker Modal ── */}
        <Modal
          visible={avatarVisible}
          onDismiss={() => setAvatarVisible(false)}
          contentContainerStyle={[s.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={[s.modalTitle, { color: theme.colors.onSurface }]}>
            Edit Avatar
          </Text>

          {/* Preview */}
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <UserAvatar
              user={{ ...profile, avatar_color: selectedColor, avatar_icon: selectedIcon }}
              size={72}
            />
          </View>

          {/* Color picker */}
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            Color
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
            {AVATAR_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setSelectedColor(color)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: color,
                  borderWidth: selectedColor === color ? 3 : 0,
                  borderColor: "#fff",
                }}
              />
            ))}
          </View>

          {/* Icon picker */}
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            Icon
          </Text>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
              {AVATAR_ICONS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setSelectedIcon(item.key)}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: selectedIcon === item.key
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: selectedIcon === item.key ? 2 : 0,
                    borderColor: theme.colors.primary,
                  }}
                >
                  {item.key === "initials" ? (
                    <Text style={{
                      color: selectedIcon === item.key ? "#fff" : theme.colors.onSurfaceVariant,
                      fontSize: 13,
                      fontWeight: "700",
                    }}>AB</Text>
                  ) : (
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={selectedIcon === item.key ? "#fff" : theme.colors.onSurfaceVariant}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={s.modalActions}>
            <Button onPress={() => setAvatarVisible(false)} textColor={theme.colors.onSurfaceVariant}>
              Cancel
            </Button>
            <Button mode="contained" onPress={saveAvatar} loading={avatarSaving} disabled={avatarSaving}>
              Save
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
    center: { justifyContent: "center", alignItems: "center" },
    scroll: { padding: 20 },
    topBar: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    settingsBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: theme.colors.surface,
      borderWidth: 1, borderColor: theme.colors.outline,
      justifyContent: "center", alignItems: "center",
    },
    header: { alignItems: "center", paddingBottom: 24 },
    displayName: { color: theme.colors.onSurface, fontWeight: "700", marginTop: 12 },
    username: { color: theme.colors.onSurfaceVariant, marginTop: 2 },
    followRow: { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 4, gap: 8 },
    followItem: { flexDirection: "row", alignItems: "baseline" },
    followCount: { color: theme.colors.onSurface, fontWeight: "600" },
    followLabel: { color: theme.colors.onSurfaceVariant },
    followDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.onSurfaceVariant, marginHorizontal: 2 },
    bio: { color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 8, paddingHorizontal: 24 },
    statsRow: {
      flexDirection: "row", marginTop: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, gap: 16,
    },
    stat: { alignItems: "center", flex: 1 },
    statNum: { color: theme.colors.onSurface, fontWeight: "700" },
    statLabel: { color: theme.colors.onSurfaceVariant, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: theme.colors.outline },
    editBtn: { marginTop: 16, borderColor: theme.colors.primary, borderRadius: 20, paddingHorizontal: 8 },
    divider: { backgroundColor: theme.colors.outline, marginVertical: 20 },
    sectionLabel: { color: theme.colors.onSurface, marginBottom: 0 },
    betCard: { borderRadius: 16, backgroundColor: theme.colors.surface, padding: 16, marginBottom: 12 },
    betHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    betTitle: { color: theme.colors.onSurface, fontWeight: "600", flex: 1, marginRight: 8 },
    statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: "600" },
    betDesc: { color: theme.colors.onSurfaceVariant, marginBottom: 10, lineHeight: 18 },
    betMeta: { flexDirection: "row", gap: 16, marginBottom: 10 },
    betMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    betMetaText: { color: theme.colors.onSurfaceVariant },
    optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    optionChip: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, gap: 6, maxWidth: "48%" },
    optionLabel: { fontWeight: "700", fontSize: 12 },
    optionText: { fontSize: 12, flex: 1 },
    modal: { margin: 24, borderRadius: 16, padding: 24 },
    modalTitle: { fontWeight: "700", marginBottom: 16 },
    input: { marginBottom: 12, backgroundColor: "transparent" },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  });
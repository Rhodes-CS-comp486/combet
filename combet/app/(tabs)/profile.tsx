import React, { useEffect, useState } from "react";
import { Alert, ScrollView, View, StyleSheet, TouchableOpacity } from "react-native";
import {
  Text,
  Button,
  ActivityIndicator,
  Portal,
  Modal,
  TextInput,
  Divider,
} from "react-native-paper";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import UserAvatar, { AVATAR_ICONS, AVATAR_COLORS } from "@/components/UserAvatar";
import GradientBackground from "@/components/GradientBackground";
import BetCard from "@/components/BetCard";
import { API_BASE } from "@/constants/api";

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
  response_status: string | null;
  created_at: string;
  closes_at: string;
  creator_name: string;
  creator_avatar_color?: string;
  creator_avatar_icon?: string;
  is_creator?: boolean;
  circle_name?: string;
  options: { id: number; label: string; option_text: string }[];
  total_joined?: number;
};

export default function ProfileScreen() {
  const { theme } = useAppTheme();

  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [bets, setBets]             = useState<Bet[]>([]);
  const [loading, setLoading]       = useState(true);
  const [betsLoading, setBetsLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName]     = useState("");
  const [editBio, setEditBio]       = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [avatarVisible, setAvatarVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#2563eb");
  const [selectedIcon, setSelectedIcon]   = useState("initials");
  const [avatarSaving, setAvatarSaving]   = useState(false);
  const [betFilter, setBetFilter] = useState<"all" | "pending" | "current" | "past" | "created" | "circle">("all");

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const sessionId = await getSessionId();
        if (!sessionId) { router.replace("/login"); return; }
        const res = await fetch(`${API_BASE}/users/me`, {
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

  // ── Fetch my bets ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBets();
  }, []);

  const fetchBets = async () => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/bets/my-bets`, {
        headers: { "x-session-id": sessionId },
      });
      if (!res.ok) return;
      setBets(await res.json());
    } catch (e) {
      console.error("Bets fetch error:", e);
    } finally {
      setBetsLoading(false);
    }
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setEditSaving(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: { "x-session-id": sessionId ?? "", "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: editName, bio: editBio }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setProfile(prev => prev ? { ...prev, display_name: updated.display_name, bio: updated.bio } : prev);
      setEditVisible(false);
    } catch (e) {
      Alert.alert("Error", "Could not save profile. Please try again.");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Save avatar ────────────────────────────────────────────────────────────
  const saveAvatar = async () => {
    setAvatarSaving(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/users/me`, {
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
      setProfile(prev => prev ? { ...prev, avatar_color: updated.avatar_color, avatar_icon: updated.avatar_icon } : prev);
      setAvatarVisible(false);
    } catch (e) {
      Alert.alert("Error", "Could not save avatar. Please try again.");
    } finally {
      setAvatarSaving(false);
    }
  };

  // ── Filter logic ───────────────────────────────────────────────────────────
  const filterBets = (bet: Bet) => {
    if (betFilter === "all")     return true;
    if (betFilter === "pending") return bet.status.toUpperCase() === "PENDING" && !bet.response_status;
    if (betFilter === "current") return bet.response_status?.toLowerCase() === "accepted" && ["PENDING", "CLOSED", "PENDING_APPROVAL", "DISPUTED"].includes(bet.status.toUpperCase());
    if (betFilter === "past")    return bet.response_status?.toLowerCase() === "declined" || ["SETTLED", "CANCELLED"].includes(bet.status.toUpperCase());
    if (betFilter === "created") return !!bet.is_creator;
    if (betFilter === "circle")  return !!bet.circle_name;
    return true;
  };

  const s = styles(theme);

  if (loading) {
    return (
      <GradientBackground style={s.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </GradientBackground>
    );
  }

  const filteredBets = bets.filter(filterBets);

  const TABS: { key: typeof betFilter; label: string }[] = [
    { key: "all",     label: "All"          },
    { key: "pending", label: "Pending"      },
    { key: "current", label: "Current"      },
    { key: "past",    label: "Past"         },
    { key: "created", label: "Created"      },
    { key: "circle",  label: "Circle Bets"  },
  ];

  return (
    <GradientBackground>
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
        <Text variant="titleMedium" style={[s.sectionLabel, { marginBottom: 12 }]}>My Bets</Text>

        {/* ── Filter tabs ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {TABS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setBetFilter(key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: betFilter === key ? theme.colors.primary : "#1a2035",
                  borderWidth: 1,
                  borderColor: betFilter === key ? theme.colors.primary : "#2a3550",
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: betFilter === key ? "#fff" : "#94a3b8",
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ── Bet list ── */}
        {betsLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
        ) : filteredBets.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 16 }}>
            No bets found.
          </Text>
        ) : (
          filteredBets.map((bet) => (
            <BetCard
              key={bet.id}
              mode="active"
              item={{
                ...bet,
                target_name: bet.circle_name ?? bet.creator_name,
                target_type: bet.circle_name ? "circle" : "user",
                total_joined: bet.total_joined ?? 0,
              }}
              onRefresh={() => {
                setBetsLoading(true);
                fetchBets();
              }}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Portal>
        {/* ── Edit Profile Modal ── */}
        <Modal
          visible={editVisible}
          onDismiss={() => setEditVisible(false)}
          contentContainerStyle={s.modal}
          style={s.modalBackdrop}
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
          contentContainerStyle={s.modal}
          style={s.modalBackdrop}
        >
          <Text variant="titleLarge" style={[s.modalTitle, { color: theme.colors.onSurface }]}>
            Edit Avatar
          </Text>

          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <UserAvatar
              user={{ ...profile, avatar_color: selectedColor, avatar_icon: selectedIcon }}
              size={72}
            />
          </View>

          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            Color
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
            {AVATAR_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setSelectedColor(color)}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: color,
                  borderWidth: selectedColor === color ? 3 : 0,
                  borderColor: "#fff",
                }}
              />
            ))}
          </View>

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
                    width: 48, height: 48, borderRadius: 12,
                    backgroundColor: selectedIcon === item.key ? selectedColor : "rgba(255,255,255,0.08)",
                    justifyContent: "center", alignItems: "center",
                    borderWidth: selectedIcon === item.key ? 2 : 0,
                    borderColor: selectedColor,
                  }}
                >
                  {item.key === "initials" ? (
                    <Text style={{
                      color: selectedIcon === item.key ? "#fff" : theme.colors.onSurfaceVariant,
                      fontSize: 13, fontWeight: "700",
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
    </GradientBackground>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    root:        { flex: 1 },
    center:      { justifyContent: "center", alignItems: "center" },
    scroll:      { padding: 20 },
    topBar:      { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    settingsBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: theme.colors.surface,
      borderWidth: 1, borderColor: theme.colors.outline,
      justifyContent: "center", alignItems: "center",
    },
    header:      { alignItems: "center", paddingBottom: 24 },
    displayName: { color: theme.colors.onSurface, fontWeight: "700", marginTop: 12 },
    username:    { color: theme.colors.onSurfaceVariant, marginTop: 2 },
    followRow:   { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 4, gap: 8 },
    followItem:  { flexDirection: "row", alignItems: "baseline" },
    followCount: { color: theme.colors.onSurface, fontWeight: "600" },
    followLabel: { color: theme.colors.onSurfaceVariant },
    followDot:   { width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.onSurfaceVariant, marginHorizontal: 2 },
    bio:         { color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 8, paddingHorizontal: 24 },
    statsRow: {
      flexDirection: "row", marginTop: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, gap: 16,
    },
    stat:        { alignItems: "center", flex: 1 },
    statNum:     { color: theme.colors.onSurface, fontWeight: "700" },
    statLabel:   { color: theme.colors.onSurfaceVariant, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: theme.colors.outline },
    editBtn:     { marginTop: 16, borderColor: theme.colors.primary, borderRadius: 20, paddingHorizontal: 8 },
    divider:     { backgroundColor: theme.colors.outline, marginVertical: 20 },
    sectionLabel: { color: theme.colors.onSurface },
    modal: {
      margin: 24, borderRadius: 20, padding: 24,
      backgroundColor: "#1f3347",
      borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
    },
    modalBackdrop: { backgroundColor: "rgba(10,20,30,0.85)" },
    modalTitle:    { fontWeight: "700", marginBottom: 16 },
    input:         { marginBottom: 12, backgroundColor: "transparent" },
    modalActions:  { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  });
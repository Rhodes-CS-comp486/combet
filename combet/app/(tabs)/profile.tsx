import React, { useEffect, useState, useCallback } from "react";
import { Alert, ScrollView, View, StyleSheet, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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
import { useUser } from "@/context/UserContext";
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
  is_admin?: boolean;
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

// ── Filter definitions ─────────────────────────────────────────────────────
//
//  ALL      → every bet you're involved in
//  OPEN     → bets still accepting responses (PENDING status, not yet acted on)
//  ACTIVE   → bets you've joined OR created that are in progress
//  SETTLED  → bets that are fully done (SETTLED or CANCELLED)
//  CIRCLES  → any of the above but scoped to circle bets only
//
// A bet only appears in ONE non-All tab:
//   - You created it and it's PENDING            → Open (others can still join)
//   - You accepted it and it's still running     → Active
//   - You created it and it's CLOSED/APPROVAL    → Active (you need to declare winner)
//   - Status is SETTLED or CANCELLED             → Settled
//   - You declined it                            → doesn't appear in any tab except All

type FilterKey = "all" | "myturn" | "inprogress" | "settled" | "circles";

const TABS: { key: FilterKey; label: string }[] = [
  { key: "all",        label: "All"         },
  { key: "myturn",     label: "My Turn"     },
  { key: "inprogress", label: "In Progress" },
  { key: "settled",    label: "Settled"     },
  { key: "circles",    label: "Circles"     },
];

const ACTIVE_STATUSES   = ["PENDING", "CLOSED", "PENDING_APPROVAL", "DISPUTED"];
const SETTLED_STATUSES  = ["SETTLED", "CANCELLED"];

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const { setUser, adminMode, toggleAdminMode } = useUser();

  const [profile, setProfile]           = useState<UserProfile | null>(null);
  const [bets, setBets]                 = useState<Bet[]>([]);
  const [loading, setLoading]           = useState(true);
  const [betsLoading, setBetsLoading]   = useState(true);
  const [editVisible, setEditVisible]   = useState(false);
  const [editName, setEditName]         = useState("");
  const [editBio, setEditBio]           = useState("");
  const [editSaving, setEditSaving]     = useState(false);
  const [avatarVisible, setAvatarVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#2563eb");
  const [selectedIcon, setSelectedIcon]   = useState("initials");
  const [avatarSaving, setAvatarSaving]   = useState(false);
  const [betFilter, setBetFilter]         = useState<FilterKey>("all");
  const [settlingBet, setSettlingBet] = useState<any | null>(null);

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
        setUser(data);
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
  useFocusEffect(useCallback(() => { fetchBets(); }, []));

  const fetchBets = async () => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/bets/my-bets`, {
        headers: { "x-session-id": sessionId },
      });
      if (!res.ok) return;
      const data = await res.json();
      setBets(Array.isArray(data) ? data : []);
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
        body: JSON.stringify({
          display_name:          editName,
          bio:                   editBio,
          avatar_color:          profile?.avatar_color,
          avatar_icon:           profile?.avatar_icon,
          is_private:            profile?.is_private,
          show_bets_to_followers: profile?.show_bets_to_followers ?? false,
        }),
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
  const filterBets = (bet: Bet): boolean => {
    const status   = bet.status.toUpperCase();
    const response = bet.response_status?.toLowerCase();

    // Declined bets only appear in All
    if (response === "declined" && betFilter !== "all") return false;

    switch (betFilter) {
      case "all":
        return true;

      case "myturn":
        // Bets where YOU need to take action:
        // - You created it and it's PENDING (still open, you can close it)
        // - You created it and it's CLOSED (you need to declare a winner)
        // - You haven't responded yet and it's PENDING (you need to join or pass)
        return (
          (!!bet.is_creator && ["PENDING", "CLOSED"].includes(status)) ||
          (!bet.is_creator && status === "PENDING" && response == null)
        );

      case "inprogress":
        // Bets you've already joined and are waiting on — no action needed from you yet
        return (
          !bet.is_creator &&
          response === "accepted" &&
          ACTIVE_STATUSES.includes(status)
        );

      case "settled":
        // Fully resolved bets
        return SETTLED_STATUSES.includes(status);

      case "circles":
        // Circle bets only — any status
        return !!bet.circle_name;

      default:
        return true;
    }
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
            <TouchableOpacity style={s.followItem} onPress={() => router.push("/user/followers?tab=followers")}>
              <Text variant="bodyMedium" style={s.followCount}>{profile?.followers_count ?? 0}</Text>
              <Text variant="bodySmall" style={s.followLabel}> Followers</Text>
            </TouchableOpacity>
            <View style={s.followDot} />
            <TouchableOpacity style={s.followItem} onPress={() => router.push("/user/followers?tab=following")}>
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
              <Text variant="titleLarge" style={[s.statNum, { color: "#9dd4be" }]}>{profile?.wins ?? 0}</Text>
              <Text variant="labelSmall" style={s.statLabel}>Wins</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text variant="titleLarge" style={[s.statNum, { color: "#e87060" }]}>{profile?.losses ?? 0}</Text>
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

          {profile?.is_admin && (
            <TouchableOpacity
              onPress={toggleAdminMode}
              style={{
                flexDirection: "row", alignItems: "center", gap: 10,
                marginTop: 12, paddingHorizontal: 16, paddingVertical: 10,
                borderRadius: 12, borderWidth: 1,
                borderColor: adminMode ? "rgba(157,212,190,0.4)" : "rgba(255,255,255,0.15)",
                backgroundColor: adminMode ? "rgba(157,212,190,0.1)" : "rgba(255,255,255,0.05)",
              }}
            >
              <Ionicons
                name={adminMode ? "shield" : "shield-outline"}
                size={18}
                color={adminMode ? "#9dd4be" : theme.colors.onSurfaceVariant}
              />
              <Text style={{
                color: adminMode ? "#9dd4be" : theme.colors.onSurfaceVariant,
                fontSize: 14, fontWeight: "600",
              }}>
                {adminMode ? "Admin Mode On" : "Switch to Admin Mode"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Divider style={s.divider} />

        {profile?.is_admin && adminMode ? (
          /* ── Admin Panel ── */
          <View style={{ gap: 12 }}>
            <Text variant="titleMedium" style={[s.sectionLabel, { marginBottom: 4 }]}>Admin Panel</Text>
            {[
              { label: "All Users",   icon: "people-outline",   route: "/(tabs)/admin/view_users"   },
              { label: "All Bets",    icon: "trophy-outline",   route: "/(tabs)/admin/view_bets"    },
              { label: "All Circles", icon: "people-circle-outline", route: "/(tabs)/admin/view_circles" },
            ].map(({ label, icon, route }) => (
              <TouchableOpacity
                key={route}
                onPress={() => router.push(route as any)}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  backgroundColor: "rgba(255,255,255,0.07)",
                  borderRadius: 14, padding: 16,
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Ionicons name={icon as any} size={22} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.onSurface, fontSize: 15, fontWeight: "600" }}>{label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <>
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
                target_name:  bet.circle_name ?? bet.creator_name,
                target_type:  bet.circle_name ? "circle" : "user",
                total_joined: bet.total_joined ?? 0,
              }}
              onRefresh={() => {
                fetchBets();
              }}
              onSettle={(item) => setSettlingBet(item)}
            />
          ))
        )}

        <View style={{ height: 40 }} />
          </>
        )}
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

        <Modal
          visible={!!settlingBet}
          onDismiss={() => setSettlingBet(null)}
          contentContainerStyle={{
            margin: 24, borderRadius: 20, padding: 24,
            backgroundColor: "#1f3347",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <Text style={{ color: theme.colors.onSurface, fontWeight: "600", fontSize: 20, marginBottom: 6 }}>
            Declare Winner
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, marginBottom: 20 }}>
            Pick the winning option for "{settlingBet?.title}"
          </Text>
          <View style={{ gap: 10 }}>
            {(settlingBet?.options ?? []).map((opt: any) => (
              <TouchableOpacity
                key={opt.id}
                onPress={async () => {
                  const sessionId = await getSessionId();
                  const res = await fetch(`${API_BASE}/bets/${settlingBet.id}/settle`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
                    body: JSON.stringify({ winningOptionId: opt.id }),
                  });
                  if (res.ok) {
                    setSettlingBet(null);
                    setBetsLoading(true);
                    fetchBets();
                  }
                }}
                style={{
                  borderRadius: 12, padding: 14,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                <Text style={{ color: theme.colors.onSurface, fontSize: 14, fontWeight: "500", textAlign: "center" }}>
                  {opt.text ?? opt.option_text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button
            mode="text"
            onPress={() => setSettlingBet(null)}
            style={{ marginTop: 8 }}
            labelStyle={{ color: theme.colors.onSurfaceVariant }}
          >
            Cancel
          </Button>
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
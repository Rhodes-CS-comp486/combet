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
  is_private?: boolean;
  show_bets_to_followers?: boolean;
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

type FilterKey = "all" | "myturn" | "inprogress" | "settled" | "circles";

const TABS: { key: FilterKey; label: string }[] = [
  { key: "all",        label: "All"         },
  { key: "myturn",     label: "My Turn"     },
  { key: "inprogress", label: "In Progress" },
  { key: "settled",    label: "Settled"     },
  { key: "circles",    label: "Circles"     },
];

const ACTIVE_STATUSES  = ["PENDING", "CLOSED", "PENDING_APPROVAL", "DISPUTED"];
const SETTLED_STATUSES = ["SETTLED", "CANCELLED"];

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const { setUser, adminMode, toggleAdminMode } = useUser();

  const [profile, setProfile]             = useState<UserProfile | null>(null);
  const [bets, setBets]                   = useState<Bet[]>([]);
  const [loading, setLoading]             = useState(true);
  const [betsLoading, setBetsLoading]     = useState(true);
  const [editVisible, setEditVisible]     = useState(false);
  const [editName, setEditName]           = useState("");
  const [editBio, setEditBio]             = useState("");
  const [editSaving, setEditSaving]       = useState(false);
  const [avatarVisible, setAvatarVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#2563eb");
  const [selectedIcon, setSelectedIcon]   = useState("initials");
  const [avatarSaving, setAvatarSaving]   = useState(false);
  const [betFilter, setBetFilter]         = useState<FilterKey>("all");
  const [settlingBet, setSettlingBet]     = useState<any | null>(null);

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

  const saveProfile = async () => {
    setEditSaving(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: { "x-session-id": sessionId ?? "", "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name:           editName,
          bio:                    editBio,
          avatar_color:           profile?.avatar_color,
          avatar_icon:            profile?.avatar_icon,
          is_private:             profile?.is_private,
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

  const saveAvatar = async () => {
    setAvatarSaving(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: { "x-session-id": sessionId ?? "", "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: profile?.display_name || profile?.username,
          bio:          profile?.bio ?? "",
          avatar_color: selectedColor,
          avatar_icon:  selectedIcon,
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

  const filterBets = (bet: Bet): boolean => {
    const status   = bet.status.toUpperCase();
    const response = bet.response_status?.toLowerCase();
    if (response === "declined" && betFilter !== "all") return false;
    switch (betFilter) {
      case "all":        return true;
      case "myturn":     return (
        (!!bet.is_creator && ["PENDING", "CLOSED"].includes(status)) ||
        (!bet.is_creator && status === "PENDING" && response == null)
      );
      case "inprogress": return (
        !bet.is_creator && response === "accepted" && ACTIVE_STATUSES.includes(status)
      );
      case "settled":    return SETTLED_STATUSES.includes(status);
      case "circles":    return !!bet.circle_name;
      default:           return true;
    }
  };

  if (loading) {
    return (
      <GradientBackground style={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </GradientBackground>
    );
  }

  const filteredBets = bets.filter(filterBets);

  return (
    <GradientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
      >
        {/* ── Top Bar ── */}
        <View style={styles.topbar}>
          <View style={{ flex: 1 }} />
          <View style={styles.topbarTitle}>
            <Text style={styles.topbarText}>
              {profile?.display_name || profile?.username}
            </Text>
            {profile?.is_private && (
              <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.4)" />
            )}
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/settings")}>
              <Ionicons name="settings-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.card}>

          {/* Avatar + Stats row */}
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => {
                setSelectedColor(profile?.avatar_color ?? "#2563eb");
                setSelectedIcon(profile?.avatar_icon ?? "initials");
                setAvatarVisible(true);
              }}
            >
              <UserAvatar user={profile} size={70} showEditBadge borderColor="transparent" />
            </TouchableOpacity>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{profile?.total_bets ?? 0}</Text>
                <Text style={styles.statLbl}>Bets</Text>
              </View>
              <TouchableOpacity
                style={styles.stat}
                onPress={() => router.push("/user/followers?tab=followers")}
              >
                <Text style={styles.statNum}>{profile?.followers_count ?? 0}</Text>
                <Text style={styles.statLbl}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stat}
                onPress={() => router.push("/user/followers?tab=following")}
              >
                <Text style={styles.statNum}>{profile?.following_count ?? 0}</Text>
                <Text style={styles.statLbl}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name / username / bio */}
          <Text style={styles.displayName}>
            {profile?.display_name || profile?.username}
          </Text>
          <Text style={styles.username}>@{profile?.username}</Text>
          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {/* Wins / Losses */}
          <View style={styles.wlRow}>
            <View style={styles.wlItem}>
              <Text style={[styles.wlNum, { color: "#9dd4be" }]}>{profile?.wins ?? 0}</Text>
              <Text style={styles.wlLbl}>Wins</Text>
            </View>
            <View style={styles.wlDivider} />
            <View style={styles.wlItem}>
              <Text style={[styles.wlNum, { color: "#e87060" }]}>{profile?.losses ?? 0}</Text>
              <Text style={styles.wlLbl}>Losses</Text>
            </View>
          </View>

          {/* Edit Profile button */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnEdit} onPress={() => setEditVisible(true)}>
              <Ionicons name="create-outline" size={15} color="#fff" />
              <Text style={styles.btnText}>  Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Admin toggle */}
          {profile?.is_admin && (
            <TouchableOpacity
              onPress={toggleAdminMode}
              style={[styles.adminRow, {
                borderColor:     adminMode ? "rgba(157,212,190,0.4)" : "rgba(255,255,255,0.15)",
                backgroundColor: adminMode ? "rgba(157,212,190,0.1)" : "rgba(255,255,255,0.05)",
              }]}
            >
              <Ionicons
                name={adminMode ? "shield" : "shield-outline"}
                size={16}
                color={adminMode ? "#9dd4be" : "rgba(255,255,255,0.5)"}
              />
              <Text style={[styles.adminText, { color: adminMode ? "#9dd4be" : "rgba(255,255,255,0.5)" }]}>
                {adminMode ? "Admin Mode On" : "Switch to Admin Mode"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Admin Panel ── */}
        {profile?.is_admin && adminMode ? (
          <View style={{ gap: 10 }}>
            {[
              { label: "All Users",   icon: "people-outline",       route: "/(tabs)/admin/view_users"   },
              { label: "All Bets",    icon: "trophy-outline",        route: "/(tabs)/admin/view_bets"    },
              { label: "All Circles", icon: "people-circle-outline", route: "/(tabs)/admin/view_circles" },
              { label: "Reports",     icon: "flag-outline",          route: "/(tabs)/admin/view_reports" },
            ].map(({ label, icon, route }) => (
              <TouchableOpacity
                key={route}
                onPress={() => router.push(route as any)}
                style={styles.adminCard}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Ionicons name={icon as any} size={20} color={theme.colors.primary} />
                  <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>{label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <>
            {/* ── Bet filter tabs ── */}
            <View style={styles.tabBar}>
              {TABS.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.tab, betFilter === key && styles.tabActive]}
                  onPress={() => setBetFilter(key)}
                >
                  <Text style={[styles.tabText, betFilter === key && styles.tabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Bet list ── */}
            <View style={{ paddingTop: 8 }}>
              {betsLoading ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
              ) : filteredBets.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={36} color="rgba(255,255,255,0.3)" style={{ marginBottom: 12 }} />
                  <Text style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: 14 }}>
                    No bets found.
                  </Text>
                </View>
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
                    onRefresh={fetchBets}
                    onSettle={(item) => setSettlingBet(item)}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Portal>
        {/* ── Edit Profile Modal ── */}
        <Modal
          visible={editVisible}
          onDismiss={() => setEditVisible(false)}
          contentContainerStyle={styles.modal}
          style={{ backgroundColor: "rgba(10,20,30,0.85)" }}
        >
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <TextInput
            label="Display Name"
            value={editName}
            onChangeText={setEditName}
            mode="outlined"
            style={styles.input}
            theme={{ colors: { primary: theme.colors.primary } }}
          />
          <TextInput
            label="Bio"
            value={editBio}
            onChangeText={setEditBio}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            theme={{ colors: { primary: theme.colors.primary } }}
          />
          <View style={styles.modalActions}>
            <Button onPress={() => setEditVisible(false)} textColor="rgba(255,255,255,0.5)">Cancel</Button>
            <Button mode="contained" onPress={saveProfile} loading={editSaving} disabled={editSaving}>Save</Button>
          </View>
        </Modal>

        {/* ── Settle Modal ── */}
        <Modal
          visible={!!settlingBet}
          onDismiss={() => setSettlingBet(null)}
          contentContainerStyle={styles.modal}
          style={{ backgroundColor: "rgba(10,20,30,0.85)" }}
        >
          <Text style={[styles.modalTitle, { marginBottom: 6 }]}>Declare Winner</Text>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20 }}>
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
                  if (res.ok) { setSettlingBet(null); setBetsLoading(true); fetchBets(); }
                }}
                style={{ borderRadius: 12, padding: 14, backgroundColor: "rgba(157,212,190,0.07)", borderWidth: 1, borderColor: "rgba(157,212,190,0.2)" }}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500", textAlign: "center" }}>
                  {opt.text ?? opt.option_text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button mode="text" onPress={() => setSettlingBet(null)} style={{ marginTop: 8 }} labelStyle={{ color: "rgba(255,255,255,0.5)" }}>
            Cancel
          </Button>
        </Modal>

        {/* ── Avatar Picker Modal ── */}
        <Modal
          visible={avatarVisible}
          onDismiss={() => setAvatarVisible(false)}
          contentContainerStyle={styles.modal}
          style={{ backgroundColor: "rgba(10,20,30,0.85)" }}
        >
          <Text style={styles.modalTitle}>Edit Avatar</Text>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <UserAvatar
              user={{ ...profile, avatar_color: selectedColor, avatar_icon: selectedIcon }}
              size={72}
            />
          </View>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 8 }}>Color</Text>
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
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 8 }}>Icon</Text>
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
                    <Text style={{ color: selectedIcon === item.key ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: "700" }}>AB</Text>
                  ) : (
                    <Ionicons name={item.icon as any} size={22} color={selectedIcon === item.key ? "#fff" : "rgba(255,255,255,0.4)"} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <Button onPress={() => setAvatarVisible(false)} textColor="rgba(255,255,255,0.5)">Cancel</Button>
            <Button mode="contained" onPress={saveAvatar} loading={avatarSaving} disabled={avatarSaving}>Save</Button>
          </View>
        </Modal>
      </Portal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, marginBottom: 8,
  },
  topbarTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  topbarText:  { color: "#fff", fontSize: 16, fontWeight: "500" },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },

  card:     { backgroundColor: "#1e2f3c", borderRadius: 18, padding: 16, marginBottom: 12 },
  topRow:   { flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 16 },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  stat:     { alignItems: "center" },
  statNum:  { color: "#fff", fontSize: 22, fontWeight: "600" },
  statLbl:  { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },

  displayName: { color: "#fff", fontSize: 17, fontWeight: "600", marginBottom: 2 },
  username:    { color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 6 },
  bio:         { color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 8 },

  wlRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20,
    marginTop: 4, marginBottom: 14,
  },
  wlItem:    { flex: 1, alignItems: "center" },
  wlNum:     { fontSize: 18, fontWeight: "700" },
  wlLbl:     { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  wlDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.1)" },

  btnRow:  { flexDirection: "row", gap: 10 },
  btnEdit: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 12, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12,
  },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "500" },

  adminRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  adminText: { fontSize: 14, fontWeight: "600" },
  adminCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },

  tabBar:        { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  tab:           { flex: 1, alignItems: "center", paddingVertical: 10 },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: "#fff" },
  tabText:       { color: "rgba(255,255,255,0.35)", fontSize: 13 },
  tabTextActive: { color: "#fff" },

  emptyState: {
    borderRadius: 16, padding: 28,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },

  modal: {
    margin: 24, borderRadius: 20, padding: 24,
    backgroundColor: "#1f3347",
    borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
  },
  modalTitle:   { color: "#fff", fontWeight: "700", fontSize: 20, marginBottom: 16 },
  input:        { marginBottom: 12, backgroundColor: "transparent" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
});
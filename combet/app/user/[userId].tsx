import React, { useEffect, useState, useCallback } from "react";
import { ScrollView, View, TouchableOpacity, StyleSheet } from "react-native";
import { Text, ActivityIndicator, Button, Portal, Modal } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import UserAvatar from "@/components/UserAvatar";
import GradientBackground from "@/components/GradientBackground";
import BetCard from "@/components/BetCard";
import { API_BASE } from "@/constants/api";
import ReportModal from "@/components/ReportModal";
import ConfirmModal from "@/components/Confirmmodal";

type UserProfile = {
  id:                     string;
  username:               string;
  display_name:           string;
  bio:                    string;
  avatar_color:           string;
  avatar_icon:            string;
  is_private:             boolean;
  show_bets_to_followers: boolean;
  followers_count:        number;
  following_count:        number;
  total_bets:             number;
  wins:                   number;
  losses:                 number;
  is_following:           boolean;
  follow_request_status:  string | null;
  shared_bets:            any[];
  circle_bets:            any[];
  shared_circles:         any[];
  public_circles:         any[];
  bets:                   any[];
};

type TabKey = "bets" | "circle_bets";

// ── Circle pill ───────────────────────────────────────────────────────────────
function CirclePill({ circle, isMember, userId }: { circle: any; isMember: boolean; userId: string }) {
  const { theme } = useAppTheme();
  const isPrivate = circle.is_private ?? false;

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: `/circle-profile/${circle.circle_id}`, params: { from: "user", userId } } as any)}
      style={{ alignItems: "center", marginRight: 14, width: 68 }}
    >
      <View style={{ width: 56, height: 56, position: "relative", overflow: "visible" }}>
        <View style={{
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: isMember ? (circle.icon_color ?? theme.colors.primary) : "rgba(255,255,255,0.08)",
          alignItems: "center", justifyContent: "center",
          borderWidth: isMember ? 0 : 1.5,
          borderColor: "rgba(255,255,255,0.15)",
          borderStyle: isMember ? "solid" : "dashed",
        }}>
          <Ionicons
            name={(circle.icon as any) ?? "people"}
            size={24}
            color={isMember ? "#fff" : "rgba(255,255,255,0.3)"}
          />
        </View>
        <View style={{
          position: "absolute", bottom: -1, right: -1,
          width: 18, height: 18, borderRadius: 9,
          backgroundColor: "#1e3a4a",
          alignItems: "center", justifyContent: "center",
          borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)",
        }}>
          <Ionicons
            name={isPrivate ? "lock-closed" : "globe-outline"}
            size={10}
            color={isPrivate ? "#e87060" : "#9dd4be"}
          />
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: isMember ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
          fontSize: 11, fontWeight: "500",
          marginTop: 6, textAlign: "center", width: 68,
        }}
      >
        {circle.name}
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10, marginTop: 1 }}>
        {isMember ? `${circle.member_count} members` : "Not a member"}
      </Text>
    </TouchableOpacity>
  );
}

export default function UserProfileScreen() {
  const { userId }        = useLocalSearchParams<{ userId: string }>();
  const { theme }         = useAppTheme();
  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [actioning, setActioning] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("bets");
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [reportVisible, setReportVisible]         = useState(false);
  const [isBlocked, setIsBlocked]                 = useState(false);
  const [showBlockModal, setShowBlockModal]        = useState(false);
  const [showBlockedScreen, setShowBlockedScreen] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!userId || userId === "undefined") return;
    getSessionId().then(async (sessionId) => {
      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { "x-session-id": sessionId ?? "" },
        });
        if (res.ok) {
          const me = await res.json();
          if (me.id === userId) { router.replace("/(tabs)/profile"); return; }
        }
      } catch {}
      void fetchProfile();
    });
  }, [userId]));

  const fetchProfile = async () => {
    try {
      const sessionId = await getSessionId();
      const blockedRes = await fetch(`${API_BASE}/users/blocked`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (blockedRes.ok) {
        const blocked = await blockedRes.json();
        setIsBlocked(blocked.some((u: any) => u.id === userId));
      }
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (!res.ok) throw new Error();
      setProfile(await res.json());
    } catch (err) {
      console.error("User profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    setActioning(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/users/follows`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
        body: JSON.stringify({ followingId: profile.id }),
      });
      const data = await res.json();
      setProfile((prev) => prev ? {
        ...prev,
        is_following:          data.status === "following",
        follow_request_status: data.status === "requested" ? "pending" : prev.follow_request_status,
      } : prev);
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setActioning(false);
    }
  };

  const handleUnfollow = async () => {
    if (!profile) return;
    setShowUnfollowModal(false);
    setActioning(true);
    try {
      const sessionId = await getSessionId();
      await fetch(`${API_BASE}/users/follows/${profile.id}`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId ?? "" },
      });
      setProfile((prev) => prev ? { ...prev, is_following: false, follow_request_status: null } : prev);
    } catch (err) {
      console.error("Unfollow error:", err);
    } finally {
      setActioning(false);
    }
  };

  const handleBlockConfirmed = async () => {
    if (!profile) return;
    setShowBlockModal(false);
    try {
      const sessionId = await getSessionId();
      await fetch(`${API_BASE}/users/${profile.id}/block`, {
        method: "POST",
        headers: { "x-session-id": sessionId ?? "" },
      });
      setIsBlocked(true);
      setShowBlockedScreen(true);
    } catch (err) {
      console.error("Block error:", err);
    }
  };

  const handleUnblock = async () => {
    if (!profile) return;
    try {
      const sessionId = await getSessionId();
      await fetch(`${API_BASE}/users/${profile.id}/block`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId ?? "" },
      });
      setIsBlocked(false);
      setShowBlockedScreen(false);
      void fetchProfile();
    } catch (err) {
      console.error("Unblock error:", err);
    }
  };

  const renderFollowButton = () => {
    if (!profile) return null;
    if (profile.is_following) return (
      <TouchableOpacity
        onPress={() => setShowUnfollowModal(true)}
        style={styles.btnFollowing}
      >
        <Ionicons name="checkmark" size={13} color="#9dd4be" />
        <Text style={styles.btnFollowingText}>Following</Text>
        <Ionicons name="chevron-down" size={12} color="#9dd4be" style={{ marginLeft: 2 }} />
      </TouchableOpacity>
    );
    if (profile.follow_request_status === "pending") return (
      <View style={styles.btnRequested}>
        <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.4)" />
        <Text style={styles.btnRequestedText}>Requested</Text>
      </View>
    );
    return (
      <TouchableOpacity
        onPress={handleFollow}
        style={[styles.btnJoin, { opacity: actioning ? 0.6 : 1 }]}
        disabled={actioning}
      >
        <Ionicons name="person-add" size={13} color="#0d2416" />
        <Text style={styles.btnJoinText}>
          {profile.is_private ? "  Request to Follow" : "  Follow"}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <GradientBackground>
      <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 80 }} />
    </GradientBackground>
  );

  if (!profile) return (
    <GradientBackground>
      <Text style={{ color: "#fff", textAlign: "center", marginTop: 80 }}>User not found.</Text>
    </GradientBackground>
  );

  if (showBlockedScreen) return (
    <GradientBackground style={{ paddingHorizontal: 16 }}>
      <View style={{ paddingTop: 12, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ alignSelf: "flex-start", padding: 7 }}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 }}>
        <View style={{
          width: 72, height: 72, borderRadius: 36,
          backgroundColor: "rgba(232,112,96,0.1)",
          borderWidth: 1, borderColor: "rgba(232,112,96,0.2)",
          alignItems: "center", justifyContent: "center", marginBottom: 20,
        }}>
          <Ionicons name="ban-outline" size={32} color="#e87060" />
        </View>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
          @{profile.username} blocked
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 32, paddingHorizontal: 32 }}>
          They won't be able to message you or see your profile.
        </Text>
        <TouchableOpacity
          onPress={handleUnblock}
          style={{ borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}
        >
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Unblock</Text>
        </TouchableOpacity>
      </View>
    </GradientBackground>
  );

  const isPrivateAndNotFollowing = profile.is_private && !profile.is_following;
  const sharedIds  = new Set((profile.shared_circles ?? []).map((c) => c.circle_id));
  const publicOnly = (profile.public_circles ?? []).filter((c) => !sharedIds.has(c.circle_id));
  const allCircles = [
    ...(profile.shared_circles ?? []).map((c) => ({ ...c, isMember: true })),
    ...publicOnly.map((c) => ({ ...c, isMember: false })),
  ];

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: "bets",        label: "Bets Together", count: (profile.shared_bets ?? []).length },
    { key: "circle_bets", label: "Circle Bets",   count: (profile.circle_bets ?? []).length },
  ];

  return (
    <GradientBackground>
      <Portal>
        <Modal
          visible={showUnfollowModal}
          onDismiss={() => setShowUnfollowModal(false)}
          contentContainerStyle={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            backgroundColor: "#1f3347",
            borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
            paddingBottom: 36,
          }}
        >
          <View style={{ padding: 24 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 6, textAlign: "center" }}>
              Unfollow @{profile.username}?
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 24, lineHeight: 20, textAlign: "center" }}>
              You'll no longer see their updates and will need to follow them again.
            </Text>
            <TouchableOpacity
              onPress={handleUnfollow}
              style={{ backgroundColor: "rgba(232,112,96,0.15)", borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(232,112,96,0.4)", marginBottom: 10 }}
            >
              <Text style={{ color: "#e87060", fontSize: 15, fontWeight: "700" }}>Unfollow</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowUnfollowModal(false)}
              style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
            >
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>

      <ConfirmModal
        visible={showBlockModal}
        title={`Block @${profile.username}?`}
        message="They won't be able to message you, follow you, or see your profile. You can unblock them at any time."
        confirmLabel="Block"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleBlockConfirmed}
        onCancel={() => setShowBlockModal(false)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
      >
        {/* ── Top Bar ── */}
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
          <View style={styles.topbarTitle}>
            <Text style={styles.topbarText}>{profile.display_name}</Text>
            {profile.is_private && (
              <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.4)" />
            )}
          </View>
          {/* Report + Block */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setReportVisible(true)}>
              <Ionicons name="flag-outline" size={15} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, isBlocked && { borderColor: "rgba(232,112,96,0.4)", backgroundColor: "rgba(232,112,96,0.1)" }]}
              onPress={isBlocked ? handleUnblock : () => setShowBlockModal(true)}
            >
              <Ionicons name="ban-outline" size={15} color={isBlocked ? "#e87060" : "rgba(255,255,255,0.4)"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.card}>

          {/* Avatar + Stats row */}
          <View style={styles.topRow}>
            <UserAvatar
              user={{
                username:     profile.username,
                display_name: profile.display_name,
                avatar_color: profile.avatar_color,
                avatar_icon:  profile.avatar_icon,
              }}
              size={70}
            />

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{profile.total_bets}</Text>
                <Text style={styles.statLbl}>Bets</Text>
              </View>
              <TouchableOpacity
                style={styles.stat}
                disabled={isPrivateAndNotFollowing}
                onPress={() => router.push({ pathname: "/user/user-followers", params: { userId: profile.id, tab: "followers" } } as any)}
              >
                <Text style={styles.statNum}>{profile.followers_count}</Text>
                <Text style={[styles.statLbl, isPrivateAndNotFollowing && { color: "rgba(255,255,255,0.2)" }]}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stat}
                disabled={isPrivateAndNotFollowing}
                onPress={() => router.push({ pathname: "/user/user-followers", params: { userId: profile.id, tab: "following" } } as any)}
              >
                <Text style={styles.statNum}>{profile.following_count}</Text>
                <Text style={[styles.statLbl, isPrivateAndNotFollowing && { color: "rgba(255,255,255,0.2)" }]}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name / username / bio */}
          <Text style={styles.displayName}>{profile.display_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {/* Wins / Losses */}
          <View style={styles.wlRow}>
            <View style={styles.wlItem}>
              <Text style={[styles.wlNum, { color: "#9dd4be" }]}>{profile.wins}</Text>
              <Text style={styles.wlLbl}>Wins</Text>
            </View>
            <View style={styles.wlDivider} />
            <View style={styles.wlItem}>
              <Text style={[styles.wlNum, { color: "#e87060" }]}>{profile.losses}</Text>
              <Text style={styles.wlLbl}>Losses</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.btnRow}>
            {renderFollowButton()}
            <TouchableOpacity
              style={styles.btnMsg}
              onPress={() => router.push({ pathname: "/(tabs)/inbox/dm", params: { userId: profile.id, username: profile.username } } as any)}
            >
              <Ionicons name="chatbubble-outline" size={14} color="#fff" />
              <Text style={styles.btnMsgText}>  Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Private lockout ── */}
        {isPrivateAndNotFollowing ? (
          <View style={{ marginTop: 12, borderRadius: 18, overflow: "hidden" }}>
            <View style={[styles.tabBar, { opacity: 0.35 }]}>
              {["Bets Together", "Circle Bets"].map((label) => (
                <View key={label} style={styles.tab}>
                  <Text style={styles.tabText}>{label}</Text>
                </View>
              ))}
            </View>
            <View style={{
              borderRadius: 14, overflow: "hidden",
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
              marginTop: 8, padding: 20,
            }}>
              {[1, 2].map((i) => (
                <View key={i} style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderRadius: 12, padding: 14, marginBottom: 10,
                  opacity: i === 1 ? 0.5 : 0.25,
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)" }} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ height: 10, width: "70%", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 6 }} />
                      <View style={{ height: 8, width: "40%", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 6 }} />
                    </View>
                  </View>
                  <View style={{ height: 8, width: "90%", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 6, marginBottom: 6 }} />
                  <View style={{ height: 8, width: "60%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 6 }} />
                </View>
              ))}
              <View style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                alignItems: "center", justifyContent: "center",
                backgroundColor: "rgba(10,20,30,0.55)",
                borderRadius: 14, gap: 10,
              }}>
                <View style={{
                  width: 52, height: 52, borderRadius: 26,
                  backgroundColor: "rgba(255,255,255,0.07)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name="lock-closed" size={22} color="rgba(255,255,255,0.5)" />
                </View>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "600" }}>
                  This account is private
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center", paddingHorizontal: 24 }}>
                  Follow to see their shared bets and circles
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* ── Circles row ── */}
            {allCircles.length > 0 && (
              <View style={{ paddingTop: 16, paddingBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={styles.sectionLabel}>Circles</Text>
                  <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                    {sharedIds.size} shared · {allCircles.length} total
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                  {allCircles.map((circle) => (
                    <CirclePill key={circle.circle_id} circle={circle} isMember={circle.isMember} userId={userId} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Tabs ── */}
            <View style={styles.tabBar}>
              {TABS.map(({ key, label, count }) => {
                const active = activeTab === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.tab, active && styles.tabActive]}
                    onPress={() => setActiveTab(key)}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
                    {count > 0 && (
                      <View style={{
                        backgroundColor: active ? "#fff" : "rgba(255,255,255,0.12)",
                        borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginTop: 2,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: active ? "#1e2f3c" : "rgba(255,255,255,0.4)" }}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ paddingTop: 8 }}>
              {activeTab === "bets" && (
                (profile.shared_bets ?? []).length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={36} color="rgba(255,255,255,0.3)" style={{ marginBottom: 12 }} />
                    <Text style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: 14 }}>No shared bets yet.</Text>
                  </View>
                ) : (
                  (profile.shared_bets ?? []).map((bet) => (
                    <BetCard key={bet.id} item={bet} mode="active" onRefresh={fetchProfile} />
                  ))
                )
              )}
              {activeTab === "circle_bets" && (
                (profile.circle_bets ?? []).length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="trophy-outline" size={36} color="rgba(255,255,255,0.3)" style={{ marginBottom: 12 }} />
                    <Text style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: 14 }}>No circle bets in common.</Text>
                  </View>
                ) : (
                  (profile.circle_bets ?? []).map((bet) => (
                    <BetCard key={bet.id} item={bet} mode="active" onRefresh={fetchProfile} />
                  ))
                )
              )}
            </View>
          </>
        )}
      </ScrollView>

      <ReportModal
        visible={reportVisible}
        onDismiss={() => setReportVisible(false)}
        targetType="user"
        targetId={profile.id}
      />
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

    card: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 18, padding: 16, marginBottom: 12 },
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

  btnRow: { flexDirection: "row", gap: 10 },
  btnFollowing: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(157,212,190,0.12)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
  },
  btnFollowingText: { color: "#9dd4be", fontSize: 14, fontWeight: "600" },
  btnRequested: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  btnRequestedText: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  btnJoin: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 12, backgroundColor: "#9dd4be", borderRadius: 12,
    borderWidth: 1, borderColor: "#9dd4be",
  },
  btnJoinText: { color: "#0d2416", fontSize: 14, fontWeight: "600" },
  btnMsg: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 12, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12,
  },
  btnMsgText: { color: "#fff", fontSize: 14, fontWeight: "500" },

  sectionLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },

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
});
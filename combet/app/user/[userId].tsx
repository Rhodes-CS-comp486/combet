import React, { useEffect, useState, useCallback } from "react";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { Text, ActivityIndicator, Button, Divider, Portal, Modal } from "react-native-paper";
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
      onPress={() => isMember
        ? router.push({ pathname: `/circle-profile/${circle.circle_id}`, params: { from: "user", userId } } as any)
        : router.push({ pathname: `/circle-preview/${circle.circle_id}`, params: { userId } } as any)
      }
      style={{ alignItems: "center", marginRight: 14, width: 68, opacity: isMember ? 1 : 0.45 }}
    >
      <View style={{ width: 56, height: 56, position: "relative", overflow: "visible" }}>
        <View style={{
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: circle.icon_color ?? theme.colors.primary,
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name={(circle.icon as any) ?? "people"} size={24} color="#fff" />
        </View>

        {/* Privacy badge */}
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
          color: theme.colors.onSurface, fontSize: 11, fontWeight: "500",
          marginTop: 6, textAlign: "center", width: 68,
        }}
      >
        {circle.name}
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10, marginTop: 1 }}>
        {circle.member_count} members
      </Text>
    </TouchableOpacity>
  );
}

export default function UserProfileScreen() {
  const { userId }        = useLocalSearchParams<{ userId: string }>();
  const { theme, isDark } = useAppTheme();
  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [actioning, setActioning] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("bets");
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [isBlocked, setIsBlocked]                 = useState(false);
  const [showBlockModal, setShowBlockModal]        = useState(false);
  const [showBlockedScreen, setShowBlockedScreen] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!userId || userId === "undefined") return;
    // If viewing your own profile, redirect to the profile tab
    getSessionId().then(async (sessionId) => {
      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { "x-session-id": sessionId ?? "" },
        });
        if (res.ok) {
          const me = await res.json();
          if (me.id === userId) {
            router.replace("/(tabs)/profile");
            return;
          }
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
      const data = await res.json();
      setProfile(data);
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
      setProfile((prev) => prev ? {
        ...prev,
        is_following: false,
        follow_request_status: null,
      } : prev);
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
      } catch (err) {
        console.error("Unblock error:", err);
      }
    };



  if (loading) return (
    <GradientBackground>
      <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 80 }} />
    </GradientBackground>
  );

  if (!profile) return (
    <GradientBackground>
      <Text style={{ color: theme.colors.onSurface, textAlign: "center", marginTop: 80 }}>
        User not found.
      </Text>
    </GradientBackground>
  );

  if (showBlockedScreen) return (
      <GradientBackground style={{ paddingHorizontal: 20 }}>
        <View style={{ paddingTop: 16, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ alignSelf: "flex-start", paddingHorizontal: 4, paddingVertical: 7 }}>
            <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.75)" />
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
          <Text style={{ color: theme.colors.onSurface, fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
            @{profile.username} blocked
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 32, paddingHorizontal: 32 }}>
            They won't be able to message you or see your profile.
          </Text>
          <TouchableOpacity onPress={handleUnblock} style={{
            borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
            backgroundColor: "rgba(255,255,255,0.07)",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
          }}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}>Unblock</Text>
          </TouchableOpacity>
        </View>
      </GradientBackground>
    );

  const isPrivateAndNotFollowing = profile.is_private && !profile.is_following;
  const canSeeBets = !profile.is_private || (profile.is_following && profile.show_bets_to_followers);

  const renderFollowButton = () => {
    if (profile.is_following) return (
      <TouchableOpacity
        onPress={() => setShowUnfollowModal(true)}
        style={{
          flexDirection: "row", alignItems: "center", gap: 4,
          backgroundColor: "rgba(157,212,190,0.12)",
          borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
          borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
        }}
      >
        <Ionicons name="checkmark" size={12} color="#9dd4be" />
        <Text style={{ color: "#9dd4be", fontSize: 13, fontWeight: "600" }}>Following</Text>
        <Ionicons name="chevron-down" size={12} color="#9dd4be" style={{ marginLeft: 2 }} />
      </TouchableOpacity>
    );
    if (profile.follow_request_status === "pending") return (
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: theme.colors.surface,
        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
        borderWidth: 1, borderColor: theme.colors.outline,
      }}>
        <Ionicons name="time-outline" size={12} color={theme.colors.onSurfaceVariant} />
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>Requested</Text>
      </View>
    );
    return (
      <Button
        mode="contained"
        onPress={handleFollow}
        loading={actioning}
        style={{ borderRadius: 20 }}
        labelStyle={{ fontSize: 13 }}
      >
        {profile.is_private ? "Request to Follow" : "Follow"}
      </Button>
    );
  };

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: "bets",        label: "Bets Together", count: (profile.shared_bets ?? []).length },
    { key: "circle_bets", label: "Circle Bets",   count: (profile.circle_bets ?? []).length },
  ];

  // Merge circles: shared first (full opacity), then public-only (faded).
  // De-duplicate in case a circle appears in both arrays.
  const sharedIds = new Set((profile.shared_circles ?? []).map((c) => c.circle_id));
  const publicOnly = (profile.public_circles ?? []).filter((c) => !sharedIds.has(c.circle_id));
  const allCircles = [
    ...(profile.shared_circles ?? []).map((c) => ({ ...c, isMember: true })),
    ...publicOnly.map((c) => ({ ...c, isMember: false })),
  ];

  return (
    <GradientBackground>
      <Portal>
        <Modal
          visible={showUnfollowModal}
          onDismiss={() => setShowUnfollowModal(false)}
          contentContainerStyle={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            backgroundColor: "#1f3347",
            borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
            paddingBottom: 36,
          }}
        >
          <View style={{ padding: 24 }}>
            <View style={{
              width: 36, height: 4, borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignSelf: "center", marginBottom: 20,
            }} />
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 6, textAlign: "center" }}>
              Unfollow @{profile.username}?
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 24, lineHeight: 20, textAlign: "center" }}>
              You'll no longer see their updates and will need to follow them again.
            </Text>
            <TouchableOpacity
              onPress={handleUnfollow}
              style={{
                backgroundColor: "rgba(232,112,96,0.15)",
                borderRadius: 12, paddingVertical: 14, alignItems: "center",
                borderWidth: 1, borderColor: "rgba(232,112,96,0.4)",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "#e87060", fontSize: 15, fontWeight: "700" }}>Unfollow</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowUnfollowModal(false)}
              style={{
                borderRadius: 12, paddingVertical: 14, alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.07)",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
              }}
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>


        {/* ── Back ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ alignSelf: "flex-start", paddingHorizontal: 4, paddingVertical: 7 }}
          >
            <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
        </View>

        {/* ── Profile header ── */}
        <View style={{ alignItems: "center", paddingHorizontal: 20, paddingBottom: 24 }}>
          <UserAvatar
            user={{
              username:     profile.username,
              display_name: profile.display_name,
              avatar_color: profile.avatar_color,
              avatar_icon:  profile.avatar_icon,
            }}
            size={80}
          />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
              {profile.display_name}
            </Text>
            {profile.is_private && (
              <Ionicons name="lock-closed" size={14} color={theme.colors.onSurfaceVariant} />
            )}
          </View>

          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            @{profile.username}
          </Text>

          {/* Followers / Following — below username */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 4, gap: 8 }}>
            <TouchableOpacity
              disabled={isPrivateAndNotFollowing}
              onPress={() => router.push({ pathname: "/user/user-followers", params: { userId: profile.id, tab: "followers" } } as any)}
              style={{ flexDirection: "row", alignItems: "baseline" }}
            >
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: "600" }}>{profile.followers_count}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}> Followers</Text>
            </TouchableOpacity>
            <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.onSurfaceVariant, marginHorizontal: 2 }} />
            <TouchableOpacity
              disabled={isPrivateAndNotFollowing}
              onPress={() => router.push({ pathname: "/user/user-followers", params: { userId: profile.id, tab: "following" } } as any)}
              style={{ flexDirection: "row", alignItems: "baseline" }}
            >
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: "600" }}>{profile.following_count}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}> Following</Text>
            </TouchableOpacity>
          </View>

          {profile.bio ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 8, paddingHorizontal: 24 }}>
              {profile.bio}
            </Text>
          ) : null}

          {/* Stats — matches profile.tsx exactly */}
          <View style={{
            flexDirection: "row", marginTop: 20,
            backgroundColor: theme.colors.surface,
            borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, gap: 16,
          }}>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>{profile.total_bets}</Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>Bets</Text>
            </View>
            <View style={{ width: 1, backgroundColor: theme.colors.outline }} />
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text variant="titleLarge" style={{ color: "#9dd4be", fontWeight: "700" }}>{profile.wins}</Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>Wins</Text>
            </View>
            <View style={{ width: 1, backgroundColor: theme.colors.outline }} />
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text variant="titleLarge" style={{ color: "#e87060", fontWeight: "700" }}>{profile.losses}</Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>Losses</Text>
            </View>
          </View>
            {/* Follow + Message + Report buttons */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 }}>
              {renderFollowButton()}
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/(tabs)/inbox/dm", params: { userId: profile.id, username: profile.username } } as any)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
                }}
              >
                <Ionicons name="chatbubble-outline" size={14} color={theme.colors.onSurface} />
                <Text style={{ color: theme.colors.onSurface, fontSize: 13, fontWeight: "600" }}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity

                onPress={() => setReportVisible(true)}
                style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
                  justifyContent: "center", alignItems: "center",
                }}
              >
                <Ionicons name="flag-outline" size={15} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
                <TouchableOpacity
                  onPress={isBlocked ? handleUnblock : () => setShowBlockModal(true)}
                  style={{
                    width: 34, height: 34, borderRadius: 17,
                    backgroundColor: isBlocked ? "rgba(232,112,96,0.1)" : "rgba(255,255,255,0.05)",
                    borderWidth: 1, borderColor: isBlocked ? "rgba(232,112,96,0.3)" : "rgba(255,255,255,0.12)",
                    justifyContent: "center", alignItems: "center",
                  }}
                >
                  <Ionicons name="ban-outline" size={15} color={isBlocked ? "#e87060" : "rgba(255,255,255,0.3)"} />
                </TouchableOpacity>
            </View>
        </View>

        <Divider style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />

        {/* ── Private lockout ── */}
        {isPrivateAndNotFollowing ? (
          <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 40 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: "rgba(255,255,255,0.06)",
              alignItems: "center", justifyContent: "center", marginBottom: 16,
            }}>
              <Ionicons name="lock-closed-outline" size={32} color={theme.colors.onSurfaceVariant} />
            </View>
            <Text style={{ color: theme.colors.onSurface, fontSize: 16, fontWeight: "600", textAlign: "center", marginBottom: 8 }}>
              This account is private
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
              Follow this account to see their shared bets and circles.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Circles (single merged row) ── */}
            {allCircles.length > 0 && (
              <View style={{ paddingTop: 20, paddingBottom: 8 }}>
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 20, marginBottom: 14,
                }}>
                  <Text style={{
                    color: theme.colors.onSurfaceVariant, fontSize: 11,
                    fontWeight: "600", letterSpacing: 1, textTransform: "uppercase",
                  }}>
                    Circles
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
                    {sharedIds.size} shared · {allCircles.length} total
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4 }}
                >
                  {allCircles.map((circle) => (
                    <CirclePill
                      key={circle.circle_id}
                      circle={circle}
                      isMember={circle.isMember}
                      userId={userId}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {allCircles.length > 0 && (
              <Divider style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", marginTop: 8 }} />
            )}

            {/* ── Tabs ── */}
            <View style={{ flexDirection: "row", paddingHorizontal: 20, paddingTop: 4 }}>
              {TABS.map(({ key, label, count }) => {
                const active = activeTab === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setActiveTab(key)}
                    style={{
                      flex: 1, paddingVertical: 14, alignItems: "center",
                      borderBottomWidth: 2,
                      borderBottomColor: active ? theme.colors.primary : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Text style={{
                      fontSize: 13, fontWeight: active ? "700" : "400",
                      color: active ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                      marginBottom: 2,
                    }}>
                      {label}
                    </Text>
                    {count > 0 && (
                      <View style={{
                        backgroundColor: active ? theme.colors.primary : "rgba(255,255,255,0.12)",
                        borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: active ? "#fff" : theme.colors.onSurfaceVariant }}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ padding: 20 }}>

              {/* Bets Together */}
              {activeTab === "bets" && (
                (profile.shared_bets ?? []).length === 0 ? (
                  <View style={{ alignItems: "center", paddingTop: 48 }}>
                    <Ionicons name="receipt-outline" size={40} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, fontSize: 14, textAlign: "center" }}>
                      No shared bets yet.
                    </Text>
                  </View>
                ) : (
                  (profile.shared_bets ?? []).map((bet) => (
                    <BetCard key={bet.id} item={bet} mode="active" onRefresh={fetchProfile} />
                  ))
                )
              )}

              {/* Circle Bets */}
              {activeTab === "circle_bets" && (
                (profile.circle_bets ?? []).length === 0 ? (
                  <View style={{ alignItems: "center", paddingTop: 48 }}>
                    <Ionicons name="trophy-outline" size={40} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, fontSize: 14, textAlign: "center" }}>
                      No circle bets in common.
                    </Text>
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
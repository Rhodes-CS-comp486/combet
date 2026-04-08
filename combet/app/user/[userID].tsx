import React, { useEffect, useState } from "react";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { Text, ActivityIndicator, Button, Divider } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import UserAvatar from "@/components/UserAvatar";
import GradientBackground from "@/components/GradientBackground";
import BetCard from "@/components/BetCard";
import { API_BASE } from "@/constants/api";

type UserProfile = {
  id:                   string;
  username:             string;
  display_name:         string;
  bio:                  string;
  avatar_color:         string;
  avatar_icon:          string;
  is_private:           boolean;
  show_bets_to_followers: boolean;
  followers_count:      number;
  following_count:      number;
  total_bets:           number;
  wins:                 number;
  losses:               number;
  is_following:         boolean;
  follow_request_status: string | null;
  shared_bets:          any[];
  circle_bets:          any[];
  public_circles:       any[];
  bets:                 any[];
};

type TabKey = "bets" | "circle_bets" | "circles";

export default function UserProfileScreen() {
  const { userId }        = useLocalSearchParams<{ userId: string }>();
  const { theme, isDark } = useAppTheme();
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [actioning, setActioning] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("bets");

  useEffect(() => { void fetchProfile(); }, [userId]);

  const fetchProfile = async () => {
    try {
      const sessionId = await getSessionId();
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

  const isPrivateAndNotFollowing = profile.is_private && !profile.is_following;

  const renderFollowButton = () => {
    if (profile.is_following) return (
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: "rgba(157,212,190,0.12)",
        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
        borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
      }}>
        <Ionicons name="checkmark" size={12} color="#9dd4be" />
        <Text style={{ color: "#9dd4be", fontSize: 13, fontWeight: "600" }}>Following</Text>
      </View>
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

  const TABS: { key: TabKey; label: string; icon: string; count: number }[] = [
    { key: "bets",        label: "Bets Together", icon: "receipt-outline",  count: profile.shared_bets.length    },
    { key: "circle_bets", label: "Circle Bets",   icon: "trophy-outline",   count: profile.circle_bets.length    },
    { key: "circles",     label: "Circles",        icon: "people-outline",   count: profile.public_circles.length },
  ];

  return (
    <GradientBackground>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── Back button ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
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

          {/* Name + lock */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
            <Text style={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: 22 }}>
              {profile.display_name}
            </Text>
            {profile.is_private && (
              <Ionicons name="lock-closed" size={14} color={theme.colors.onSurfaceVariant} />
            )}
          </View>

          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, marginTop: 2 }}>
            @{profile.username}
          </Text>

          {/* Followers / Following */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 4, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={{ color: theme.colors.onSurface, fontWeight: "600" }}>{profile.followers_count}</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}> Followers</Text>
            </View>
            <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.onSurfaceVariant, marginHorizontal: 2 }} />
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={{ color: theme.colors.onSurface, fontWeight: "600" }}>{profile.following_count}</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}> Following</Text>
            </View>
          </View>

          {profile.bio ? (
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 8, paddingHorizontal: 24 }}>
              {profile.bio}
            </Text>
          ) : null}

          {/* Stats row */}
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

          {/* Follow button */}
          <View style={{ marginTop: 16 }}>
            {renderFollowButton()}
          </View>
        </View>

        <Divider style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />

        {/* ── Private lockout ── */}
        {isPrivateAndNotFollowing ? (
          <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 40 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: "rgba(255,255,255,0.06)",
              alignItems: "center", justifyContent: "center",
              marginBottom: 16,
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
            {/* ── Tabs ── */}
            <View style={{ flexDirection: "row", paddingHorizontal: 20, paddingTop: 4 }}>
              {TABS.map(({ key, label, count }) => {
                const active = activeTab === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setActiveTab(key)}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      alignItems: "center",
                      borderBottomWidth: 2,
                      borderBottomColor: active ? theme.colors.primary : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Text style={{
                      fontSize: 12, fontWeight: active ? "700" : "400",
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

              {/* ── Tab: Bets Together ── */}
              {activeTab === "bets" && (
                profile.shared_bets.length === 0 ? (
                  <View style={{ alignItems: "center", paddingTop: 48 }}>
                    <Ionicons name="receipt-outline" size={40} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, fontSize: 14, textAlign: "center" }}>
                      No shared bets yet.
                    </Text>
                  </View>
                ) : (
                  profile.shared_bets.map((bet) => (
                    <BetCard key={bet.id} item={bet} mode="active" onRefresh={fetchProfile} />
                  ))
                )
              )}

              {/* ── Tab: Circle Bets ── */}
              {activeTab === "circle_bets" && (
                profile.circle_bets.length === 0 ? (
                  <View style={{ alignItems: "center", paddingTop: 48 }}>
                    <Ionicons name="trophy-outline" size={40} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, fontSize: 14, textAlign: "center" }}>
                      No circle bets in common.
                    </Text>
                  </View>
                ) : (
                  profile.circle_bets.map((bet) => (
                    <BetCard key={bet.id} item={bet} mode="active" onRefresh={fetchProfile} />
                  ))
                )
              )}

              {/* ── Tab: Circles ── */}
              {activeTab === "circles" && (
                profile.public_circles.length === 0 ? (
                  <View style={{ alignItems: "center", paddingTop: 48 }}>
                    <Ionicons name="people-outline" size={40} color={theme.colors.onSurfaceVariant} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, fontSize: 14, textAlign: "center" }}>
                      No public circles.
                    </Text>
                  </View>
                ) : (
                  profile.public_circles.map((circle) => (
                    <TouchableOpacity
                      key={circle.circle_id}
                      onPress={() => router.push(`/circle-profile/${circle.circle_id}`)}
                    >
                      <View style={{
                        flexDirection: "row", alignItems: "center", gap: 12,
                        backgroundColor: "rgba(255,255,255,0.07)",
                        borderRadius: 14, padding: 14, marginBottom: 10,
                        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
                      }}>
                        <View style={{
                          width: 44, height: 44, borderRadius: 22,
                          backgroundColor: circle.icon_color ?? theme.colors.primary,
                          alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <Ionicons name={(circle.icon as any) ?? "people"} size={20} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.onSurface, fontWeight: "600", fontSize: 14 }}>
                            {circle.name}
                          </Text>
                          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                            {circle.member_count} members
                          </Text>
                        </View>
                        {circle.am_member ? (
                          <View style={{
                            backgroundColor: "rgba(157,212,190,0.12)",
                            borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
                            borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
                          }}>
                            <Text style={{ color: "#9dd4be", fontSize: 11, fontWeight: "600" }}>Member</Text>
                          </View>
                        ) : (
                          <View style={{
                            backgroundColor: theme.colors.primary,
                            borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                          }}>
                            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>Join</Text>
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceVariant} />
                      </View>
                    </TouchableOpacity>
                  ))
                )
              )}
            </View>
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}
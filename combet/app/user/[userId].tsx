import React, { useEffect, useState } from "react";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { Text, ActivityIndicator, Button } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import UserAvatar from "@/components/UserAvatar";
import GradientBackground from "@/components/GradientBackground";
import BetCard from "@/components/BetCard";
import { API_BASE } from "@/constants/api";

type UserProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_color: string;
  avatar_icon: string;
  is_private: boolean;
  show_bets_to_followers: boolean;
  followers_count: number;
  following_count: number;
  total_bets: number;
  wins: number;
  losses: number;
  is_following: boolean;
  follow_request_status: string | null;
  shared_bets: any[];
  bets: any[];
};

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

    console.log("userId param:", userId);
  const { theme } = useAppTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    if (!userId || userId === "undefined") return;
    void fetchProfile();
  }, [userId]);

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
        is_following: data.status === "following",
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
  const canSeeBets = !profile.is_private || (profile.is_following && profile.show_bets_to_followers);

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

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

        {/* ── Back button ── */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>

        {/* ── Header ── */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <UserAvatar
            user={{
              username:     profile.username,
              display_name: profile.display_name,
              avatar_color: profile.avatar_color,
              avatar_icon:  profile.avatar_icon,
            }}
            size={72}
          />
          <Text style={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: 20, marginTop: 12 }}>
            {profile.display_name}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, marginTop: 2 }}>
            @{profile.username}
          </Text>
          {profile.bio ? (
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 8, paddingHorizontal: 24 }}>
              {profile.bio}
            </Text>
          ) : null}

          {/* Follow/Requested button */}
          <View style={{ marginTop: 14 }}>
            {renderFollowButton()}
          </View>

          {/* Private badge */}
          {profile.is_private && (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8,
              backgroundColor: "rgba(239,68,68,0.1)",
              borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
            }}>
              <Ionicons name="lock-closed" size={10} color="#ef4444" />
              <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "500" }}>Private</Text>
            </View>
          )}
        </View>

        {/* ── Stats ── */}
        <View style={{
          flexDirection: "row",
          backgroundColor: theme.colors.surface,
          borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24,
          gap: 16, marginBottom: 24,
        }}>
          {[
            { label: "Bets",   value: profile.total_bets },
            { label: "Wins",   value: profile.wins },
            { label: "Losses", value: profile.losses },
            { label: "Followers", value: profile.followers_count },
          ].map(({ label, value }, i, arr) => (
            <React.Fragment key={label}>
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: 18 }}>{value}</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginTop: 2 }}>{label}</Text>
              </View>
              {i < arr.length - 1 && (
                <View style={{ width: 1, backgroundColor: theme.colors.outline }} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* ── Private lockout ── */}
        {isPrivateAndNotFollowing ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Ionicons name="lock-closed-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, fontSize: 14, textAlign: "center" }}>
              This account is private.{"\n"}Follow to see their bets.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Bets with you ── */}
            {profile.shared_bets.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: 16, marginBottom: 12 }}>
                  Bets with you
                </Text>
                {profile.shared_bets.map((bet) => (
                  <BetCard
                    key={bet.id}
                    item={bet}
                    mode="active"
                    onRefresh={fetchProfile}
                  />
                ))}
              </View>
            )}

            {/* ── All their bets ── */}
            {canSeeBets && profile.bets.length > 0 && (
              <View>
                <Text style={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: 16, marginBottom: 12 }}>
                  All bets
                </Text>
                {profile.bets.map((bet) => (
                  <BetCard
                    key={bet.id}
                    item={bet}
                    mode="active"
                    onRefresh={fetchProfile}
                  />
                ))}
              </View>
            )}

            {profile.shared_bets.length === 0 && !canSeeBets && (
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <Ionicons name="receipt-outline" size={48} color={theme.colors.onSurfaceVariant} />
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, fontSize: 14 }}>
                  No shared bets yet.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}
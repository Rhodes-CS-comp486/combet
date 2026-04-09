import React, { useEffect, useState } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import UserAvatar from "@/components/UserAvatar";
import GradientBackground from "@/components/GradientBackground";
import { API_BASE } from "@/constants/api";
import PageHeader from "@/components/PageHeader";

type TabKey = "followers" | "following";

type FollowUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_icon: string;
  is_private: boolean;
  is_following_back: boolean;
  follow_requested: boolean;
};

export default function UserFollowersScreen() {
  const { userId, tab } = useLocalSearchParams<{ userId: string; tab: TabKey }>();
  const { theme, isDark } = useAppTheme();

  const [activeTab, setActiveTab] = useState<TabKey>(tab === "following" ? "following" : "followers");
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [myId, setMyId]           = useState<string | null>(null);

  useEffect(() => { void fetchBoth(); }, [userId]);

  const fetchBoth = async () => {
    try {
      const sessionId = await getSessionId();
      const headers   = { "x-session-id": sessionId ?? "" };
      // Fetch current user's id alongside the lists
      const [meRes, followersRes, followingRes] = await Promise.all([
        fetch(`${API_BASE}/users/me`, { headers }),
        fetch(`${API_BASE}/users/${userId}/followers`, { headers }),
        fetch(`${API_BASE}/users/${userId}/following`, { headers }),
      ]);
      if (meRes.ok) { const me = await meRes.json(); setMyId(String(me.id)); }
      if (followersRes.ok) setFollowers(await followersRes.json());
      if (followingRes.ok) setFollowing(await followingRes.json());
    } catch (err) {
      console.error("User followers fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const followUser = async (targetId: string) => {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/users/follows`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
        body: JSON.stringify({ followingId: targetId }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      const update = (list: FollowUser[]) =>
        list.map((u) =>
          u.id === targetId
            ? {
                ...u,
                is_following_back: data.status === "following",
                follow_requested:  data.status === "requested",
              }
            : u
        );
      setFollowers(update);
      setFollowing(update);
    } catch (err) {
      console.error("followUser error:", err);
    }
  };

  const list = activeTab === "followers" ? followers : following;

  const renderItem = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity
      onPress={() => router.push(`/user/${item.id}` as any)}
      style={{
        flexDirection: "row", alignItems: "center",
        paddingVertical: 12, gap: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      }}
    >
      <UserAvatar
        user={{
          username:     item.username,
          display_name: item.display_name,
          avatar_color: item.avatar_color,
          avatar_icon:  item.avatar_icon,
        }}
        size={42}
      />

      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.onSurface, fontWeight: "600", fontSize: 14 }}>
          {item.display_name}
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 1 }}>
          @{item.username}
        </Text>
      </View>

      {/* Follow status button — hidden if this is the current user */}
      {String(item.id) !== myId && (
        item.follow_requested ? (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
          borderWidth: 0.5, borderColor: theme.colors.outline,
          flexDirection: "row", alignItems: "center", gap: 4,
        }}>
          <Ionicons name="time-outline" size={12} color={theme.colors.onSurfaceVariant} />
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Requested</Text>
        </View>
      ) : item.is_following_back ? (
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
          borderWidth: 0.5, borderColor: theme.colors.outline,
          flexDirection: "row", alignItems: "center", gap: 4,
        }}>
          <Ionicons name="checkmark" size={12} color={theme.colors.onSurfaceVariant} />
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Following</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); void followUser(item.id); }}
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>Follow</Text>
        </TouchableOpacity>
        )
      )}
    </TouchableOpacity>
  );

  return (
    <GradientBackground style={{ paddingHorizontal: 20 }}>
      <PageHeader title="" />

      {/* ── Tabs ── */}
      <View style={{ flexDirection: "row", marginBottom: 4 }}>
        {(["followers", "following"] as TabKey[]).map((key) => {
          const active = activeTab === key;
          const count  = key === "followers" ? followers.length : following.length;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              style={{
                flex: 1, paddingVertical: 12, alignItems: "center",
                borderBottomWidth: 2,
                borderBottomColor: active ? theme.colors.primary : "rgba(255,255,255,0.08)",
              }}
            >
              <Text style={{
                fontSize: 13, fontWeight: active ? "600" : "400",
                color: active ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
              }}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
              {!loading && (
                <View style={{
                  marginTop: 4,
                  backgroundColor: active ? theme.colors.primary : "rgba(255,255,255,0.10)",
                  borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1,
                }}>
                  <Text style={{
                    fontSize: 10, fontWeight: "600",
                    color: active ? "#fff" : theme.colors.onSurfaceVariant,
                  }}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ── */}
      {loading ? (
        <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 60 }} />
      ) : list.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 40 }}>
          <Ionicons
            name={activeTab === "followers" ? "people-outline" : "person-add-outline"}
            size={48}
            color={theme.colors.onSurfaceVariant}
          />
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14, marginTop: 12, textAlign: "center" }}>
            {activeTab === "followers" ? "No followers yet." : "Not following anyone yet."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </GradientBackground>
  );
}
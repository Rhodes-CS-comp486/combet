import React, { useEffect, useState } from "react";
import { View, FlatList } from "react-native";
import { Text, Searchbar, Button, Chip } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import PageHeader from "@/components/PageHeader";
import { API_BASE } from "@/constants/api";
import GradientBackground from "@/components/GradientBackground";
import UserAvatar from "@/components/UserAvatar";

type FriendResult = {
  id: string;
  username: string;
  avatar_color?: string;
  avatar_icon?: string;
  status: "pending" | "accepted" | null;
  invitedByMe?: boolean;
};

export default function AddFriendToCircle() {
  const { theme, isDark } = useAppTheme();
  const { id } = useLocalSearchParams();
  const circleId = id as string;

  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<FriendResult[]>([]);

  useEffect(() => {
    if (query.length > 0) searchFriends();
    else setResults([]);
  }, [query]);

  const searchFriends = async () => {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(
        `${API_BASE}/circles/${circleId}/search-friends?q=${query}`,
        { headers: { "x-session-id": sessionId || "" } }
      );
      setResults(await res.json());
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const requestFriend = async (userId: string) => {
    try {
      const sessionId = await getSessionId();
      await fetch(`${API_BASE}/circles/${circleId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId || "" },
        body: JSON.stringify({ inviteeId: userId }),
      });
      updateLocalStatus(userId, "pending", true);
    } catch (err) {
      console.error("Request error:", err);
    }
  };

  const retractRequest = async (userId: string) => {
    try {
      const sessionId = await getSessionId();
      await fetch(`${API_BASE}/circles/${circleId}/retract/${userId}`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId || "" },
      });
      updateLocalStatus(userId, null);
    } catch (err) {
      console.error("Retract error:", err);
    }
  };

  const updateLocalStatus = (
    userId: string,
    newStatus: "pending" | "accepted" | null,
    invitedByMe = false
  ) => {
    setResults((prev) =>
      prev.map((u) => u.id === userId ? { ...u, status: newStatus, invitedByMe } : u)
    );
  };

  const renderAction = (item: FriendResult) => {
    if (item.status === "accepted") {
      return (
        <Chip icon="check-circle"
          style={{ backgroundColor: isDark ? "#0a2a1a" : "#e6f9ee" }}
          textStyle={{ color: "#22c55e", fontSize: 12 }}>
          In Circle
        </Chip>
      );
    }
    if (item.status === "pending" && item.invitedByMe) {
      return (
        <Button mode="outlined" compact onPress={() => retractRequest(item.id)}
          style={{ borderRadius: 999, borderColor: theme.colors.onSurfaceVariant }}
          labelStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          Requested
        </Button>
      );
    }
    if (item.status === "pending") {
      return (
        <Chip style={{ backgroundColor: isDark ? "#1a2a3a" : "#f0f4ff" }}
          textStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          Pending
        </Chip>
      );
    }
    return (
      <Button mode="contained" compact onPress={() => requestFriend(item.id)}
        style={{ borderRadius: 999 }} labelStyle={{ fontSize: 12, fontWeight: "700" }}>
        Add
      </Button>
    );
  };

  return (
    <GradientBackground style={{ paddingHorizontal: 20 }}>
      <PageHeader title="Add Friends" />

      <View style={{
        backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 16,
      }}>
        <Searchbar
          placeholder="Search your friends..."
          value={query}
          onChangeText={setQuery}
          style={{ borderRadius: 12, backgroundColor: "transparent", elevation: 0 }}
          inputStyle={{ color: theme.colors.onSurface }}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 32, fontSize: 14 }}>
            {query.length > 0 ? "No friends found" : "Search to find friends to add"}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.09)",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
            borderRadius: 14, padding: 14, marginBottom: 10,
          }}>
            <UserAvatar
              user={{ display_name: item.username, username: item.username, avatar_color: item.avatar_color, avatar_icon: item.avatar_icon }}
              size={44}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
                {item.username}
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>@{item.username}</Text>
            </View>
            {renderAction(item)}
          </View>
        )}
      />
    </GradientBackground>
  );
}
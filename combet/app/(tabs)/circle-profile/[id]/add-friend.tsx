import React, { useEffect, useState } from "react";
import { View, FlatList } from "react-native";
import { Text, Searchbar, Surface, Button, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import BackHeader from "@/components/Backheader";

type FriendResult = {
  id: string;
  username: string;
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
        `http://localhost:3001/circles/${circleId}/search-friends?q=${query}`,
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
      await fetch(`http://localhost:3001/circles/${circleId}/invite`, {
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
      await fetch(`http://localhost:3001/circles/${circleId}/retract/${userId}`, {
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

  const cardBg = isDark ? "#0F2A44" : "#ffffff";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BackHeader label="Circle Profile" href={`/circle-profile/${circleId}`} />

      <View style={{ flex: 1, padding: 20 }}>
        <Text variant="headlineSmall" style={{
          color: theme.colors.onSurface, fontWeight: "800",
          textAlign: "center", marginBottom: 24,
        }}>
          Add Friends
        </Text>

        <Searchbar
          placeholder="Search your friends..."
          value={query}
          onChangeText={setQuery}
          style={{
            borderRadius: 12, marginBottom: 20,
            backgroundColor: isDark ? "#0F223A" : "#ffffff",
          }}
          inputStyle={{ color: theme.colors.onSurface }}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text variant="bodyMedium" style={{
              color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 32,
            }}>
              {query.length > 0 ? "No friends found" : "Search to find friends to add"}
            </Text>
          }
          renderItem={({ item }) => (
            <Surface elevation={1} style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: cardBg, borderRadius: 14,
              padding: 14, marginBottom: 10,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: "rgba(46,108,246,0.15)",
                borderWidth: 1.5, borderColor: "rgba(46,108,246,0.35)",
                alignItems: "center", justifyContent: "center", marginRight: 14,
              }}>
                <Ionicons name="person" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
                  {item.username}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  @{item.username}
                </Text>
              </View>
              {renderAction(item)}
            </Surface>
          )}
        />
      </View>
    </View>
  );
}
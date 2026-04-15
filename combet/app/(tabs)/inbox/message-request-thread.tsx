import React, { useCallback, useState } from "react";
import { View, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import UserAvatar from "@/components/UserAvatar";
import { API_BASE } from "@/constants/api";

type MessageRequest = {
  message_id:      string;
  content:         string;
  created_at:      string;
};

export default function MessageRequestThreadScreen() {
  const { theme, isDark } = useAppTheme();
  const {
    senderId, senderUsername, senderAvatarColor, senderAvatarIcon,
  } = useLocalSearchParams<{
    senderId: string; senderUsername: string;
    senderAvatarColor: string; senderAvatarIcon: string;
  }>();

  const [messages, setMessages] = useState<MessageRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [actioning, setActioning] = useState(false);

  useFocusEffect(useCallback(() => {
    void fetchMessages();
  }, [senderId]));

  const fetchMessages = async () => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/messages/requests`, {
        headers: { "x-session-id": sessionId },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data.filter((m: any) => m.sender_id === senderId)
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      }
    } catch (err) {
      console.error("Fetch request thread error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (actioning || messages.length === 0) return;
    setActioning(true);
    try {
      const sessionId = await getSessionId();
      // Accept all messages from this sender
      await Promise.all(messages.map((m) =>
        fetch(`${API_BASE}/messages/requests/${m.message_id}/accept`, {
          method: "PATCH",
          headers: { "x-session-id": sessionId ?? "" },
        })
      ));
      // Navigate to their DM thread
      router.replace({
        pathname: "/(tabs)/inbox/dm",
        params: { userId: senderId, username: senderUsername },
      } as any);
    } catch (err) {
      console.error("Accept error:", err);
    } finally {
      setActioning(false);
    }
  };

  const handleDecline = async () => {
    if (actioning || messages.length === 0) return;
    setActioning(true);
    try {
      const sessionId = await getSessionId();
      await Promise.all(messages.map((m) =>
        fetch(`${API_BASE}/messages/requests/${m.message_id}`, {
          method: "DELETE",
          headers: { "x-session-id": sessionId ?? "" },
        })
      ));
      router.back();
    } catch (err) {
      console.error("Decline error:", err);
    } finally {
      setActioning(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <GradientBackground>
      {/* ── Header ── */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push(`/user/${senderId}` as any)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <UserAvatar
            user={{
              username:     senderUsername,
              avatar_color: senderAvatarColor,
              avatar_icon:  senderAvatarIcon,
            }}
            size={34}
          />
          <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.onSurface }}>
            @{senderUsername}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Notice banner ── */}
      <View style={{
        marginHorizontal: 16, marginTop: 12, marginBottom: 4,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
      }}>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
          You don't follow @{senderUsername}. Accept or decline their message request.
        </Text>
      </View>

      {/* ── Messages ── */}
      {loading ? (
        <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.message_id}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const nextItem = messages[index + 1];
            const isLastInGroup = !nextItem;
            return (
              <View style={{ marginBottom: 2 }}>
                <View style={{
                  flexDirection: "row", alignItems: "flex-end",
                  paddingHorizontal: 12,
                  marginBottom: isLastInGroup ? 8 : 2,
                }}>
                  {/* Avatar + username below, only on last bubble */}
                  <View style={{ width: 38, marginRight: 6, alignItems: "center", justifyContent: "flex-end" }}>
                    {isLastInGroup ? (
                      <TouchableOpacity
                        onPress={() => router.push(`/user/${senderId}` as any)}
                        style={{ alignItems: "center" }}
                      >
                        <UserAvatar
                          user={{
                            username:     senderUsername,
                            avatar_color: senderAvatarColor,
                            avatar_icon:  senderAvatarIcon,
                          }}
                          size={28}
                        />
                        <Text numberOfLines={1} style={{
                          fontSize: 9, color: theme.colors.onSurfaceVariant,
                          marginTop: 2, textAlign: "center", width: 38,
                        }}>
                          @{senderUsername}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ width: 28, height: 28 }} />
                    )}
                  </View>

                  {/* Bubble + time */}
                  <View style={{ maxWidth: "72%" }}>
                    <View style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)",
                      borderRadius: 18, borderBottomLeftRadius: 4,
                      paddingHorizontal: 14, paddingVertical: 10,
                    }}>
                      <Text style={{ color: theme.colors.onSurface, fontSize: 14, lineHeight: 20 }}>
                        {item.content}
                      </Text>
                    </View>
                    {isLastInGroup && (
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10, marginTop: 3, marginLeft: 2 }}>
                        {formatTime(item.created_at)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ── Accept / Decline ── */}
      <View style={{
        flexDirection: "row", gap: 12,
        paddingHorizontal: 16, paddingVertical: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
      }}>
        <TouchableOpacity
          onPress={handleAccept}
          disabled={actioning}
          style={{
            flex: 1, paddingVertical: 14, borderRadius: 12,
            backgroundColor: theme.colors.primary, alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            {actioning ? "..." : "Accept"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDecline}
          disabled={actioning}
          style={{
            flex: 1, paddingVertical: 14, borderRadius: 12,
            backgroundColor: "rgba(232,112,96,0.12)",
            borderWidth: 1, borderColor: "rgba(232,112,96,0.4)",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#e87060", fontWeight: "700", fontSize: 15 }}>Decline</Text>
        </TouchableOpacity>
      </View>
    </GradientBackground>
  );
}
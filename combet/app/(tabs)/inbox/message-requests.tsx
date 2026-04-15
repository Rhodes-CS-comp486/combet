import React, { useCallback, useState } from "react";
import { View, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import UserAvatar from "@/components/UserAvatar";
import { API_BASE } from "@/constants/api";

type MessageRequest = {
  message_id:          string;
  content:             string;
  created_at:          string;
  sender_id:           string;
  sender_username:     string;
  sender_avatar_color: string;
  sender_avatar_icon:  string;
};

type GroupedRequest = {
  sender_id:           string;
  sender_username:     string;
  sender_avatar_color: string;
  sender_avatar_icon:  string;
  last_message:        string;
  last_message_at:     string;
  message_count:       number;
};

export default function MessageRequestsScreen() {
  const { theme, isDark } = useAppTheme();
  const [grouped, setGrouped] = useState<GroupedRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    void fetchRequests();
  }, []));

  const fetchRequests = async () => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/messages/requests`, {
        headers: { "x-session-id": sessionId },
      });
      const data: MessageRequest[] = await res.json();
      if (!Array.isArray(data)) return;

      // Group by sender_id, keep latest message as preview
      const map = new Map<string, GroupedRequest>();
      for (const msg of data) {
        const existing = map.get(msg.sender_id);
        if (!existing || new Date(msg.created_at) > new Date(existing.last_message_at)) {
          map.set(msg.sender_id, {
            sender_id:           msg.sender_id,
            sender_username:     msg.sender_username,
            sender_avatar_color: msg.sender_avatar_color,
            sender_avatar_icon:  msg.sender_avatar_icon,
            last_message:        msg.content,
            last_message_at:     msg.created_at,
            message_count:       (existing?.message_count ?? 0) + 1,
          });
        } else {
          existing.message_count += 1;
        }
      }
      // Sort by most recent
      setGrouped(Array.from(map.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      ));
    } catch (err) {
      console.error("Fetch message requests error:", err);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return "just now";
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const renderItem = ({ item }: { item: GroupedRequest }) => (
    <TouchableOpacity
      onPress={() => router.push({
        pathname: "/(tabs)/inbox/message-request-thread",
        params: {
          senderId:           item.sender_id,
          senderUsername:     item.sender_username,
          senderAvatarColor:  item.sender_avatar_color,
          senderAvatarIcon:   item.sender_avatar_icon,
        },
      } as any)}
      style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      }}
    >
      <UserAvatar
        user={{
          username:     item.sender_username,
          avatar_color: item.sender_avatar_color,
          avatar_icon:  item.sender_avatar_icon,
        }}
        size={48}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: theme.colors.onSurface, fontSize: 15, fontWeight: "600" }}>
            @{item.sender_username}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
            {timeAgo(item.last_message_at)}
          </Text>
        </View>
        <Text numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, marginTop: 2 }}>
          {item.last_message}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceVariant} />
    </TouchableOpacity>
  );

  return (
    <GradientBackground>
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "300", letterSpacing: 2, color: theme.colors.onSurface }}>
          Message requests
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 60 }} />
      ) : grouped.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Ionicons name="mail-open-outline" size={52} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 14 }} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
            No message requests
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            Messages from people you don't follow will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.sender_id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </GradientBackground>
  );
}
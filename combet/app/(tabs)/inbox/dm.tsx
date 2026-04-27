import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useUser } from "@/context/UserContext";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import UserAvatar from "@/components/UserAvatar";
import { API_BASE } from "@/constants/api";

type Message = {
  message_id:          string;
  sender_id:           string;
  content:             string;
  is_read:             boolean;
  created_at:          string;
  sender_username:     string;
  sender_avatar_color: string;
  sender_avatar_icon:  string;
};

export default function DMScreen() {
  const { userId: otherUserId, username, avatarColor, avatarIcon } = useLocalSearchParams<{
    userId: string; username: string; avatarColor?: string; avatarIcon?: string;
  }>();
  const { theme, isDark } = useAppTheme();
  const { setUnreadCount } = useUser();

  const [messages, setMessages]     = useState<Message[]>([]);
  const [myId, setMyId]             = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [text, setText]             = useState("");
  const [sending, setSending]       = useState(false);
  const flatListRef                 = useRef<FlatList>(null);

  // Fetch current user id once
  useEffect(() => {
    (async () => {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (res.ok) {
        const me = await res.json();
        setMyId(me.id);
      }
    })();
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/messages/${otherUserId}`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        // Backend marks this thread's messages as read on fetch —
        // re-fetch the true unread count so the dot updates correctly
        const sid = await getSessionId();
        if (sid) {
          const countRes = await fetch(`${API_BASE}/messages/unread-count`, {
            headers: { "x-session-id": sid },
          });
          if (countRes.ok) {
            const { count } = await countRes.json();
            // Also fetch unread notifications to keep total accurate
            const notifRes = await fetch(`${API_BASE}/inbox`, {
              headers: { "x-session-id": sid },
            });
            const notifCount = notifRes.ok
              ? (await notifRes.json() as any[]).filter((n: any) => !n.is_read).length
              : 0;
            setUnreadCount(notifCount + count);
          }
        }
      }
    } catch (err) {
      console.error("Fetch DM error:", err);
    } finally {
      setLoading(false);
    }
  }, [otherUserId]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  // Scroll to bottom when messages load or new one arrives
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
        body: JSON.stringify({ recipientId: otherUserId, content }),
      });
      if (res.ok) {
        const data = await res.json();
        // Optimistically add to list
        setMessages((prev) => [...prev, {
          message_id: data.message_id,
          sender_id:  myId!,
          content,
          is_read:    false,
          created_at: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      console.error("Send DM error:", err);
    } finally {
      setSending(false);
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

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === myId;
    const prevItem = messages[index - 1];
    const nextItem = messages[index + 1];
    const isLastInGroup  = !nextItem || nextItem.sender_id !== item.sender_id;
    const showTimestamp  = !prevItem ||
      (new Date(item.created_at).getTime() - new Date(prevItem.created_at).getTime()) > 5 * 60 * 1000;

    return (
      <View style={{ marginBottom: 2 }}>
        {showTimestamp && (
          <Text style={{
            textAlign: "center", fontSize: 11,
            color: theme.colors.onSurfaceVariant,
            marginVertical: 12,
          }}>
            {timeAgo(item.created_at)}
          </Text>
        )}
        <View style={{
          flexDirection: "row",
          justifyContent: isMe ? "flex-end" : "flex-start",
          alignItems: "flex-end",
          paddingHorizontal: 12,
          marginBottom: isLastInGroup ? 8 : 2,
        }}>
          {/* Avatar + username below — left side only, last message in group */}
          {!isMe && (
            <View style={{ width: 38, marginRight: 6, alignItems: "center", justifyContent: "flex-end" }}>
              {isLastInGroup ? (
                <TouchableOpacity
                  onPress={() => router.push(`/user/${item.sender_id}` as any)}
                  style={{ alignItems: "center" }}
                >
                  <UserAvatar
                    user={{
                      username:     item.sender_username,
                      avatar_color: item.sender_avatar_color,
                      avatar_icon:  item.sender_avatar_icon,
                    }}
                    size={28}
                  />
                  <Text numberOfLines={1} style={{
                    fontSize: 9, color: theme.colors.onSurfaceVariant,
                    marginTop: 2, textAlign: "center", width: 38,
                  }}>
                    @{item.sender_username}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 28, height: 28 }} />
              )}
            </View>
          )}

          {/* Bubble + time */}
          <View style={{ maxWidth: "72%" }}>
            <View style={{
              backgroundColor: isMe
                ? theme.colors.primary
                : isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)",
              borderRadius: 18,
              borderBottomRightRadius: isMe ? 4 : 18,
              borderBottomLeftRadius:  isMe ? 18 : 4,
              paddingHorizontal: 14, paddingVertical: 10,
            }}>
              <Text style={{
                color: isMe ? "#fff" : theme.colors.onSurface,
                fontSize: 14, lineHeight: 20,
              }}>
                {item.content}
              </Text>
            </View>
            {isLastInGroup && (
              <Text style={{
                fontSize: 10, color: theme.colors.onSurfaceVariant,
                marginTop: 3,
                textAlign: isMe ? "right" : "left",
              }}>
                {timeAgo(item.created_at)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ── */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 12,
          paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/user/${otherUserId}` as any)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
          >
            <UserAvatar
              user={{
                username:     username,
                avatar_color: avatarColor ?? messages.find(m => m.sender_id !== myId)?.sender_avatar_color,
                avatar_icon:  avatarIcon  ?? messages.find(m => m.sender_id !== myId)?.sender_avatar_icon,
              }}
              size={36}
            />
            <View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.onSurface }}>
                @{username}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Messages ── */}
        {loading ? (
          <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 60 }} />
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="chatbubble-outline" size={44} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 15 }}>
              No messages yet
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, marginTop: 6 }}>
              Say hi to @{username}!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.message_id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* ── Input bar ── */}
        <View style={{
          flexDirection: "row", alignItems: "flex-end", gap: 10,
          paddingHorizontal: 16, paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
        }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
            maxLength={500}
            style={{
              flex: 1,
              color: theme.colors.onSurface,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              borderRadius: 20,
              paddingHorizontal: 16, paddingVertical: 10,
              fontSize: 14, maxHeight: 100,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: text.trim() ? theme.colors.primary : "rgba(255,255,255,0.1)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import { API_BASE } from "@/constants/api";

const POLL_INTERVAL_MS = 4000;
const CHAR_LIMIT = 500;

type Message = {
  message_id: number;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_color: string | null;
  avatar_icon: string | null;
};

function Avatar({ color, icon, size = 32 }: { color: string | null; icon: string | null; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color ?? "#2563eb",
      alignItems: "center", justifyContent: "center",
    }}>
      <Ionicons name={(icon as any) || "person"} size={size * 0.55} color="#fff" />
    </View>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function CircleInboxScreen() {
  const router            = useRouter();
  const { id, name }      = useLocalSearchParams();
  const circleId          = Array.isArray(id)   ? id[0]   : id;
  const circleName        = Array.isArray(name) ? name[0] : name ?? "Circle Chat";
  const { theme, isDark } = useAppTheme();

  const [messages, setMessages]     = useState<Message[]>([]);
  const [inputText, setInputText]   = useState("");
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [myUserId, setMyUserId]     = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(true);

  const flatListRef   = useRef<FlatList>(null);
  const pollTimer     = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestMsgId   = useRef<number>(0);

  // ── Fetch my user id once ──
  useEffect(() => {
    (async () => {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (res.ok) {
        const data = await res.json();
        setMyUserId(data.id);
      }
    })();
  }, []);

  // ── Initial load ──
  useEffect(() => {
    loadInitial();
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [circleId]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/circles/${circleId}/messages`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(data);
        if (data.length > 0) {
          latestMsgId.current = data[data.length - 1].message_id;
        }
        if (data.length < 40) setHasMore(false);
      }
    } catch (err) {
      console.error("loadInitial error:", err);
    } finally {
      setLoading(false);
      startPolling();
    }
  };

  // ── Polling ──
  const startPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      try {
        const sessionId = await getSessionId();
        const res = await fetch(
          `${API_BASE}/circles/${circleId}/messages/since/${latestMsgId.current}`,
          { headers: { "x-session-id": sessionId ?? "" } }
        );
        if (res.ok) {
          const newMsgs: Message[] = await res.json();
          if (newMsgs.length > 0) {
            latestMsgId.current = newMsgs[newMsgs.length - 1].message_id;
            setMessages((prev) => {
              // Deduplicate by message_id
              const existingIds = new Set(prev.map((m) => m.message_id));
              const fresh = newMsgs.filter((m) => !existingIds.has(m.message_id));
              return fresh.length > 0 ? [...prev, ...fresh] : prev;
            });
          }
        }
      } catch (err) {
        // Silently ignore poll errors
      }
    }, POLL_INTERVAL_MS);
  }, [circleId]);

  // ── Load older messages ──
  const loadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const sessionId = await getSessionId();
      const oldest = messages[0].message_id;
      const res = await fetch(
        `${API_BASE}/circles/${circleId}/messages?before=${oldest}`,
        { headers: { "x-session-id": sessionId ?? "" } }
      );
      if (res.ok) {
        const older: Message[] = await res.json();
        if (older.length === 0) { setHasMore(false); return; }
        if (older.length < 40) setHasMore(false);
        setMessages((prev) => [...older, ...prev]);
      }
    } catch (err) {
      console.error("loadMore error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Send ──
  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText("");
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/circles/${circleId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId ?? "",
        },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const msg: Message = await res.json();
        latestMsgId.current = msg.message_id;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.message_id));
          return existingIds.has(msg.message_id) ? prev : [...prev, msg];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        setInputText(text); // restore on failure
      }
    } catch (err) {
      console.error("sendMessage error:", err);
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  // ── Bubble ──
  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.user_id === myUserId;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showHeader = !prevMsg || prevMsg.user_id !== item.user_id;

    const bubbleBg = isMe
      ? theme.colors.primary
      : isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.06)";

    const bubbleText = isMe
      ? "#fff"
      : theme.colors.onSurface;

    return (
      <View style={[
        styles.messageRow,
        isMe ? styles.messageRowMe : styles.messageRowThem,
        { marginTop: showHeader ? 12 : 2 },
      ]}>
        {/* Avatar — only show for others, only on first bubble in a group */}
        {!isMe && (
          <View style={{ width: 32, marginRight: 8, alignSelf: "flex-end" }}>
            {showHeader
              ? <Avatar color={item.avatar_color} icon={item.avatar_icon} size={32} />
              : <View style={{ width: 32 }} />
            }
          </View>
        )}

        <View style={{ maxWidth: "72%", alignItems: isMe ? "flex-end" : "flex-start" }}>
          {showHeader && !isMe && (
            <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginBottom: 3, marginLeft: 2 }}>
              {item.username}
            </Text>
          )}
          <View style={[
            styles.bubble,
            {
              backgroundColor: bubbleBg,
              borderBottomRightRadius: isMe ? 4 : 18,
              borderBottomLeftRadius: isMe ? 18 : 4,
            },
          ]}>
            <Text style={{ color: bubbleText, fontSize: 14, lineHeight: 20 }}>
              {item.content}
            </Text>
          </View>
          {showHeader || index === messages.length - 1 ? (
            <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant, marginTop: 3, marginHorizontal: 4 }}>
              {formatTime(item.created_at)}
            </Text>
          ) : null}
        </View>

        {isMe && <View style={{ width: 8 }} />}
      </View>
    );
  };

  const charCount = inputText.length;
  const overLimit = charCount > CHAR_LIMIT;

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 140 : 0}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]}>
          <TouchableOpacity
            onPress={() => router.replace(`/circle-profile/${circleId}`)}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="chatbubbles-outline" size={15} color={theme.colors.primary} style={{ marginRight: 5 }} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.colors.onSurface }} numberOfLines={1}>
              {circleName}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Messages ── */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.message_id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, flexGrow: 1 }}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={
              hasMore ? (
                <TouchableOpacity onPress={loadMore} style={styles.loadMore}>
                  {loadingMore
                    ? <ActivityIndicator size="small" color={theme.colors.primary} />
                    : <Text style={{ color: theme.colors.primary, fontSize: 13 }}>Load older messages</Text>
                  }
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14, textAlign: "center" }}>
                  No messages yet.{"\n"}Say something to get the chat started!
                </Text>
              </View>
            }
          />
        )}

        {/* ── Input bar ── */}
        <View style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          paddingBottom: Platform.OS === "ios" ? 28 : 14,
        }}>
          {overLimit && (
            <Text style={{ color: "#ef4444", fontSize: 11, marginBottom: 4, textAlign: "right" }}>
              {charCount}/{CHAR_LIMIT}
            </Text>
          )}
          <View style={{
            flexDirection: "row", alignItems: "flex-end", gap: 10,
            backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.85)",
            borderRadius: 30,
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            paddingHorizontal: 16, paddingVertical: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 6,
          }}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message the circle..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              multiline
              maxLength={CHAR_LIMIT + 10}
              style={{
                flex: 1,
                color: theme.colors.onSurface,
                fontSize: 14,
                maxHeight: 100,
                lineHeight: 20,
                paddingTop: 4,
                paddingBottom: 4,
              }}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() || sending || overLimit}
              style={{
                width: 34, height: 34, borderRadius: 17,
                alignItems: "center", justifyContent: "center",
                backgroundColor: !inputText.trim() || overLimit
                  ? "transparent"
                  : theme.colors.primary,
              }}
            >
              {sending
                ? <ActivityIndicator size="small" color={theme.colors.primary} />
                : <Ionicons
                    name="send"
                    size={16}
                    color={!inputText.trim() || overLimit
                      ? theme.colors.onSurfaceVariant
                      : "#fff"}
                  />
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: "flex-start", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  messageRow: { flexDirection: "row", alignItems: "flex-end" },
  messageRowMe: { justifyContent: "flex-end" },
  messageRowThem: { justifyContent: "flex-start" },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  inputBar: {
    paddingHorizontal: 12, paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
    borderTopWidth: 1,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  textInput: {
    flex: 1,
    borderRadius: 22, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
  },
  loadMore: { alignItems: "center", paddingVertical: 12 },
  emptyState: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingTop: 80,
  },
});
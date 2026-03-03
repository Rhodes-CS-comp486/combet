import React, { useEffect, useState, useMemo } from "react";
import { View, FlatList } from "react-native";
import { Text, Surface, Button, Chip, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import {router} from "expo-router";

const BASE_URL = "http://localhost:3001";

type Notification = {
  notification_id: string;
  type: string;
  entity_id: string;
  actor_username: string | null;
  circle_name: string | null;
  invite_id: string | null;
  status: string | null;
  is_read: boolean;
  created_at: string;
};

// ── Filter config ────────────────────────────────────────────────────────────
// Add new filters here as you add new notification types
const FILTERS = [
  { key: "all",           label: "All",      icon: "notifications-outline" },
  { key: "circle_invite", label: "Invites",  icon: "people-outline"        },
  { key: "pending",       label: "Pending",  icon: "time-outline"          },
  // future: { key: "bet_result", label: "Results", icon: "trophy-outline" },
  // future: { key: "follow",     label: "Follows",  icon: "person-add-outline" },
] as const;

type FilterKey = typeof FILTERS[number]["key"];

export default function InboxScreen() {
  const { theme, isDark } = useAppTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [activeFilter, setActiveFilter]   = useState<FilterKey>("all");

  useEffect(() => { fetchInbox(); }, []);

  const fetchInbox = async () => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${BASE_URL}/inbox`, {
        headers: { "x-session-id": sessionId },
      });
      setNotifications(await res.json());
    } catch (err) {
      console.error("Inbox error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (inviteId: string) => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      await fetch(`${BASE_URL}/inbox/invites/${inviteId}/accept`, {
        method: "POST",
        headers: { "x-session-id": sessionId },
      });
      setNotifications((prev) =>
        prev.map((n) => n.invite_id === inviteId ? { ...n, status: "accepted" } : n)
      );
    } catch (err) {
      console.error("Accept error:", err);
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      await fetch(`${BASE_URL}/inbox/invites/${inviteId}/decline`, {
        method: "POST",
        headers: { "x-session-id": sessionId },
      });
      setNotifications((prev) => prev.filter((n) => n.invite_id !== inviteId));
    } catch (err) {
      console.error("Decline error:", err);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeFilter === "all")     return notifications;
    if (activeFilter === "pending") return notifications.filter((n) => n.status === "pending");
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  // ── Badge counts ──────────────────────────────────────────────────────────
  const pendingCount = notifications.filter((n) => n.status === "pending").length;
  const inviteCount  = notifications.filter((n) => n.type === "circle_invite").length;

  const getBadge = (key: FilterKey) => {
    if (key === "pending")       return pendingCount;
    if (key === "circle_invite") return inviteCount;
    if (key === "all")           return notifications.length;
    return 0;
  };

  const cardBg = isDark ? "#0D1F35" : "#ffffff";

  // ── Notification card ─────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Notification }) => {
    const isPending  = item.status === "pending";
    const isAccepted = item.status === "accepted";

    const timeAgo = (dateStr: string) => {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins  = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days  = Math.floor(diff / 86400000);
      if (mins < 1)   return "just now";
      if (mins < 60)  return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    };

    if (item.type === "circle_invite") {
      return (
        <Surface
          elevation={1}
          style={{
            borderRadius:    16,
            marginBottom:    12,
            backgroundColor: cardBg,
            overflow:        "hidden",
          }}
        >
          {/* Accent bar — blue for pending, green for accepted */}
          <View style={{
            height:          3,
            backgroundColor: isAccepted ? "#22c55e" : theme.colors.primary,
          }} />

          <View style={{ padding: 16 }}>
            {/* ── Top row: icon + text + time ── */}
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{
                width:           40,
                height:          40,
                borderRadius:    20,
                backgroundColor: isAccepted
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(46,108,246,0.15)",
                borderWidth:     1.5,
                borderColor:     isAccepted ? "rgba(34,197,94,0.4)" : "rgba(46,108,246,0.4)",
                alignItems:      "center",
                justifyContent:  "center",
                marginRight:     12,
              }}>
                <Ionicons
                  name="people"
                  size={18}
                  color={isAccepted ? "#22c55e" : theme.colors.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 20 }}>
                  <Text style={{ fontWeight: "700" }}>@{item.actor_username}</Text>
                  {" invited you to join "}
                  <Text style={{ fontWeight: "700", color: theme.colors.primary }}>
                    "{item.circle_name}"
                  </Text>
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>

              {/* Status chip */}
              {isAccepted && (
                <Chip
                  icon="check-circle"
                  style={{ backgroundColor: "rgba(34,197,94,0.15)", height: 28 }}
                  textStyle={{ color: "#22c55e", fontSize: 11 }}
                >
                  Joined
                </Chip>
              )}
            </View>

            {/* ── Action buttons (only when pending) ── */}
            {isPending && item.invite_id && (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Button
                  mode="contained"
                  onPress={() => handleAccept(item.invite_id!)}
                  style={{ flex: 1, borderRadius: 10 }}
                  contentStyle={{ paddingVertical: 2 }}
                  labelStyle={{ fontWeight: "700", fontSize: 13 }}
                >
                  Accept
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => handleDecline(item.invite_id!)}
                  style={{ flex: 1, borderRadius: 10, borderColor: theme.colors.error }}
                  contentStyle={{ paddingVertical: 2 }}
                  labelStyle={{ fontWeight: "700", fontSize: 13, color: theme.colors.error }}
                >
                  Decline
                </Button>
              </View>
            )}
          </View>
        </Surface>
      );
    }

    // ── Fallback for future notification types ──
    return (
      <Surface elevation={1} style={{
        borderRadius: 16, marginBottom: 12, backgroundColor: cardBg, padding: 16,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "rgba(46,108,246,0.15)",
            borderWidth: 1.5, borderColor: "rgba(46,108,246,0.4)",
            alignItems: "center", justifyContent: "center", marginRight: 12,
          }}>
            <Ionicons name="notifications" size={18} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              You have a new notification
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {timeAgo(item.created_at)}
            </Text>
          </View>
        </View>
      </Surface>
    );


  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>

      {/* ── Header ── */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop:        16,
        paddingBottom:     12,
        borderBottomWidth: 1,
        borderColor:       isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
      }}>

    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: "800" }}>
        Inbox
      </Text>
      {pendingCount > 0 && (
        <View style={{
          backgroundColor: theme.colors.primary,
          borderRadius:    12,
          paddingHorizontal: 10,
          paddingVertical:   3,
        }}>
          <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>
            {pendingCount} pending
          </Text>
        </View>
          )}
        </View>

        {/* ── Filter chips ── */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {FILTERS.map(({ key, label, icon }) => {
            const active = activeFilter === key;
            const badge  = getBadge(key);
            return (
              <Chip
                key={key}
                selected={active}
                onPress={() => setActiveFilter(key)}
                icon={icon as any}
                style={{
                  backgroundColor: active
                    ? theme.colors.primary
                    : (isDark ? "#0F223A" : "#e8edf5"),
                }}
                textStyle={{
                  color:      active ? "white" : theme.colors.onSurfaceVariant,
                  fontWeight: active ? "700" : "400",
                  fontSize:   13,
                }}
              >
                {label}{badge > 0 ? ` (${badge})` : ""}
              </Chip>
            );
          })}
        </View>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 60 }} />
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Ionicons
            name="notifications-off-outline"
            size={48}
            color={theme.colors.onSurfaceVariant}
            style={{ marginBottom: 12 }}
          />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {activeFilter === "all" ? "No notifications yet" : `No ${activeFilter.replace("_", " ")}s`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.notification_id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
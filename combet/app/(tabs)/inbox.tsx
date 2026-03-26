import React, { useEffect, useState, useMemo } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text, Surface, Button, Chip, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import {router} from "expo-router";
import GradientBackground from "@/components/GradientBackground";

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
  icon?: string;
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

  const cardBg = "rgba(255,255,255,0.09)";

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


          <View style={{ padding: 16 }}>
            {/* ── Top row: icon + text + time ── */}
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
                  alignItems: "center", justifyContent: "center",
                  marginRight: 12,
                }}>
                  <Ionicons
                    name={((item as any).icon as any) || "people"}
                    size={18}
                    color={theme.colors.primary}
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
                <View style={{
                  backgroundColor: "rgba(157,212,190,0.12)",
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
                  flexDirection: "row", alignItems: "center", gap: 5,
                }}>
                  <Ionicons name="checkmark" size={11} color="#9dd4be" />
                  <Text style={{ color: "#9dd4be", fontSize: 11, fontWeight: "600" }}>Joined</Text>
                </View>
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
      <GradientBackground>

      {/* ── Header ── */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop:        16,
        paddingBottom:     12,
        borderBottomWidth: 1,
        borderColor:       isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
      }}>

    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <Text style={{ color: theme.colors.onSurface, fontSize: 24, fontWeight: "300", letterSpacing: 2 }}>
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
        <View style={{ flexDirection: "row" }}>
          {FILTERS.map(({ key, label }) => {
            const active = activeFilter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveFilter(key)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderBottomColor: active ? theme.colors.primary : "rgba(255,255,255,0.08)",
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: active ? "600" : "400",
                  color: active ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
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
      </GradientBackground>
  );
}
import React, { useCallback, useState, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text, Button, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import { API_BASE } from "@/constants/api";
import UserAvatar from "@/components/UserAvatar";

type Notification = {
  notification_id: string;
  type: string;
  entity_id: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_avatar_color: string | null;
  actor_avatar_icon: string | null;
  circle_name: string | null;
  circle_id: string | null;
  invite_id: string | null;
  status: string | null;
  is_read: boolean;
  created_at: string;
  icon?: string;

  // Follow request
  follow_request_id: string | null;
  follow_request_status: string | null;

  // Circle join request
  request_id: string | null;
  join_request_status: string | null;
  join_request_circle_name: string | null;
  invite_status: string | null;

  // Bet deadline
  bet_id: string | null;
  bet_title: string | null;
  bet_closes_at: string | null;
};

// ── Filter config ────────────────────────────────────────────────────────────
const FILTERS = [
  { key: "all",          label: "All",     icon: "notifications-outline" },
  { key: "pending",      label: "Pending", icon: "time-outline"          },
  { key: "circle_invite",label: "Invites", icon: "people-outline"        },
] as const;

type FilterKey = typeof FILTERS[number]["key"];

export default function InboxScreen() {
  const { theme, isDark } = useAppTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [activeFilter, setActiveFilter]   = useState<FilterKey>("all");
  const [actioning, setActioning]         = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void fetchInbox();
  }, []));

  const fetchInbox = async () => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/inbox`, {
        headers: { "x-session-id": sessionId },
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
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
      await fetch(`${API_BASE}/inbox/invites/${inviteId}/accept`, {
        method: "POST",
        headers: { "x-session-id": sessionId },
      });
      setNotifications((prev) =>
        prev.map((n) => n.invite_id === inviteId ? { ...n, invite_status: "accepted" } : n)
      );
    } catch (err) {
      console.error("Accept error:", err);
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      await fetch(`${API_BASE}/inbox/invites/${inviteId}/decline`, {
        method: "POST",
        headers: { "x-session-id": sessionId },
      });
      setNotifications((prev) => prev.filter((n) => n.invite_id !== inviteId));
    } catch (err) {
      console.error("Decline error:", err);
    }
  };

  const handleAcceptFollow = async (requestId: string) => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      await fetch(`${API_BASE}/inbox/follow-requests/${requestId}/accept`, {
        method: "POST",
        headers: { "x-session-id": sessionId },
      });
      setNotifications((prev) =>
        prev.map((n) => n.follow_request_id === requestId
          ? { ...n, follow_request_status: "accepted" } : n)
      );
    } catch (err) {
      console.error("Accept follow error:", err);
    }
  };

  const handleDeclineFollow = async (requestId: string) => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      await fetch(`${API_BASE}/inbox/follow-requests/${requestId}/decline`, {
        method: "POST",
        headers: { "x-session-id": sessionId },
      });
      setNotifications((prev) => prev.filter((n) => n.follow_request_id !== requestId));
    } catch (err) {
      console.error("Decline follow error:", err);
    }
  };

  const handleAcceptJoinRequest = async (requestId: string) => {
    if (actioning === requestId) return;
    setActioning(requestId);
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/inbox/join-requests/${requestId}/accept`, {
        method: "POST",
        headers: { "x-session-id": sessionId },
      });
      if (!res.ok) return;
      setNotifications((prev) =>
        prev.map((n) => n.request_id === requestId
          ? { ...n, join_request_status: "accepted" } : n)
      );
    } catch (err) {
      console.error("Accept join request error:", err);
    } finally {
      setActioning(null);
    }
  };

  const handleDeclineJoinRequest = async (requestId: string) => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      await fetch(`${API_BASE}/inbox/join-requests/${requestId}/decline`, {
        method: "POST",
        headers: { "x-session-id": sessionId },
      });
      setNotifications((prev) => prev.filter((n) => n.request_id !== requestId));
    } catch (err) {
      console.error("Decline join request error:", err);
    }
  };

  const handleDelete = async (notificationId: string) => {
    // Optimistically remove from UI
    setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      await fetch(`${API_BASE}/inbox/${notificationId}`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId },
      });
    } catch (err) {
      console.error("Delete notification error:", err);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeFilter === "all")     return notifications;
    if (activeFilter === "pending") return notifications.filter((n) =>
      (n.type === "circle_invite"       && n.status === "pending") ||
      (n.type === "follow_request"      && n.follow_request_status === "pending") ||
      (n.type === "circle_join_request" && n.join_request_status === "pending") ||
      (n.type === "bet_deadline")
    );
    if (activeFilter === "circle_invite") return notifications.filter((n) => n.type === "circle_invite");
    return notifications;
  }, [notifications, activeFilter]);

  const pendingCount = notifications.filter((n) =>
    (n.type === "circle_invite"       && n.status === "pending") ||
    (n.type === "follow_request"      && n.follow_request_status === "pending") ||
    (n.type === "circle_join_request" && n.join_request_status === "pending")
  ).length;
  const inviteCount = notifications.filter((n) => n.type === "circle_invite").length;

  const getBadge = (key: FilterKey) => {
    if (key === "all")           return notifications.length;
    if (key === "pending")       return pendingCount;
    if (key === "circle_invite") return inviteCount;
    return 0;
  };

  const cardBg = "rgba(255,255,255,0.09)";

  // ── Notification card ─────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Notification }) => {
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

    const goToProfile = () => {
      if (item.actor_id) router.push(`/user/${item.actor_id}`);
    };

    const cardStyle = {
      borderRadius: 16 as const,
      marginBottom: 12,
      backgroundColor: cardBg,
      overflow: "hidden" as const,
    };

    const XButton = () => (
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation(); handleDelete(item.notification_id); }}
        style={{
          position: "absolute", top: 10, right: 10,
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: "rgba(255,255,255,0.1)",
          alignItems: "center", justifyContent: "center",
          zIndex: 10,
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={12} color={theme.colors.onSurfaceVariant} />
      </TouchableOpacity>
    );

    const avatarEl = (
      <View style={{ marginRight: 12 }}>
        <UserAvatar
          user={{
            username:     item.actor_username ?? undefined,
            avatar_color: item.actor_avatar_color ?? undefined,
            avatar_icon:  item.actor_avatar_icon ?? undefined,
          }}
          size={40}
        />
      </View>
    );

    // ── Circle invite ─────────────────────────────────────────────────────
    if (item.type === "circle_invite") {
      const isPending  = item.invite_status === "pending";
      const isAccepted = item.invite_status === "accepted";
      return (
        <TouchableOpacity onPress={goToProfile} activeOpacity={0.8} style={cardStyle}>
          <View style={{ padding: 16, position: "relative" }}>
            <XButton />
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              {avatarEl}
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 20 }}>
                  <Text style={{ fontWeight: "700" }}>@{item.actor_username}</Text>
                  {" invited you to join "}
                  <Text
                    onPress={() => item.circle_id && router.push(`/circle-profile/${item.circle_id}`)}
                    style={{ fontWeight: "700", color: theme.colors.primary }}
                  >
                    "{item.circle_name}"
                  </Text>
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
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
                  style={{ flex: 1, borderRadius: 10, borderColor: "rgba(232,112,96,0.4)", backgroundColor: "rgba(232,112,96,0.12)" }}
                  contentStyle={{ paddingVertical: 2 }}
                  labelStyle={{ fontWeight: "700", fontSize: 13, color: "#e87060" }}
                >
                  Decline
                </Button>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // ── Follow request ────────────────────────────────────────────────────
    if (item.type === "follow_request") {
      const isFollowPending  = item.follow_request_status === "pending";
      const isFollowAccepted = item.follow_request_status === "accepted";
      return (
        <TouchableOpacity onPress={goToProfile} activeOpacity={0.8} style={cardStyle}>
          <View style={{ padding: 16, position: "relative" }}>
            <XButton />
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              {avatarEl}
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 20 }}>
                  <Text style={{ fontWeight: "700" }}>@{item.actor_username}</Text>
                  {" wants to follow you"}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
              {isFollowAccepted && (
                <View style={{
                  backgroundColor: "rgba(157,212,190,0.12)",
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
                  flexDirection: "row", alignItems: "center", gap: 5,
                }}>
                  <Ionicons name="checkmark" size={11} color="#9dd4be" />
                  <Text style={{ color: "#9dd4be", fontSize: 11, fontWeight: "600" }}>Accepted</Text>
                </View>
              )}
            </View>
            {isFollowPending && item.follow_request_id && (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Button
                  mode="contained"
                  onPress={() => handleAcceptFollow(item.follow_request_id!)}
                  style={{ flex: 1, borderRadius: 10 }}
                  contentStyle={{ paddingVertical: 2 }}
                  labelStyle={{ fontWeight: "700", fontSize: 13 }}
                >
                  Accept
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => handleDeclineFollow(item.follow_request_id!)}
                  style={{ flex: 1, borderRadius: 10, borderColor: "rgba(232,112,96,0.4)", backgroundColor: "rgba(232,112,96,0.12)" }}
                  contentStyle={{ paddingVertical: 2 }}
                  labelStyle={{ fontWeight: "700", fontSize: 13, color: "#e87060" }}
                >
                  Decline
                </Button>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // ── Follow accepted ───────────────────────────────────────────────────
    if (item.type === "follow_accepted") {
      return (
        <TouchableOpacity onPress={goToProfile} activeOpacity={0.8} style={cardStyle}>
          <View style={{ padding: 16, flexDirection: "row", alignItems: "center", position: "relative" }}>
            <XButton />
            {avatarEl}
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 20 }}>
                <Text style={{ fontWeight: "700" }}>@{item.actor_username}</Text>
                {" accepted your follow request"}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                {timeAgo(item.created_at)}
              </Text>
            </View>
            <View style={{
              backgroundColor: "rgba(157,212,190,0.12)",
              borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
              borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
              flexDirection: "row", alignItems: "center", gap: 5,
            }}>
              <Ionicons name="checkmark" size={11} color="#9dd4be" />
              <Text style={{ color: "#9dd4be", fontSize: 11, fontWeight: "600" }}>Following</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // ── Circle join request ───────────────────────────────────────────────
    if (item.type === "circle_join_request") {
      const isJoinPending  = item.join_request_status === "pending";
      const isJoinAccepted = item.join_request_status === "accepted";
      return (
        <TouchableOpacity onPress={goToProfile} activeOpacity={0.8} style={cardStyle}>
          <View style={{ padding: 16, position: "relative" }}>
            <XButton />
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              {avatarEl}
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 20 }}>
                  <Text style={{ fontWeight: "700" }}>@{item.actor_username}</Text>
                  {" wants to join "}
                  <Text style={{ fontWeight: "700", color: theme.colors.primary }}>
                    "{item.join_request_circle_name}"
                  </Text>
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
              {isJoinAccepted && (
                <View style={{
                  backgroundColor: "rgba(157,212,190,0.12)",
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
                  flexDirection: "row", alignItems: "center", gap: 5,
                }}>
                  <Ionicons name="checkmark" size={11} color="#9dd4be" />
                  <Text style={{ color: "#9dd4be", fontSize: 11, fontWeight: "600" }}>Accepted</Text>
                </View>
              )}
            </View>
            {isJoinPending && item.request_id && (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Button
                  mode="contained"
                  onPress={() => handleAcceptJoinRequest(item.request_id!)}
                  style={{ flex: 1, borderRadius: 10 }}
                  contentStyle={{ paddingVertical: 2 }}
                  labelStyle={{ fontWeight: "700", fontSize: 13 }}
                >
                  Accept
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => handleDeclineJoinRequest(item.request_id!)}
                  style={{ flex: 1, borderRadius: 10, borderColor: "rgba(232,112,96,0.4)", backgroundColor: "rgba(232,112,96,0.12)" }}
                  contentStyle={{ paddingVertical: 2 }}
                  labelStyle={{ fontWeight: "700", fontSize: 13, color: "#e87060" }}
                >
                  Decline
                </Button>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // ── Bet deadline ──────────────────────────────────────────────────────
    if (item.type === "bet_deadline") {
      const closesAt  = item.bet_closes_at ? new Date(item.bet_closes_at) : null;
      const hoursLeft = closesAt
        ? Math.max(0, Math.round((closesAt.getTime() - Date.now()) / 3600000))
        : null;
      return (
        <View style={cardStyle}>
          <View style={{ padding: 16, position: "relative" }}>
            <XButton />
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: "rgba(252,211,77,0.12)",
                borderWidth: 1, borderColor: "rgba(252,211,77,0.25)",
                alignItems: "center", justifyContent: "center",
                marginRight: 12,
              }}>
                <Ionicons name="time-outline" size={18} color="#fcd34d" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 20 }}>
                  {"Deadline approaching for "}
                  <Text style={{ fontWeight: "700", color: theme.colors.primary }}>
                    "{item.bet_title}"
                  </Text>
                </Text>
                {hoursLeft !== null && (
                  <Text variant="labelSmall" style={{ color: "#fcd34d", marginTop: 2, fontWeight: "600" }}>
                    {hoursLeft > 0 ? `${hoursLeft}h remaining` : "Closing very soon"}
                  </Text>
                )}
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // ── Fallback ──────────────────────────────────────────────────────────
    return (
      <View style={{ ...cardStyle, padding: 16 }}>
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
      </View>
    );
  };

  return (
    <GradientBackground>
      {/* ── Header ── */}
      <View style={{
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
        borderBottomWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <Text style={{ color: theme.colors.onSurface, fontSize: 24, fontWeight: "300", letterSpacing: 2 }}>
            Inbox
          </Text>
        </View>

        {/* ── Filter tabs ── */}
        <View style={{ flexDirection: "row" }}>
          {FILTERS.map(({ key, label }) => {
            const active = activeFilter === key;
            const count  = getBadge(key);
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveFilter(key)}
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
                  {label}
                </Text>
                {count > 0 && (
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
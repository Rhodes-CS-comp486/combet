import React, { useCallback, useState, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, FlatList, TouchableOpacity, Animated, PanResponder, Modal, ScrollView } from "react-native";
import { Text, Button, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import { API_BASE } from "@/constants/api";
import UserAvatar from "@/components/UserAvatar";
import BetCard from "@/components/BetCard";

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
  join_request_circle_id: string | null;
  invite_status: string | null;

  // Bet deadline
  bet_id: string | null;
  bet_title: string | null;
  bet_closes_at: string | null;
};

type BetDetail = any;

// ── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { key: "notifications", label: "Notifications" },
  { key: "messages",      label: "Messages"      },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function InboxScreen() {
  const { theme, isDark } = useAppTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState<TabKey>("notifications");
  const [actioning, setActioning]         = useState<string | null>(null);
  const [followBackStatus, setFollowBackStatus] = useState<Record<string, "followed" | "requested">>({});
  const [requestCount, setRequestCount]   = useState(0);
  const [conversations, setConversations] = useState<any[]>([]);
  const [convoLoading, setConvoLoading]   = useState(false);
  const [betModal, setBetModal]           = useState<{ visible: boolean; bet: BetDetail | null; loading: boolean }>({
    visible: false, bet: null, loading: false,
  });

  useFocusEffect(useCallback(() => {
    void fetchInbox();
    void fetchRequestCount();
    void fetchConversations();
  }, []));

  const fetchConversations = async () => {
    setConvoLoading(true);
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/messages`, {
        headers: { "x-session-id": sessionId },
      });
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch conversations error:", err);
    } finally {
      setConvoLoading(false);
    }
  };

  const fetchRequestCount = async () => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/messages/requests`, {
        headers: { "x-session-id": sessionId },
      });
      const data = await res.json();
      setRequestCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error("Fetch request count error:", err);
    }
  };

  const handleDeleteConversation = async (otherUserId: string) => {
    setConversations((prev) => prev.filter((c) => c.other_user_id !== otherUserId));
    try {
      const sessionId = await getSessionId();
      await fetch(`${API_BASE}/messages/conversation/${otherUserId}`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId ?? "" },
      });
    } catch (err) {
      console.error("Delete conversation error:", err);
    }
  };

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

  const openBetModal = async (betId: string, fallbackTitle?: string | null) => {
    setBetModal({ visible: true, bet: null, loading: true });
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/inbox/bet/${betId}`, {
        headers: { "x-session-id": sessionId },
      });
      if (!res.ok) {
        console.error("Fetch bet failed:", res.status);
        setBetModal({ visible: true, bet: { id: betId, title: fallbackTitle ?? "Bet", options: [], status: "OPEN" }, loading: false });
        return;
      }
      const data = await res.json();
      setBetModal({ visible: true, bet: data, loading: false });
    } catch (err) {
      console.error("Fetch bet error:", err);
      setBetModal({ visible: true, bet: { id: betId, title: fallbackTitle ?? "Bet", options: [], status: "OPEN" }, loading: false });
    }
  };

  const closeBetModal = () => setBetModal({ visible: false, bet: null, loading: false });

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

  const handleFollowBack = async (actorId: string) => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/inbox/follow-back/${actorId}`, {
        method: "POST",
        headers: { "x-session-id": sessionId },
      });
      const data = await res.json();
      if (data.status === "followed" || data.status === "requested") {
        setFollowBackStatus((prev) => ({ ...prev, [actorId]: data.status }));
      }
    } catch (err) {
      console.error("Follow back error:", err);
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
      const res = await fetch(`${API_BASE}/inbox/${notificationId}`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId },
      });
      console.log("DELETE notification response:", res.status, notificationId);
    } catch (err) {
      console.error("Delete notification error:", err);
    }
  };

  // ── Notifications tab shows all notifications ─────────────────────────────
  const filtered = notifications;

  const cardBg = "rgba(255,255,255,0.09)";

  // ── Swipeable conversation row ────────────────────────────────────────────
  const SwipeableConversation = ({ item }: { item: any }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const isSwiping  = useRef(false);
    const THRESHOLD  = 70;

    const timeAgo = (dateStr: string) => {
      const diff  = Date.now() - new Date(dateStr).getTime();
      const mins  = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days  = Math.floor(diff / 86400000);
      if (mins < 1)   return "now";
      if (mins < 60)  return `${mins}m`;
      if (hours < 24) return `${hours}h`;
      return `${days}d`;
    };

    const panResponder = useRef(PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,
      onPanResponderGrant: () => {
        isSwiping.current = false;
      },
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          if (Math.abs(g.dx) > 8) isSwiping.current = true;
          translateX.setValue(Math.max(g.dx, -90));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -THRESHOLD) {
          // Past threshold — auto delete, no tap fires
          Animated.timing(translateX, {
            toValue: -90, duration: 100, useNativeDriver: true,
          }).start(() => {
            handleDeleteConversation(item.other_user_id);
          });
        } else if (isSwiping.current) {
          // Partial swipe — snap back, block the tap
          isSwiping.current = false;
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })).current;

    return (
      <View style={{ overflow: "hidden" }}>
        <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
          <TouchableOpacity
            onPress={() => {
              if (isSwiping.current) return;
              router.push({
                pathname: "/(tabs)/inbox/dm",
                params: {
                  userId:      item.other_user_id,
                  username:    item.other_username,
                  avatarColor: item.other_avatar_color,
                  avatarIcon:  item.other_avatar_icon,
                },
              } as any);
            }}
            style={{
              flexDirection: "row", alignItems: "center", gap: 12,
              paddingHorizontal: 16, paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            }}
          >
            <UserAvatar
              user={{
                username:     item.other_username,
                avatar_color: item.other_avatar_color,
                avatar_icon:  item.other_avatar_icon,
              }}
              size={48}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{
                  color: theme.colors.onSurface, fontSize: 15,
                  fontWeight: item.unread_count > 0 ? "700" : "500",
                }}>
                  @{item.other_username}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                  {timeAgo(item.last_message_at)}
                </Text>
              </View>
              <Text numberOfLines={1} style={{
                color: item.unread_count > 0 ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                fontSize: 13, marginTop: 2,
                fontWeight: item.unread_count > 0 ? "600" : "400",
              }}>
                {item.last_message}
              </Text>
            </View>
            {item.unread_count > 0 && (
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary }} />
            )}
          </TouchableOpacity>
          {/* Trash sits just outside the right edge, slides into view on swipe */}
          <View style={{
            position: "absolute", top: 0, bottom: 0, right: -90,
            width: 90, backgroundColor: "#e87060",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="trash" size={22} color="#fff" />
          </View>
        </Animated.View>
      </View>
    );
  };

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
      backgroundColor: cardBg,
      overflow: "hidden" as const,
    };

    const XButton = () => (
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation(); handleDelete(item.notification_id); }}
        style={{
          position: "absolute" as const, top: -8, right: -8,
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: "rgba(60,70,90,0.95)",
          borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
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
        <View style={{ position: "relative", marginBottom: 12 }}>
        <TouchableOpacity onPress={goToProfile} activeOpacity={0.8} style={cardStyle}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
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
        <XButton />
        </View>
      );
    }

    // ── Follow request ────────────────────────────────────────────────────
    if (item.type === "follow_request") {
      const isFollowPending  = item.follow_request_status === "pending";
      const isFollowAccepted = item.follow_request_status === "accepted";
      return (
        <View style={{ position: "relative", marginBottom: 12 }}>
        <TouchableOpacity onPress={goToProfile} activeOpacity={0.8} style={cardStyle}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
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
        <XButton />
        </View>
      );
    }

    // ── New follower (public account) ─────────────────────────────────────
    if (item.type === "new_follower") {
      const fbStatus = item.actor_id ? followBackStatus[item.actor_id] : undefined;
      const isFollowed   = fbStatus === "followed";
      const isRequested  = fbStatus === "requested";
      return (
        <View style={{ position: "relative", marginBottom: 12 }}>
          <TouchableOpacity onPress={goToProfile} activeOpacity={0.8} style={cardStyle}>
            <View style={{ padding: 16, flexDirection: "row", alignItems: "center" }}>
              {avatarEl}
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 20 }}>
                  <Text style={{ fontWeight: "700" }}>@{item.actor_username}</Text>
                  {" started following you"}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
              {isFollowed ? (
                <View style={{
                  backgroundColor: "rgba(157,212,190,0.12)",
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
                  flexDirection: "row", alignItems: "center", gap: 5,
                }}>
                  <Ionicons name="checkmark" size={11} color="#9dd4be" />
                  <Text style={{ color: "#9dd4be", fontSize: 11, fontWeight: "600" }}>Following</Text>
                </View>
              ) : isRequested ? (
                <View style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
                }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: "600" }}>Requested</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); item.actor_id && handleFollowBack(item.actor_id); }}
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Follow</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
          <XButton />
        </View>
      );
    }

    // ── Follow accepted ───────────────────────────────────────────────────
    if (item.type === "follow_accepted") {
      return (
        <View style={{ position: "relative", marginBottom: 12 }}>
        <TouchableOpacity onPress={goToProfile} activeOpacity={0.8} style={cardStyle}>
          <View style={{ padding: 16, flexDirection: "row", alignItems: "center" }}>
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
        <XButton />
        </View>
      );
    }

    // ── New follower (public account) ─────────────────────────────────────
    if (item.type === "new_follower") {
      const alreadyFollowing = item.viewer_follows_actor;
      const requested        = item.viewer_requested_actor;

      const followLabel = alreadyFollowing ? "Following" : requested ? "Requested" : "Follow";
      const followColor = alreadyFollowing
        ? "rgba(157,212,190,0.12)"
        : requested
        ? "rgba(255,255,255,0.08)"
        : theme.colors.primary;
      const followTextColor = alreadyFollowing
        ? "#9dd4be"
        : requested
        ? theme.colors.onSurfaceVariant
        : "#fff";
      const followBorderColor = alreadyFollowing
        ? "rgba(157,212,190,0.3)"
        : requested
        ? "rgba(255,255,255,0.15)"
        : "transparent";

      return (
        <View style={{ position: "relative", marginBottom: 12 }}>
          <TouchableOpacity onPress={goToProfile} activeOpacity={0.8} style={cardStyle}>
            <View style={{ padding: 16, flexDirection: "row", alignItems: "center" }}>
              {avatarEl}
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 20 }}>
                  <Text style={{ fontWeight: "700" }}>@{item.actor_username}</Text>
                  {" started following you"}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  if (!alreadyFollowing && !requested && item.actor_id) {
                    handleFollowBack(item.actor_id, item.notification_id);
                  }
                }}
                style={{
                  paddingHorizontal: 14, paddingVertical: 6,
                  borderRadius: 20, borderWidth: 1,
                  borderColor: followBorderColor,
                  backgroundColor: followColor,
                  flexDirection: "row", alignItems: "center", gap: 4,
                }}
              >
                {alreadyFollowing && <Ionicons name="checkmark" size={11} color="#9dd4be" />}
                <Text style={{ fontSize: 12, fontWeight: "700", color: followTextColor }}>
                  {followLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          <XButton />
        </View>
      );
    }

    // ── Circle join request ───────────────────────────────────────────────
    if (item.type === "circle_join_request") {
      const isJoinPending  = item.join_request_status === "pending";
      const isJoinAccepted = item.join_request_status === "accepted";
      return (
        <View style={{ position: "relative", marginBottom: 12 }}>
        <TouchableOpacity onPress={goToProfile} activeOpacity={0.8} style={cardStyle}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {avatarEl}
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 20 }}>
                  <Text style={{ fontWeight: "700" }}>@{item.actor_username}</Text>
                  {" wants to join "}
                  <Text
                    onPress={() => item.join_request_circle_id && router.push(`/circle-profile/${item.join_request_circle_id}`)}
                    style={{ fontWeight: "700", color: theme.colors.primary }}
                    suppressHighlighting
                  >
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
        <XButton />
        </View>
      );
    }

    // ── Bet deadline ──────────────────────────────────────────────────────
    if (item.type === "bet_deadline") {
      const closesAt  = item.bet_closes_at ? new Date(item.bet_closes_at) : null;
      const hoursLeft = closesAt
        ? Math.max(0, Math.round((closesAt.getTime() - Date.now()) / 3600000))
        : null;
      return (
        <View style={{ position: "relative", marginBottom: 12 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={cardStyle}
          onPress={() => item.bet_id && openBetModal(item.bet_id, item.bet_title)}
        >
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
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
        </TouchableOpacity>
        <XButton />
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

  // ── Bet detail modal ──────────────────────────────────────────────────────
  const BetDetailModal = () => {
    const { bet, loading: betLoading } = betModal;

    const hoursLeft = bet?.closes_at
      ? Math.max(0, Math.round((new Date(bet.closes_at).getTime() - Date.now()) / 3600000))
      : null;

    return (
      <Modal
        visible={betModal.visible}
        transparent
        animationType="slide"
        onRequestClose={closeBetModal}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
          activeOpacity={1}
          onPress={closeBetModal}
        />

        {/* Sheet */}
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          backgroundColor: isDark ? "#1a1f2e" : "#f0f0f5",
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingBottom: 40,
          shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3, shadowRadius: 12, elevation: 20,
        }}>
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)" }} />
          </View>

          {/* Header row */}
          <View style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: "rgba(252,211,77,0.12)",
                borderWidth: 1, borderColor: "rgba(252,211,77,0.3)",
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="time-outline" size={15} color="#fcd34d" />
              </View>
              <Text style={{ color: theme.colors.onSurface, fontSize: 15, fontWeight: "600" }}>
                Deadline Approaching
              </Text>
              {hoursLeft !== null && (
                <View style={{
                  backgroundColor: "rgba(252,211,77,0.12)", borderRadius: 20,
                  paddingHorizontal: 8, paddingVertical: 3,
                  borderWidth: 1, borderColor: "rgba(252,211,77,0.25)",
                }}>
                  <Text style={{ color: "#fcd34d", fontSize: 11, fontWeight: "700" }}>
                    {hoursLeft > 0 ? `${hoursLeft}h left` : "Closing soon"}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={closeBetModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {betLoading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator animating color={theme.colors.primary} />
            </View>
          ) : bet ? (
            <ScrollView
              style={{ paddingHorizontal: 16 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
            >
              <BetCard item={bet} mode="preview" />
              <TouchableOpacity
                onPress={() => { closeBetModal(); router.push("/(tabs)/profile"); }}
                style={{
                  marginTop: 8, borderRadius: 12, padding: 14,
                  backgroundColor: theme.colors.primary,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>View on Profile</Text>
              </TouchableOpacity>
              <View style={{ height: 8 }} />
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    );
  };

  return (
    <GradientBackground>
      <BetDetailModal />
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

        {/* ── Tabs ── */}
        <View style={{ flexDirection: "row" }}>
          {TABS.map(({ key, label }) => {
            const active = activeTab === key;
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
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Tab content ── */}
      {activeTab === "messages" ? (
        <View style={{ flex: 1 }}>
          {/* Requests button row */}
          <View style={{
            flexDirection: "row", justifyContent: "flex-end",
            paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
          }}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/inbox/message-requests")}
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
                borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.onSurface }}>
                Requests
              </Text>
              {requestCount > 0 && (
                <View style={{
                  backgroundColor: "#e87060", borderRadius: 10,
                  paddingHorizontal: 6, paddingVertical: 1,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{requestCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Conversation list */}
          {convoLoading ? (
            <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : conversations.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="chatbubble-outline" size={48} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                No messages yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.other_user_id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
              renderItem={({ item }) => <SwipeableConversation item={item} />}
            />
          )}
        </View>
      ) : loading ? (
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
            No notifications yet
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
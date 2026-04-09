import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import PageHeader from "@/components/PageHeader";
import GradientBackground from "@/components/GradientBackground";
import { API_BASE } from "@/constants/api";
import UserAvatar from "@/components/UserAvatar";

type Member  = { id: string; username: string; joined_at: string; avatar_color?: string; avatar_icon?: string; is_creator?: boolean };
type Request = { request_id: string; user_id: string; username: string; created_at: string; avatar_color?: string; avatar_icon?: string };

export default function MembersScreen() {
  const { theme } = useAppTheme();
  const params    = useLocalSearchParams();
  const circleId  = params.id as string;
  const isPrivate = params.isPrivate === "1";

  const [activeTab, setActiveTab] = useState<"members" | "requests">("members");
  const [members,   setMembers]   = useState<Member[]>([]);
  const [requests,  setRequests]  = useState<Request[]>([]);
  const [actioning, setActioning] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const sessionId = await getSessionId();
      const histRes = await fetch(`${API_BASE}/circles/${circleId}/history`, {
        headers: { "x-session-id": sessionId || "" },
      });
      if (histRes.ok) {
        const data = await histRes.json();
        setMembers(data.members ?? []);
      }
      if (isPrivate) {
        const reqRes = await fetch(`${API_BASE}/circles/${circleId}/requests`, {
          headers: { "x-session-id": sessionId || "" },
        });
        if (reqRes.ok) setRequests(await reqRes.json());
      }
    } catch (err) {
      console.error("Error loading members:", err);
    }
  };

  useFocusEffect(useCallback(() => {
    setMembers([]);
    setRequests([]);
    void loadAll();
  }, [circleId]));

  const handleAccept = async (requestId: string) => {
    setActioning(requestId);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/circles/${circleId}/requests/${requestId}/accept`, {
        method: "POST", headers: { "x-session-id": sessionId || "" },
      });
      if (res.ok) { setRequests((prev) => prev.filter((r) => r.request_id !== requestId)); loadAll(); }
    } catch (err) { console.error("Accept error:", err); }
    finally { setActioning(null); }
  };

  const handleDecline = async (requestId: string) => {
    setActioning(requestId);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/circles/${circleId}/requests/${requestId}/decline`, {
        method: "POST", headers: { "x-session-id": sessionId || "" },
      });
      if (res.ok) setRequests((prev) => prev.filter((r) => r.request_id !== requestId));
    } catch (err) { console.error("Decline error:", err); }
    finally { setActioning(null); }
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

  const memberRow = (item: Member) => (
    <TouchableOpacity
      onPress={() => router.push(`/user/${item.id}`)}
      style={{
        flexDirection: "row", alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.09)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
        borderRadius: 14, padding: 14, marginBottom: 10,
      }}
    >
      <View style={{ marginRight: 14 }}>
        <UserAvatar user={{ username: item.username, avatar_color: item.avatar_color, avatar_icon: item.avatar_icon }} size={44} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
            {item.username}
          </Text>
          {item.is_creator && (
            <View style={{
              backgroundColor: "rgba(157,212,190,0.18)",
              borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
              borderWidth: 1, borderColor: "rgba(157,212,190,0.35)",
            }}>
              <Text style={{ color: "#9dd4be", fontSize: 11, fontWeight: "600", letterSpacing: 0.5 }}>Creator</Text>
            </View>
          )}
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>@{item.username}</Text>
      </View>
      {item.joined_at && (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.8 }}>
          Joined {new Date(item.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </Text>
      )}
    </TouchableOpacity>
  );

  const requestRow = (item: Request) => (
    <View style={{
      flexDirection: "row", alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.09)",
      borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
      borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
    }}>
      <TouchableOpacity
        onPress={() => router.push(`/user/${item.user_id}`)}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}
      >
        <UserAvatar user={{ username: item.username, avatar_color: item.avatar_color, avatar_icon: item.avatar_icon }} size={44} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>{item.username}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Requested {timeAgo(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
      {actioning === item.request_id ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => handleDecline(item.request_id)}
            style={{ borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}
          >
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleAccept(item.request_id)}
            style={{ borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.primary }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <GradientBackground style={{ paddingHorizontal: 20 }}>
      <PageHeader title="Members" />

      {isPrivate && (
        <View style={{ flexDirection: "row", marginBottom: 20 }}>
          {(["members", "requests"] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1, paddingVertical: 12, alignItems: "center",
                  borderBottomWidth: 2,
                  borderBottomColor: active ? theme.colors.primary : "rgba(255,255,255,0.08)",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{
                    fontSize: 13, fontWeight: active ? "600" : "400",
                    color: active ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                  }}>
                    {tab === "members" ? "Members" : "Requests"}
                  </Text>
                  {tab === "requests" && requests.length > 0 && (
                    <View style={{
                      backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10,
                      minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
                    }}>
                      <Text style={{ color: theme.colors.onSurface, fontSize: 11, fontWeight: "600" }}>{requests.length}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {activeTab === "members" ? (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id ?? item.username}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => memberRow(item)}
          ListEmptyComponent={
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40 }}>
              No members found
            </Text>
          }
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.request_id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => requestRow(item)}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Ionicons name="checkmark-circle-outline" size={40} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}>No pending requests</Text>
            </View>
          }
        />
      )}
    </GradientBackground>
  );
}
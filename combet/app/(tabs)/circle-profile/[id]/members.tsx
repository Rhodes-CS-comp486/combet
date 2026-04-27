import React, { useCallback, useState, useRef, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, FlatList, TouchableOpacity, Alert} from "react-native";
import { Text, ActivityIndicator, TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import PageHeader from "@/components/PageHeader";
import GradientBackground from "@/components/GradientBackground";
import { API_BASE } from "@/constants/api";
import UserAvatar from "@/components/UserAvatar";

type Member  = { id: string; username: string; joined_at: string; avatar_color?: string; avatar_icon?: string; is_creator?: boolean; coin_balance?: number };
type Request = { request_id: string; user_id: string; username: string; created_at: string; avatar_color?: string; avatar_icon?: string };

export default function MembersScreen() {
  const { theme } = useAppTheme();
  const params    = useLocalSearchParams();
  const circleId  = params.id as string;
  const isPrivate = params.isPrivate === "1";

  const isCreator  = params.isCreator === "1";
    const hasCoin    = params.hasCoin === "1";
    const coinName   = decodeURIComponent(params.coinName as string ?? "");
    const coinColor  = decodeURIComponent(params.coinColor as string ?? "#f0c070");
    const coinIcon   = decodeURIComponent(params.coinIcon as string ?? "ellipse");
    const coinSymbol = decodeURIComponent(params.coinSymbol as string ?? "");

    const [editingMemberId,  setEditingMemberId]  = useState<string | null>(null);
    const [editingBalance,   setEditingBalance]   = useState<string>("");
    const [savingBalance,    setSavingBalance]    = useState(false);

  const [activeTab, setActiveTab] = useState<"members" | "requests">("members");
  const [members,   setMembers]   = useState<Member[]>([]);
  const [requests,  setRequests]  = useState<Request[]>([]);
  const [actioning, setActioning] = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const sessionId = await getSessionId();
      const histRes = await fetch(`${API_BASE}/circles/${circleId}/history`, {
        headers: { "x-session-id": sessionId || "" },
      });
      if (histRes.ok) {
        const data = await histRes.json();
        setMembers(data.members ?? []);
      } else if (!isPrivate) {
        // Not a member but circle is public — show public members
        const pubRes = await fetch(`${API_BASE}/circles/${circleId}/members`);
        if (pubRes.ok) setMembers(await pubRes.json());
        // If private and not a member — show nothing
      }
      if (isPrivate) {
        const reqRes = await fetch(`${API_BASE}/circles/${circleId}/requests`, {
          headers: { "x-session-id": sessionId || "" },
        });
        if (reqRes.ok) setRequests(await reqRes.json());
      }
    } catch (err) {
      console.error("Error loading members:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadedCircleIdRef = useRef<string | null>(null);

  // Full reset only when circleId actually changes
  useEffect(() => {
    if (loadedCircleIdRef.current === circleId) return;
    loadedCircleIdRef.current = circleId;
    setMembers([]);
    setRequests([]);
    void loadAll();
  }, [circleId]);

  // Silent refresh when returning to screen
  useFocusEffect(useCallback(() => {
    if (loadedCircleIdRef.current !== circleId) return;
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

  const handleBalanceSave = async (memberId: string) => {
      const newBalance = parseInt(editingBalance);
      if (isNaN(newBalance) || newBalance < 0) {
        Alert.alert("Invalid", "Please enter a valid balance.");
        return;
      }
      setSavingBalance(true);
      try {
        const sessionId = await getSessionId();
        const res = await fetch(`${API_BASE}/circles/${circleId}/members/${memberId}/balance`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-session-id": sessionId || "" },
          body: JSON.stringify({ balance: newBalance }),
        });
        if (res.ok) {
          setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, coin_balance: newBalance } : m));
          setEditingMemberId(null);
        } else {
          const data = await res.json().catch(() => ({}));
          Alert.alert("Error", data.error || "Could not update balance");
        }
      } catch {
        Alert.alert("Network Error", "Could not connect to server");
      } finally {
        setSavingBalance(false);
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

  const memberRow = (item: Member) => {
  const isEditing = editingMemberId === item.id;
  const coinBg     = coinColor + "1a";
  const coinBorder = coinColor + "44";

  return (
    <TouchableOpacity
      onPress={() => router.push(`/user/${item.id}`)}
      activeOpacity={0.75}
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

      {hasCoin && (
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          {isEditing ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{
                backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 8,
                borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
                width: 70, height: 36, justifyContent: "center",
              }}>
                <TextInput
                  value={editingBalance}
                  onChangeText={setEditingBalance}
                  keyboardType="numeric"
                  mode="flat"
                  style={{ backgroundColor: "transparent", height: 36, fontSize: 13, textAlign: "center" }}
                  underlineColor="transparent"
                  activeUnderlineColor={coinColor}
                  textColor={theme.colors.onSurface}
                  theme={{ colors: { primary: coinColor } }}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                onPress={() => handleBalanceSave(item.id)}
                disabled={savingBalance}
                style={{
                  backgroundColor: coinBg, borderWidth: 1, borderColor: coinBorder,
                  borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
                }}
              >
                {savingBalance
                  ? <ActivityIndicator size={12} color={coinColor} />
                  : <Text style={{ color: coinColor, fontSize: 12, fontWeight: "600" }}>Save</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingMemberId(null)}>
                <Ionicons name="close-circle-outline" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={(e) => {
                if (isCreator) {
                  e.stopPropagation?.();
                  setEditingMemberId(item.id);
                  setEditingBalance(String(item.coin_balance ?? 0));
                }
              }}
              activeOpacity={isCreator ? 0.7 : 1}
              style={{
                flexDirection: "row", alignItems: "center", gap: 5,
                backgroundColor: coinBg, borderWidth: 1, borderColor: coinBorder,
                borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
              }}
            >
              <Ionicons name={coinIcon as any} size={12} color={coinColor} />
              <Text style={{ color: coinColor, fontSize: 12, fontWeight: "600" }}>
                {item.coin_balance ?? 0}
              </Text>
              {isCreator && <Ionicons name="pencil" size={10} color={coinColor} style={{ opacity: 0.6 }} />}
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

  const requestRow = (item: Request) => (
    <View style={{
      flexDirection: "row", alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.09)",
      borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
      borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
    }}>
      <TouchableOpacity
        onPress={() => router.push(`/user/${item.user_id}`)}
        activeOpacity={0.75}
        style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }}
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
            style={{ borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(232,112,96,0.4)", backgroundColor: "rgba(232,112,96,0.12)" }}
          >
            <Text style={{ color: "#e87060", fontSize: 13, fontWeight: "600" }}>Decline</Text>
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

  if (loading) return (
    <GradientBackground style={{ paddingHorizontal: 20 }}>
      <PageHeader title="Members" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>Loading…</Text>
      </View>
    </GradientBackground>
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
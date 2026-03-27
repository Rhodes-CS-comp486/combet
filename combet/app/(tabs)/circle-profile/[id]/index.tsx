import React, { useState, useCallback } from "react";
import { View, ScrollView, Alert, TouchableOpacity } from "react-native";
import { Text, Surface, Button, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import BetCard from "@/components/BetCard";

const API = "http://localhost:3001";

type Member    = { id: string; username: string; joined_at: string };
type BetOption = { id: string; label: string; option_text: string };
type Bet = {
  id: string; title: string; description: string; stake_amount: number;
  closes_at: string | null; created_at: string; status: string;
  creator_username: string; my_response: "accepted" | "declined" | null;
  my_selected_option_id: string | null; options: BetOption[];
};
type Circle      = { circle_id: string; name: string; description?: string; icon?: string; created_at: string; is_private?: boolean };
type HistoryData = { circle: Circle; members: Member[]; bets: Bet[] };

export default function CircleProfile() {
  const router            = useRouter();
  const { theme, isDark } = useAppTheme();
  const { id }            = useLocalSearchParams();
  const circleId          = Array.isArray(id) ? id[0] : id;

  const [circle, setCircle]         = useState<Circle | null>(null);
  const [history, setHistory]       = useState<HistoryData | null>(null);
  const [activeTab, setActiveTab]   = useState<"history" | "live">("live");
  const [responding, setResponding] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(0);

  useFocusEffect(
    useCallback(() => { fetchAll(); }, [circleId])
  );

  const fetchAll = async () => {
    try {
      const sessionId  = await getSessionId();
      const circleRes  = await fetch(`${API}/circles/${circleId}`);
      const circleData = await circleRes.json();
      setCircle(circleData);

      const histRes = await fetch(`${API}/circles/${circleId}/history`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (histRes.ok) setHistory(await histRes.json());

      // Fetch request count for badge on Members button
      const reqRes = await fetch(`${API}/circles/${circleId}/requests`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (reqRes.ok) {
        const reqs = await reqRes.json();
        setRequestCount(reqs.length);
      }
    } catch (err) {
      console.error("fetchAll error:", err);
    }
  };

  const handleLeave = async () => {
    const confirmed = await new Promise<boolean>((resolve) =>
      Alert.alert("Leave Circle", "Are you sure you want to leave this circle?", [
        { text: "Cancel", style: "cancel",      onPress: () => resolve(false) },
        { text: "Leave",  style: "destructive", onPress: () => resolve(true)  },
      ])
    );
    if (!confirmed) return;

    try {
      const sessionId = await getSessionId();
      if (!sessionId) { alert("Not authenticated"); return; }
      const res = await fetch(`${API}/circles/${circleId}/leave`, {
        method: "DELETE", headers: { "x-session-id": sessionId },
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); alert(data.error || "Could not leave circle"); return; }
      router.replace("/(tabs)/circles");
    } catch (err) {
      alert("Could not connect to server");
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (!circle) return null;

  const cardBg = isDark ? "#0F223A" : "#ffffff";

  const actionButtons = [
    { label: "Members",  icon: "people",       onPress: () => router.push(`/circle-profile/${circleId}/members?isPrivate=${circle.is_private ? "1" : "0"}`),    showBadge: circle.is_private && requestCount > 0 },
    { label: "Edit",     icon: "pencil",       onPress: () => router.push(`/circle-profile/${circleId}/edit`),       showBadge: false },
    { label: "Add",      icon: "person-add",   onPress: () => router.push(`/circle-profile/${circleId}/add-friend`), showBadge: false },
    { label: "Leave",    icon: "exit-outline", onPress: handleLeave,                                                  showBadge: false },
  ];

  const renderHistory = () => {
    if (!history) return (
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 24 }}>Loading...</Text>
    );
    const resolvedBets = history.bets.filter((b) => !!b.my_response);
    return (
      <View>
        {resolvedBets.map((bet) => (
          <BetCard key={bet.id} item={bet} mode="active" onRefresh={fetchAll} onSettle={() => {}} />
        ))}
        {history.bets.length === 0 && (
          <Surface elevation={0} style={{
            borderRadius: 16, backgroundColor: cardBg, padding: 28,
            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
            alignItems: "center",
          }}>
            <Ionicons name="receipt-outline" size={36} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 10 }} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
              No bets posted yet.{"\n"}Hit the + button to create one!
            </Text>
          </Surface>
        )}
      </View>
    );
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Back ── */}
        <View style={{ paddingHorizontal: 8, paddingTop: 12 }}>
          <Button icon="arrow-left" mode="text" compact
            onPress={() => router.replace("/(tabs)/circles")}
            style={{ alignSelf: "flex-start" }}
            labelStyle={{ color: theme.colors.onSurfaceVariant }}>
            Back
          </Button>
        </View>

        {/* ── Hero ── */}
        <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 24, paddingHorizontal: 20 }}>
          <Surface elevation={2} style={{
            width: 150, height: 150, borderRadius: 75,
            backgroundColor: theme.colors.surface,
            justifyContent: "center", alignItems: "center", marginBottom: 16,
          }}>
            <Ionicons name={(circle.icon as any) || "people"} size={70} color={theme.colors.primary} />
          </Surface>

          <Text variant="headlineSmall" style={{
            color: theme.colors.onSurface, fontWeight: "300", marginBottom: 6, textAlign: "center",
          }}>
            {circle.name}
          </Text>

          {/* Private / Public pill */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            backgroundColor: "rgba(255,255,255,0.07)",
            borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
            marginBottom: 10,
          }}>
            <Ionicons
              name={circle.is_private ? "lock-closed" : "globe-outline"}
              size={11} color={theme.colors.onSurfaceVariant}
            />
            <Text style={{ fontSize: 11, fontWeight: "400", color: theme.colors.onSurfaceVariant }}>
              {circle.is_private ? "Private" : "Public"}
            </Text>
          </View>

          {circle.description ? (
            <Text variant="bodyMedium" style={{
              color: theme.colors.onSurfaceVariant, textAlign: "center",
              paddingHorizontal: 30, marginBottom: 16,
            }}>
              {circle.description}
            </Text>
          ) : null}

          {/* Created date */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20, opacity: 0.6 }}>
            <Ionicons name="flag-outline" size={13} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Created {circle.created_at ? formatDate(circle.created_at) : ""}
            </Text>
          </View>

          {/* ── Action buttons ── */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {actionButtons.map(({ label, icon, onPress, showBadge }) => (
              <TouchableOpacity
                key={label}
                onPress={onPress}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
                  borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
                }}
              >
                <Ionicons name={icon as any} size={14} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.onSurface, fontSize: 13, fontWeight: "400" }}>{label}</Text>
                {showBadge && (
                  <View style={{
                    width: 7, height: 7, borderRadius: 4,
                    backgroundColor: "rgba(255,255,255,0.5)",
                    marginLeft: 2,
                  }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 20 }}>
          {(["live", "history"] as const).map((tab) => {
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
                <Text style={{
                  fontSize: 13, fontWeight: active ? "600" : "400",
                  color: active ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                }}>
                  {tab === "history" ? "Circle History" : "Live Bets"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab content ── */}
        <View style={{ paddingHorizontal: 20 }}>
          {activeTab === "history" ? renderHistory() : (() => {
            const pendingBets = history?.bets.filter((b) => !b.my_response && b.status === "PENDING") ?? [];
            if (pendingBets.length === 0) {
              return (
                <View style={{
                  borderRadius: 16, padding: 28,
                  backgroundColor: "rgba(255,255,255,0.07)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                }}>
                  <Ionicons name="flash-outline" size={36} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
                  <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", fontSize: 14 }}>
                    No live bets right now
                  </Text>
                </View>
              );
            }
            return (
              <View>
                {pendingBets.map((bet) => (
                  <BetCard
                    key={bet.id} item={bet} mode="feed"
                    accepting={responding} setAccepting={setResponding}
                    onRemove={(id) => setHistory((prev) => prev ? {
                      ...prev, bets: prev.bets.filter((b) => b.id !== id),
                    } : prev)}
                    onRefresh={fetchAll}
                  />
                ))}
              </View>
            );
          })()}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}
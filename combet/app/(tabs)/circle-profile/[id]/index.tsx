import React, { useState, useCallback } from "react";
import { View, ScrollView, Alert, TouchableOpacity } from "react-native";
import { Text, Surface, Button, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";

const API = "http://localhost:3001";
type Member = { id: string; username: string; joined_at: string };
type BetOption = { id: string; label: string; option_text: string };
type Bet = {
  id: string;
  title: string;
  description: string;
  stake_amount: number;
  closes_at: string | null;
  created_at: string;
  status: string;
  creator_username: string;
  my_response: "accepted" | "declined" | null;
  my_selected_option_id: string | null;
  options: BetOption[];
};
type Circle = { circle_id: string; name: string; description?: string; icon?: string; created_at: string };
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

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [circleId])
  );

  const fetchAll = async () => {
    try {
      const sessionId = await getSessionId();
      // Fetch circle info
      const circleRes = await fetch(`${API}/circles/${circleId}`);
      const circleData = await circleRes.json();
      setCircle(circleData);

      // Fetch history (members + bets)
      const histRes = await fetch(`${API}/circles/${circleId}/history`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (histRes.ok) setHistory(await histRes.json());
    } catch (err) {
      console.error("fetchAll error:", err);
    }
  };

  const handleAccept = async (betId: string, optionId: string) => {
    setResponding(`${betId}-${optionId}`);
    try {
      const sessionId = await getSessionId();
      await fetch(`${API}/bets/${betId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
        body: JSON.stringify({ selectedOptionId: optionId }),
      });
      // Update local state
      setHistory((prev) => prev ? {
        ...prev,
        bets: prev.bets.map((b) =>
          b.id === betId ? { ...b, my_response: "accepted", my_selected_option_id: optionId } : b
        ),
      } : prev);
    } catch (err) {
      console.error("Accept error:", err);
    } finally {
      setResponding(null);
    }
  };

  const handleDecline = async (betId: string) => {
    setResponding(betId);
    try {
      const sessionId = await getSessionId();
      await fetch(`${API}/bets/${betId}/decline`, {
        method: "POST",
        headers: { "x-session-id": sessionId ?? "" },
      });
      setHistory((prev) => prev ? {
        ...prev,
        bets: prev.bets.map((b) =>
          b.id === betId ? { ...b, my_response: "declined" } : b
        ),
      } : prev);
    } catch (err) {
      console.error("Decline error:", err);
    } finally {
      setResponding(null);
    }
  };

  const handleLeave = async () => {
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm("Are you sure you want to leave this circle?")
        : await new Promise<boolean>((resolve) =>
            Alert.alert("Leave Circle", "Are you sure you want to leave this circle?", [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Leave", style: "destructive", onPress: () => resolve(true) },
            ])
          );

    if (!confirmed) return;

    try {
      const sessionId = await getSessionId();
      if (!sessionId) { alert("Not authenticated"); return; }
      const res = await fetch(`${API}/circles/${circleId}/leave`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not leave circle");
        return;
      }
      router.replace("/circles");
    } catch (err) {
      console.error("Leave error:", err);
      alert("Could not connect to server");
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

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (!circle) return null;

  const cardBg   = isDark ? "#0F223A" : "#ffffff";
  const subtleBg = isDark ? "#091828" : "#f2f6ff";

  // ── Bet card ──────────────────────────────────────────────────────────────
  const renderBet = (bet: Bet) => {
    const pending  = !bet.my_response;
    const accepted = bet.my_response === "accepted";
    const declined = bet.my_response === "declined";
    const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";

    return (
      <View key={bet.id} style={{
        borderRadius: 16, marginBottom: 12,
        backgroundColor: cardBg,
        borderWidth: 1, borderColor,
        flexDirection: "row",
        overflow: "hidden",
        minHeight: 140,
      }}>

        {/* ── LEFT: creator icon + name ── */}
        <View style={{
          width: 82,
          borderRightWidth: 1, borderRightColor: borderColor,
          alignItems: "center", justifyContent: "center",
          paddingVertical: 14, gap: 6,
        }}>
          <View style={{
            width: 50, height: 50, borderRadius: 25,
            backgroundColor: isDark ? "rgba(46,108,246,0.2)" : "rgba(46,108,246,0.12)",
            borderWidth: 1.5, borderColor: "rgba(46,108,246,0.35)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="person" size={22} color={theme.colors.primary} />
          </View>
          <Text style={{
            color: theme.colors.primary, fontWeight: "700", fontSize: 10,
            textAlign: "center", paddingHorizontal: 4,
          }} numberOfLines={2}>
            @{bet.creator_username}
          </Text>
        </View>

        {/* ── MIDDLE: bet info ── */}
        <View style={{ flex: 1, padding: 14, justifyContent: "center", gap: 5 }}>
          <Text style={{ color: theme.colors.onSurface, fontWeight: "800", fontSize: 15, lineHeight: 20 }}>
            {bet.title}
          </Text>
          {bet.description ? (
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, lineHeight: 18 }}>
              {bet.description}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
              {timeAgo(bet.created_at)}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
              🪙 {bet.stake_amount}
            </Text>
            {bet.closes_at ? (
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
                Closes {new Date(bet.closes_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Text>
            ) : null}
          </View>

          {/* Accepted state — show chosen option */}
          {accepted && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
              {bet.options.map((opt, i) => {
                const chosen = opt.id === bet.my_selected_option_id;
                return (
                  <View key={opt.id} style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                    backgroundColor: chosen ? "#2563EB" : (isDark ? "rgba(255,255,255,0.06)" : "#f0f4ff"),
                    borderWidth: chosen ? 0 : 1,
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                  }}>
                    <Text style={{
                      color: chosen ? "#fff" : theme.colors.onSurfaceVariant,
                      fontWeight: chosen ? "800" : "400", fontSize: 12,
                    }}>
                      {opt.label}{opt.option_text ? `: ${opt.option_text}` : ""}
                    </Text>
                  </View>
                );
              })}
              <View style={{
                paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                backgroundColor: "rgba(34,197,94,0.12)",
              }}>
                <Text style={{ color: "#22c55e", fontSize: 11, fontWeight: "700" }}>✓ Accepted</Text>
              </View>
            </View>
          )}

          {/* Declined state */}
          {declined && (
            <View style={{
              marginTop: 6, paddingHorizontal: 8, paddingVertical: 4,
              borderRadius: 8, backgroundColor: "rgba(239,68,68,0.1)",
              alignSelf: "flex-start",
            }}>
              <Text style={{ color: theme.colors.error, fontSize: 11, fontWeight: "700" }}>✕ Declined</Text>
            </View>
          )}
        </View>

        {/* ── RIGHT: stacked option buttons + decline (only when pending) ── */}
        {pending && (
          <View style={{
            width: 82,
            borderLeftWidth: 1, borderLeftColor: borderColor,
          }}>
            {bet.options.map((opt, i) => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => handleAccept(bet.id, opt.id)}
                disabled={!!responding}
                style={{
                  flex: 1,
                  backgroundColor: i % 2 === 0 ? "#2563EB" : "#3B82F6",
                  alignItems: "center", justifyContent: "center",
                  borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)",
                  opacity: responding === `${bet.id}-${opt.id}` ? 0.5 : 1,
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{opt.label}</Text>
                {opt.option_text ? (
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 9, marginTop: 1, textAlign: "center" }}>
                    {opt.option_text}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => handleDecline(bet.id)}
              disabled={!!responding}
              style={{
                flex: 1,
                backgroundColor: isDark ? "#091828" : "#dbeafe",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={15} color={isDark ? "#60a5fa" : "#2563EB"} />
              <Text style={{ color: isDark ? "#60a5fa" : "#2563EB", fontWeight: "700", fontSize: 10, marginTop: 2 }}>
                Decline
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ── History tab content ───────────────────────────────────────────────────
  const renderHistory = () => {
    if (!history) return (
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 24 }}>
        Loading...
      </Text>
    );

    const resolvedBets = history.bets.filter((b) => !!b.my_response);

    return (
      <View>
        {resolvedBets.length > 0 && (
          <View>
            {resolvedBets.map(renderBet)}
          </View>
        )}

        {/* Empty */}
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Back ── */}
        <View style={{ paddingHorizontal: 8, paddingTop: 12 }}>
          <Button icon="arrow-left" mode="text" compact onPress={() => router.back()}
            style={{ alignSelf: "flex-start" }}
            labelStyle={{ color: theme.colors.onSurfaceVariant }}>
            Back
          </Button>
        </View>

        {/* ── Hero ── */}
        <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 24, paddingHorizontal: 20 }}>
          <View style={{
            width: 120, height: 120, borderRadius: 60,
            backgroundColor: theme.colors.primary,
            justifyContent: "center", alignItems: "center", marginBottom: 16,
            shadowColor: theme.colors.primary, shadowOpacity: 0.45,
            shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
          }}>
            <Ionicons name={(circle.icon as any) || "people"} size={48} color="white" />
          </View>

          <Text variant="headlineSmall" style={{
            color: theme.colors.onSurface, fontWeight: "800", marginBottom: 6, textAlign: "center",
          }}>
            {circle.name}
          </Text>

          {circle.description ? (
            <Text variant="bodyMedium" style={{
              color: theme.colors.onSurfaceVariant, textAlign: "center",
              paddingHorizontal: 30, marginBottom: 20,
            }}>
              {circle.description}
            </Text>
          ) : null}

          {/* Circle created date */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20, opacity: 0.6 }}>
            <Ionicons name="flag-outline" size={13} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Created {circle.created_at ? formatDate(circle.created_at) : ""}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            <Button mode="contained-tonal" icon="account-group"
              onPress={() => router.push(`/circle-profile/${circleId}/members`)}
              style={{ borderRadius: 10 }} labelStyle={{ fontSize: 13 }}>
              Members
            </Button>
            <Button mode="contained-tonal" icon="pencil"
              onPress={() => router.push(`/circle-profile/${circleId}/edit`)}
              style={{ borderRadius: 10 }} labelStyle={{ fontSize: 13 }}>
              Edit Circle
            </Button>
            <Button mode="contained-tonal" icon="account-plus"
              onPress={() => router.push(`/circle-profile/${circleId}/add-friend`)}
              style={{ borderRadius: 10 }} labelStyle={{ fontSize: 13 }}>
              Add Friend
            </Button>
            <Button mode="contained-tonal" icon="exit-to-app" onPress={handleLeave}
              labelStyle={{ fontSize: 13 }}>
              Leave
            </Button>
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={{
          flexDirection: "row", marginHorizontal: 20, marginBottom: 20,
          borderRadius: 12, overflow: "hidden",
          backgroundColor: isDark ? "#0F223A" : "#e8edf5",
        }}>
          {(["live", "history"] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <View key={tab} style={{ flex: 1 }}>
                <Button mode={active ? "contained" : "text"} onPress={() => setActiveTab(tab)}
                  style={{ borderRadius: 0, margin: 0 }}
                  labelStyle={{ color: active ? "white" : theme.colors.onSurfaceVariant, fontWeight: active ? "700" : "400", fontSize: 14 }}>
                  {tab === "history" ? "Circle History" : "Live Bets"}
                </Button>
              </View>
            );
          })}
        </View>

        {/* ── Tab content ── */}
        <View style={{ paddingHorizontal: 20 }}>
          {activeTab === "history" ? renderHistory() : (
            (() => {
              const pendingBets = history?.bets.filter((b) => !b.my_response) ?? [];
              if (pendingBets.length === 0) {
                return (
                  <Surface elevation={0} style={{
                    borderRadius: 16, backgroundColor: cardBg, padding: 28,
                    borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
                    alignItems: "center",
                  }}>
                    <Ionicons name="flash-outline" size={36} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
                      No live bets right now
                    </Text>
                  </Surface>
                );
              }
              return (
                <View>
                  {pendingBets.map(renderBet)}
                </View>
              );
            })()
          )}
        </View>
      </ScrollView>
    </View>
  );
}
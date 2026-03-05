import React, { useState, useCallback } from "react";
import { View, ScrollView, Alert, TouchableOpacity } from "react-native";
import { Text, Surface, Button, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";

const API = "http://localhost:3001";
const optionColors = ["#1D4ED8", "#2E6CF6", "#60A5FA", "#93C5FD"];

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
  const [activeTab, setActiveTab]   = useState<"history" | "live">("history");
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

  const handleLeave = () => {
    Alert.alert("Leave Circle", "Are you sure you want to leave this circle?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave", style: "destructive",
        onPress: async () => {
          try {
            const sessionId = await getSessionId();
            await fetch(`${API}/circles/${circleId}/leave`, {
              method: "DELETE",
              headers: { "x-session-id": sessionId ?? "" },
            });
            router.replace("/(tabs)/circles");
          } catch (err) {
            console.error("Leave error:", err);
          }
        },
      },
    ]);
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

    return (
      <Surface key={bet.id} elevation={1} style={{
        borderRadius: 18, marginBottom: 14,
        backgroundColor: cardBg, overflow: "hidden",
      }}>
        {/* Accent bar */}
        <View style={{
          height: 3,
          backgroundColor: accepted ? "#22c55e" : declined ? theme.colors.error : theme.colors.primary,
        }} />

        <View style={{ padding: 14 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={{
                color: theme.colors.onSurface, fontWeight: "800", marginBottom: 3,
              }}>
                {bet.title}
              </Text>
              {bet.description ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                  {bet.description}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <View style={{
                  backgroundColor: "rgba(46,108,246,0.15)", borderRadius: 6,
                  paddingHorizontal: 8, paddingVertical: 2,
                }}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: "700" }}>
                    by @{bet.creator_username}
                  </Text>
                </View>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {timeAgo(bet.created_at)}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  🪙 {bet.stake_amount}
                </Text>
              </View>
            </View>

            {/* Response status chip */}
            {accepted && (
              <Chip icon="check-circle" style={{ backgroundColor: "rgba(34,197,94,0.15)", height: 28 }}
                textStyle={{ color: "#22c55e", fontSize: 11 }}>
                Accepted
              </Chip>
            )}
            {declined && (
              <Chip icon="close-circle" style={{ backgroundColor: "rgba(239,68,68,0.15)", height: 28 }}
                textStyle={{ color: theme.colors.error, fontSize: 11 }}>
                Declined
              </Chip>
            )}
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", marginBottom: 12 }} />

          {/* Options */}
          {pending && (
            <View style={{ gap: 8 }}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4, fontWeight: "700" }}>
                PICK YOUR SIDE
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {bet.options.map((opt, i) => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => handleAccept(bet.id, opt.id)}
                    disabled={!!responding}
                    style={{
                      flex: 1, minWidth: 70,
                      backgroundColor: optionColors[i % optionColors.length],
                      paddingVertical: 10, paddingHorizontal: 8,
                      borderRadius: 12, alignItems: "center",
                      opacity: responding === `${bet.id}-${opt.id}` ? 0.6 : 1,
                      shadowColor: optionColors[i % optionColors.length],
                      shadowOpacity: 0.35, shadowRadius: 6, elevation: 3,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>
                      {opt.label}
                    </Text>
                    {opt.option_text ? (
                      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2, textAlign: "center" }}>
                        {opt.option_text}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}

                {/* Decline */}
                <TouchableOpacity
                  onPress={() => handleDecline(bet.id)}
                  disabled={!!responding}
                  style={{
                    flex: 1, minWidth: 70,
                    paddingVertical: 10, paddingHorizontal: 8,
                    borderRadius: 12, alignItems: "center",
                    borderWidth: 1.5, borderColor: theme.colors.error,
                  }}
                >
                  <Text style={{ color: theme.colors.error, fontWeight: "700", fontSize: 13 }}>
                    Decline
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Accepted — show which option they picked */}
          {accepted && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {bet.options.map((opt, i) => {
                const chosen = opt.id === bet.my_selected_option_id;
                return (
                  <View key={opt.id} style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
                    backgroundColor: chosen ? optionColors[i % optionColors.length] : subtleBg,
                    borderWidth: chosen ? 0 : 1,
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                  }}>
                    <Text style={{
                      color: chosen ? "#fff" : theme.colors.onSurfaceVariant,
                      fontWeight: chosen ? "800" : "400", fontSize: 13,
                    }}>
                      {opt.label}{opt.option_text ? `: ${opt.option_text}` : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Declined state */}
          {declined && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: "italic" }}>
              You declined this bet
            </Text>
          )}
        </View>
      </Surface>
    );
  };

  // ── History tab content ───────────────────────────────────────────────────
  const renderHistory = () => {
    if (!history) return (
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 24 }}>
        Loading...
      </Text>
    );

    const pendingBets  = history.bets.filter((b) => !b.my_response);
    const resolvedBets = history.bets.filter((b) => !!b.my_response);

    return (
      <View>
        {/* ── Circle created ── */}
        <View style={{
          flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 10,
        }}>
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: "rgba(46,108,246,0.15)",
            borderWidth: 1.5, borderColor: "rgba(46,108,246,0.35)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="flag" size={16} color={theme.colors.primary} />
          </View>
          <View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
              Circle created
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatDate(history.circle.created_at)}
            </Text>
          </View>
        </View>

        {/* ── Members ── */}
        <Surface elevation={0} style={{
          borderRadius: 16, backgroundColor: cardBg, padding: 14, marginBottom: 20,
          borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
        }}>
          <Text variant="labelLarge" style={{
            color: theme.colors.onSurfaceVariant, fontWeight: "700",
            letterSpacing: 0.5, marginBottom: 12,
          }}>
            MEMBERS ({history.members.length})
          </Text>
          {history.members.map((m) => (
            <View key={m.id} style={{
              flexDirection: "row", alignItems: "center",
              justifyContent: "space-between", marginBottom: 10,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: "rgba(46,108,246,0.15)",
                  borderWidth: 1, borderColor: "rgba(46,108,246,0.3)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name="person" size={16} color={theme.colors.primary} />
                </View>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: "600" }}>
                  @{m.username}
                </Text>
              </View>
              {m.joined_at && (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Joined {formatDate(m.joined_at)}
                </Text>
              )}
            </View>
          ))}
        </Surface>

        {/* ── Pending bets ── */}
        {pendingBets.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
              <Text variant="labelLarge" style={{
                color: theme.colors.onSurfaceVariant, fontWeight: "700", letterSpacing: 0.5,
              }}>
                AWAITING YOUR RESPONSE ({pendingBets.length})
              </Text>
            </View>
            {pendingBets.map(renderBet)}
          </View>
        )}

        {/* ── Responded bets ── */}
        {resolvedBets.length > 0 && (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ionicons name="checkmark-done-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelLarge" style={{
                color: theme.colors.onSurfaceVariant, fontWeight: "700", letterSpacing: 0.5,
              }}>
                RESPONDED ({resolvedBets.length})
              </Text>
            </View>
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
          ) : <View style={{ marginBottom: 20 }} />}

          {/* Action buttons */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            <Button mode="contained-tonal" icon="account-group"
              onPress={() => router.push(`/circle-profile/${circleId}/members`)}
              style={{ borderRadius: 10 }} labelStyle={{ fontSize: 13 }}>
              Members
            </Button>
            <Button mode="contained" icon="pencil"
              onPress={() => router.push(`/circle-profile/${circleId}/edit`)}
              style={{ borderRadius: 10 }} labelStyle={{ fontSize: 13 }}>
              Edit Circle
            </Button>
            <Button mode="contained-tonal" icon="account-plus"
              onPress={() => router.push(`/circle-profile/${circleId}/add-friend`)}
              style={{ borderRadius: 10 }} labelStyle={{ fontSize: 13 }}>
              Add Friend
            </Button>
            <Button mode="outlined" icon="exit-to-app" onPress={handleLeave}
              style={{ borderRadius: 10, borderColor: theme.colors.error }}
              labelStyle={{ fontSize: 13, color: theme.colors.error }}>
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
          {(["history", "live"] as const).map((tab) => {
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
            <Surface elevation={0} style={{
              borderRadius: 16, backgroundColor: cardBg, padding: 28,
              borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
              alignItems: "center",
            }}>
              <Ionicons name="flash-outline" size={36} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
                Live bets coming soon
              </Text>
            </Surface>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

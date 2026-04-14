import React, { useState, useCallback } from "react";
import { View, ScrollView, Alert, TouchableOpacity, DeviceEventEmitter } from "react-native";
import { Text, Button, Portal, Modal } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import BetCard from "@/components/BetCard";
import { API_BASE } from "@/constants/api";

type Member    = { id: string; username: string; joined_at: string };
type BetOption = { id: string; label: string; option_text: string };
type Bet = {
  id: string; title: string; description: string; stake_amount: number;
  closes_at: string | null; created_at: string; status: string;
  creator_username: string; my_response: "accepted" | "declined" | null;
  my_selected_option_id: string | null; options: BetOption[];
  is_creator?: boolean;
};

type Circle = {
  circle_id: string; name: string; description?: string; icon?: string;
  icon_color?: string; created_at: string; is_private?: boolean; is_creator?: boolean;
  coin_name?: string; coin_symbol?: string; coin_color?: string; coin_icon?: string;
  my_coin_balance?: number;
};
type HistoryData = { circle: Circle; members: Member[]; bets: Bet[] };

export default function CircleProfile() {
  const router            = useRouter();
  const { theme, isDark } = useAppTheme();
  const { id, from, userId } = useLocalSearchParams();
  const circleId          = Array.isArray(id) ? id[0] : id;
  const fromUserId        = Array.isArray(userId) ? userId[0] : userId;
  const fromUser          = from === "user";
  const fromPreview       = from === "preview";

  const [circle, setCircle]             = useState<Circle | null>(null);
  const [history, setHistory]           = useState<HistoryData | null>(null);
  const [activeTab, setActiveTab]       = useState<"new" | "open" | "history">("new");
  const [responding, setResponding]     = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [settlingBet, setSettlingBet]   = useState<any>(null);
  const [isMember, setIsMember]         = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => { fetchAll(); }, [circleId])
  );

  const fetchAll = async () => {
    try {
      const sessionId  = await getSessionId();
      const circleRes  = await fetch(`${API_BASE}/circles/${circleId}`);
      const circleData = await circleRes.json();
      setCircle(circleData);

      const histRes = await fetch(`${API_BASE}/circles/${circleId}/history`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (histRes.ok) {
          const histData = await histRes.json();
          setHistory(histData);
          setCircle(histData.circle);
          setIsMember(true);
        }
       else {
        setIsMember(false);
      }

      const reqRes = await fetch(`${API_BASE}/circles/${circleId}/requests`, {
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
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm("Are you sure you want to leave this circle?")
        : await new Promise<boolean>((resolve) =>
            Alert.alert(
              "Leave Circle",
              "Are you sure you want to leave this circle?",
              [
                { text: "Cancel", style: "cancel",      onPress: () => resolve(false) },
                { text: "Leave",  style: "destructive", onPress: () => resolve(true)  },
              ]
            )
          );

    if (!confirmed) return;

    try {
      const sessionId = await getSessionId();
      if (!sessionId) { alert("Not authenticated"); return; }
      const res = await fetch(`${API_BASE}/circles/${circleId}/leave`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not leave circle");
        return;
      }
      if (fromUserId) {
        router.replace({ pathname: `/circle-preview/${circleId}`, params: { userId: fromUserId } } as any);
      } else {
        router.replace("/(tabs)/circles");
      }
    } catch (err) {
      alert("Could not connect to server");
    }
  };

  const handleSettle = async (opt: any) => {
    if (!settlingBet) return;
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/bets/${settlingBet.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
        body: JSON.stringify({ winning_option_id: opt.id }),
      });
      if (res.ok) {
        setSettlingBet(null);
        fetchAll();
        DeviceEventEmitter.emit("coinsUpdated");
      }
    } catch (err) {
      console.error("Settle error:", err);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (!circle) return null;

  const allActionButtons = [

      { label: "Members", icon: "people", onPress: () => router.push(`/circle-profile/${circleId}/members?isPrivate=${circle.is_private ? "1" : "0"}&isCreator=${circle.is_creator ? "1" : "0"}&hasCoin=${circle.coin_name ? "1" : "0"}&coinName=${encodeURIComponent(circle.coin_name ?? "")}&coinColor=${encodeURIComponent(circle.coin_color ?? "")}&coinIcon=${encodeURIComponent(circle.coin_icon ?? "")}&coinSymbol=${encodeURIComponent(circle.coin_symbol ?? "")}`), showBadge: circle.is_private && requestCount > 0, memberOnly: false, creatorOnly: false, privateOnly: false },
        { label: "Edit",     icon: "pencil",       onPress: () => router.push(`/circle-profile/${circleId}/edit`),        showBadge: false, memberOnly: true, creatorOnly: false,  privateOnly: false },
        { label: "Add",      icon: "person-add",   onPress: () => router.push(`/circle-profile/${circleId}/add-friend`),  showBadge: false, memberOnly: true, creatorOnly: false, privateOnly: false },
        { label: "Leave",    icon: "exit-outline", onPress: handleLeave,                                                   showBadge: false, memberOnly: true, creatorOnly: false, privateOnly: false },
        { label: "Coin",     icon: "cash-outline", onPress: () => router.push(`/circle-profile/${circleId}/coin`),        showBadge: false, memberOnly: true, creatorOnly: true,  privateOnly: true  },
  ];

  const actionButtons = allActionButtons.filter(b =>
  (!b.memberOnly || isMember) &&
  (!b.creatorOnly || circle?.is_creator) &&
  (!b.privateOnly || circle?.is_private)
);

  const renderHistory = () => {
    if (!history) return (
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 24 }}>Loading...</Text>
    );
    const resolvedBets = history.bets.filter((b) =>
      ["SETTLED", "CANCELLED"].includes(b.status?.toUpperCase() ?? "")
    );
    return (
      <View>
        {resolvedBets.map((bet) => (
          <BetCard key={bet.id} item={bet} mode="active" onRefresh={fetchAll} onSettle={setSettlingBet} />
        ))}
        {resolvedBets.length === 0 && (
          <View style={{
            borderRadius: 16, padding: 28,
            backgroundColor: "rgba(255,255,255,0.07)",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
            alignItems: "center",
          }}>
            <Ionicons name="receipt-outline" size={36} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", fontSize: 14 }}>
              No bet history yet
            </Text>
          </View>
        )}
      </View>
    );
  };

  const tabs: { key: "new" | "open" | "history"; label: string }[] = [
    { key: "new",     label: "New"     },
    { key: "open",    label: "Open"    },
    { key: "history", label: "History" },
  ];

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Header row: Back + Chat button ── */}
        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: 16, paddingTop: 12, marginBottom: 8,
        }}>
          {/* Pill back button matching the rest of the app */}
          <TouchableOpacity
            onPress={() => {
              if ((fromUser || fromPreview) && fromUserId) {
                router.replace({ pathname: `/user/${fromUserId}`, params: {} } as any);
              } else {
                router.replace("/(tabs)/circles");
              }
            }}
            style={{ paddingHorizontal: 4, paddingVertical: 7 }}
          >
            <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/circle-profile/${circleId}/inbox?name=${encodeURIComponent(circle.name)}`)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 5,
              backgroundColor: "rgba(255,255,255,0.08)",
              borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
              borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
            }}
          >
            <Ionicons name="chatbubbles-outline" size={15} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.onSurface, fontSize: 13 }}>Chat</Text>
          </TouchableOpacity>
        </View>

        {/* ── Circle hero ── */}
        <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20 }}>
          <View style={{
            width: 90, height: 90, borderRadius: 45,
            backgroundColor: circle.icon_color ?? "#2c4a5e",
            justifyContent: "center", alignItems: "center", marginBottom: 14,
          }}>
            <Ionicons name={(circle.icon as any) ?? "people"} size={44} color="#fff" />
          </View>

          <Text style={{ color: theme.colors.onSurface, fontSize: 22, fontWeight: "600", marginBottom: 6 }}>
            {circle.name}
          </Text>

          <View style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            backgroundColor: "rgba(255,255,255,0.07)",
            borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10,
          }}>
            <Ionicons name={circle.is_private ? "lock-closed" : "globe-outline"} size={11} color={theme.colors.onSurfaceVariant} />
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

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, opacity: 0.6 }}>
  <Ionicons name="flag-outline" size={13} color={theme.colors.onSurfaceVariant} />
  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
    Created {circle.created_at ? formatDate(circle.created_at) : ""}
  </Text>
</View>

{circle.coin_name && (
  <TouchableOpacity
    activeOpacity={0.75}
    onPress={() => circle.is_creator ? router.push(`/circle-profile/${circleId}/coin`) : null}
    style={{
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: (circle.coin_color ?? "#f0c070") + "1a",
      borderWidth: 1, borderColor: (circle.coin_color ?? "#f0c070") + "44",
      borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
      marginBottom: 20,
    }}
  >
    <Ionicons name={(circle.coin_icon ?? "ellipse") as any} size={13} color={circle.coin_color ?? "#f0c070"} />
    <Text style={{ color: circle.coin_color ?? "#f0c070", fontSize: 13, fontWeight: "600" }}>
      {circle.coin_name}  •  {circle.my_coin_balance ?? 0} {circle.coin_symbol}
    </Text>
  </TouchableOpacity>
)}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {isMember === null ? null : (
              <>
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
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.5)", marginLeft: 2 }} />
                    )}
                  </TouchableOpacity>
                ))}
                {!isMember && (
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        const sessionId = await getSessionId();
                        const res = await fetch(`${API_BASE}/circles/${circleId}/join`, {
                          method: "POST",
                          headers: { "x-session-id": sessionId ?? "" },
                        });
                        if (res.ok) {
                          alert(`You have successfully joined ${circle.name}!`);
                          fetchAll();
                        } else {
                          const data = await res.json().catch(() => ({}));
                          alert(data.error || "Could not join circle");
                        }
                      } catch {
                        alert("Could not connect to server");
                      }
                    }}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      backgroundColor: theme.colors.primary,
                      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
                    }}
                  >
                    <Ionicons name="person-add" size={14} color="#fff" />
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Join</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 20 }}>
          {tabs.map(({ key, label }) => {
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

        {/* ── Tab content ── */}
        <View style={{ paddingHorizontal: 20 }}>
          {activeTab === "history" ? renderHistory() : (() => {
            const newBets = history?.bets.filter((b) =>
              b.my_response == null && b.status?.toUpperCase() === "PENDING"
            ) ?? [];
            const openBets = history?.bets.filter((b) =>
              (b.my_response === "accepted" || b.is_creator) &&
              !["SETTLED", "CANCELLED"].includes(b.status?.toUpperCase() ?? "")
            ) ?? [];

            if (activeTab === "new") {
              if (newBets.length === 0) return (
                <View style={{ borderRadius: 16, padding: 28, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center" }}>
                  <Ionicons name="flash-outline" size={36} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
                  <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", fontSize: 14 }}>No new bets right now</Text>
                </View>
              );
              return (
                <View>
                  {newBets.map((bet) => (
                    <BetCard
                      key={bet.id} item={bet} mode="feed"
                      accepting={responding} setAccepting={setResponding}
                      onRemove={(id) => setHistory((prev) => prev ? { ...prev, bets: prev.bets.filter((b) => b.id !== id) } : prev)}
                      onRefresh={fetchAll}
                    />
                  ))}
                </View>
              );
            }

            if (openBets.length === 0) return (
              <View style={{ borderRadius: 16, padding: 28, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center" }}>
                <Ionicons name="flash-outline" size={36} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
                <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", fontSize: 14 }}>No open bets right now</Text>
              </View>
            );
            return (
              <View>
                {openBets.map((bet) => (
                  <BetCard key={bet.id} item={bet} mode="active" onRefresh={fetchAll} onSettle={setSettlingBet} />
                ))}
              </View>
            );
          })()}
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={!!settlingBet}
          onDismiss={() => setSettlingBet(null)}
          contentContainerStyle={{
            margin: 24, borderRadius: 20, padding: 24,
            backgroundColor: "#1f3347",
            borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
          }}
          style={{ backgroundColor: "rgba(10,20,30,0.85)" }}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "700", marginBottom: 4 }}>
            Declare Winner
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16, fontSize: 13 }}>
            {settlingBet?.title}
          </Text>
          {(settlingBet?.options ?? []).map((opt: any) => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => handleSettle(opt)}
              style={{ padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: "rgba(157,212,190,0.07)", borderWidth: 1, borderColor: "rgba(157,212,190,0.2)" }}
            >
              <Text style={{ color: theme.colors.onSurface, fontWeight: "500", fontSize: 14 }}>
                {opt.label}. {opt.option_text ?? opt.text}
              </Text>
            </TouchableOpacity>
          ))}
          <Button onPress={() => setSettlingBet(null)} textColor={theme.colors.onSurfaceVariant} style={{ marginTop: 4 }}>
            Cancel
          </Button>
        </Modal>
      </Portal>
    </GradientBackground>
  );
}

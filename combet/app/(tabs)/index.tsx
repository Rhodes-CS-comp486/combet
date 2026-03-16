import React, { useEffect, useRef, useState } from "react";
import { View, FlatList, TouchableOpacity, DeviceEventEmitter, ScrollView} from "react-native";
import {Text, Searchbar, ActivityIndicator, Chip, Button, Surface, ProgressBar, Divider, Portal, Modal as PaperModal} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";

type SearchResult =
  | { type: "user";   id: string; label: string; subtitle: string; isFriend: boolean }
  | { type: "circle"; id: string; label: string; subtitle: string; isFriend: null };

const API_BASE = "http://localhost:3001";

function timeAgo(dateStr: string) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function HomeScreen() {
  const { theme, isDark } = useAppTheme();

  const [q, setQ]                 = useState("");
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [feed, setFeed]           = useState<any[]>([]);

  const [accepting, setAccepting]   = useState<string | null>(null);
  const [coins, setCoins]           = useState<number | null>(null);
  const [activeTab, setActiveTab]   = useState<"feed" | "active">("feed");
  const [activeBets, setActiveBets] = useState<any[]>([]);
  const [settlingBet, setSettlingBet] = useState<any | null>(null);
    const [recentResults, setRecentResults] = useState<any[]>([]);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);


    useEffect(() => { fetchFeed(); fetchCoins(); fetchActiveBets(); fetchRecentResults(); }, []);

      useEffect(() => {
        if (activeTab === "active") {
          fetchCoins();
          fetchActiveBets();
          fetchRecentResults();
        }
      }, [activeTab]);


    async function fetchActiveBets() {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/homefeed/active`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (!res.ok) throw new Error("Active bets failed");
      setActiveBets(await res.json());
    } catch (err) {
      console.error("Active bets error:", err);
    }
  }

  async function fetchRecentResults() {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/homefeed/recent-results`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (!res.ok) return;
      setRecentResults(await res.json());
    } catch (err) {
      console.error("Recent results error:", err);
    }
  }

    async function fetchCoins() {
      try {
        const sessionId = await getSessionId();
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { "x-session-id": sessionId ?? "" },
        });
        if (!res.ok) return;
        const data = await res.json();
        setCoins(data.coins ?? 120);
      } catch (err) {
        console.error("Coins fetch error:", err);
      }
    }

  async function fetchFeed() {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/homefeed/home`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (!res.ok) throw new Error("Feed failed");
      setFeed(await res.json());
    } catch (err) {
      console.error("Feed error:", err);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = q.trim();
    if (!query) { setResults([]); setSearching(false); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const sessionId = await getSessionId();
        const res = await fetch(
          `${API_BASE}/users/search?q=${encodeURIComponent(query)}`,
          { headers: { "x-session-id": sessionId ?? "" } }
        );
        if (!res.ok) throw new Error();
        setResults(await res.json());
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  const followUser = async (followingId: string) => {
    setResults((prev) =>
      prev.map((r) => r.type === "user" && r.id === followingId ? { ...r, isFriend: true } : r)
    );
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/users/follows`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
        body: JSON.stringify({ followingId }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setResults((prev) =>
        prev.map((r) => r.type === "user" && r.id === followingId ? { ...r, isFriend: false } : r)
      );
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const isUser = item.type === "user";
    return (
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)",
      }}>
        <View style={{
          width: 46, height: 46, borderRadius: 23,
          backgroundColor: isDark ? "rgba(46,108,246,0.18)" : "rgba(46,108,246,0.1)",
          alignItems: "center", justifyContent: "center", marginRight: 12,
        }}>
          <Ionicons name={isUser ? "person" : "people"} size={22} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.onSurface, fontWeight: "600", fontSize: 15 }}>{item.label}</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, marginTop: 1 }}>
            {isUser ? `@${item.subtitle}` : "Circle"}
          </Text>
        </View>
        {isUser && !item.isFriend && (
          <Button mode="contained" compact onPress={() => followUser(item.id)}
            style={{ borderRadius: 999 }} labelStyle={{ fontSize: 13, fontWeight: "700" }}>
            Follow
          </Button>
        )}
        {isUser && item.isFriend && (
          <Chip icon="check"
            style={{ backgroundColor: isDark ? "rgba(46,108,246,0.15)" : "#e8f0fe" }}
            textStyle={{ color: theme.colors.primary, fontSize: 12 }}>
            Following
          </Chip>
        )}
      </View>
    );
  };

  const renderFeedItem = ({ item }: { item: any }) => {
    const options = item.options ?? [];
    const totalJoined = Number(item.total_joined ?? 0);
    const stake = item.stake_amount ?? 0;
    const pot = stake * totalJoined;
    const barColors = ["#0ea5e9", "#10b981", "#8b5cf6", "#f43f5e"];

    return (
      <Surface elevation={2} style={{ borderRadius: 20, marginBottom: 14, overflow: "hidden" }}>

        {/* ── HEADER ── */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", padding: 16 }}>
          <View style={{
            alignItems: "center", gap: 6, paddingRight: 14,
            borderRightWidth: 1, borderRightColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
            marginRight: 14,
          }}>
            <View style={{
              width: 54, height: 54, borderRadius: 27,
              backgroundColor: isDark ? "rgba(46,108,246,0.18)" : "rgba(46,108,246,0.1)",
              borderWidth: 2, borderColor: "rgba(46,108,246,0.35)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name={(item.icon as any) || "people"} size={26} color={theme.colors.primary} />
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.primary, textAlign: "center" }}>
              {item.target_name}
            </Text>
          </View>

          <View style={{ flex: 1, gap: 4, paddingTop: 2 }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "800" }}>
              {item.title}
            </Text>
            {item.description ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.description}
              </Text>
            ) : null}
          </View>

          <Chip
            style={{
              marginLeft: 10,
              backgroundColor: item.custom_stake ? "rgba(99,102,241,0.1)" : "rgba(255,196,0,0.1)",
              borderColor: item.custom_stake ? "rgba(99,102,241,0.25)" : "rgba(255,196,0,0.25)",
              borderWidth: 1
            }}
            textStyle={{ color: item.custom_stake ? "#a5b4fc" : "#D4AF37", fontWeight: "800", fontSize: 14 }}
          >
            {item.custom_stake ?? `${stake} coins`}
          </Chip>
        </View>

        <Divider style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />

        {/* ── STATS ROW ── */}
        <View style={{ flexDirection: "row", paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: "800" }}>{totalJoined}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>JOINED</Text>
          </View>
          <Divider style={{ width: 1, height: "100%", backgroundColor: "rgba(255,255,255,0.15)" }} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {item.custom_stake ? (
              <Text variant="titleMedium" style={{ color: "#a5b4fc", fontWeight: "700", textAlign: "center" }}>Custom</Text>
            ) : (
              <Text variant="titleLarge" style={{ color: "#D4AF37", fontWeight: "800" }}>{pot}</Text>
            )}
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.custom_stake ? "STAKES" : "COIN POT"}
            </Text>
          </View>
          <Divider style={{ width: 1, height: "100%", backgroundColor: "rgba(255,255,255,0.15)" }} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, fontWeight: "800" }}>
              {item.closes_at ? fmtDate(item.closes_at) : "—"}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>CLOSES</Text>
          </View>
        </View>

        <Divider style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />

        {/* ── OPTIONS ── */}
        <View style={{ padding: 12, gap: 8 }}>
          {options.map((opt: any, i: number) => {
            const count = opt.count ?? 0;
            const pct = totalJoined > 0 ? Math.round((count / totalJoined) * 100) : 0;
            const potentialWin = Math.round((pot + stake) / (count + 1)) - stake;
            const barColor = barColors[i % barColors.length];

            return (
              <Surface key={opt.id} elevation={3} style={{
                borderRadius: 12, padding: 10,
                borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
                flexDirection: "row", alignItems: "center", gap: 12,
              }}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: "700", minWidth: 52 }}>
                  {opt.text}
                </Text>

                <View style={{ flex: 1, gap: 4 }}>
                  <ProgressBar
                    progress={pct / 100}
                    color={barColor}
                    style={{ height: 12, borderRadius: 99, maxWidth: "100%", backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}
                  />
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{count} people</Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: "600" }}>{pct}%</Text>
                  </View>
                </View>

                {!item.custom_stake && (
                  <Chip
                    style={{ backgroundColor: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.2)", borderWidth: 1 }}
                    textStyle={{ color: "#a5b4fc", fontSize: 11, fontWeight: "700" }}
                  >
                    +{potentialWin}
                  </Chip>
                )}

                <Button
                  mode="contained"
                  compact
                  loading={accepting === `${item.id}-${opt.id}`}
                  disabled={accepting !== null}
                  onPress={async () => {
                    setAccepting(`${item.id}-${opt.id}`);
                    try {
                      const sessionId = await getSessionId();
                      const res = await fetch(`${API_BASE}/bets/${item.id}/accept`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
                        body: JSON.stringify({ selectedOptionId: opt.id }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        if (res.status === 400 && data.error === "Not enough coins") {
                          alert(`Not enough coins! You have ${data.coins} but this bet costs ${stake}.`);
                        }
                        return;
                      }
                      if (data.coins !== undefined) DeviceEventEmitter.emit("coinsUpdated");
                      setFeed((prev) => prev.filter((b) => b.id !== item.id));
                    } finally {
                      setAccepting(null);
                    }
                  }}
                  style={{ borderRadius: 8 }}
                  labelStyle={{ fontWeight: "800", fontSize: 12 }}
                >
                  Join
                </Button>
              </Surface>
            );
          })}
        </View>

        {/* ── DECLINE ── */}
        <TouchableOpacity
          onPress={async () => {
            const sessionId = await getSessionId();
            await fetch(`${API_BASE}/bets/${item.id}/decline`, {
              method: "POST",
              headers: { "x-session-id": sessionId ?? "" },
            });
            setFeed((prev) => prev.filter((b) => b.id !== item.id));
          }}
          style={{
            padding: 10, alignItems: "center", justifyContent: "center",
            borderTopWidth: 1, borderTopColor: "rgba(239,68,68,0.15)",
            backgroundColor: "rgba(239,68,68,0.05)",
          }}
        >
          <Text variant="labelMedium" style={{ color: "rgba(239,68,68,0.6)" }}>✕  Decline</Text>
        </TouchableOpacity>

      </Surface>
    );
  };

  const renderActiveBetItem = ({ item }: { item: any }) => {
    const options = item.options ?? [];
    const totalJoined = Number(item.total_joined ?? 0);
    const stake = item.stake_amount ?? 0;
    const pot = stake * totalJoined;
    const isCreator = item.is_creator;
    const isClosed = item.status === "CLOSED";
    const barColors = ["#0ea5e9", "#10b981", "#8b5cf6", "#f43f5e"];

    return (
      <Surface elevation={2} style={{ borderRadius: 20, marginBottom: 14, overflow: "hidden" }}>

        {/* ── HEADER ── */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", padding: 16 }}>
          <View style={{
            alignItems: "center", gap: 6, paddingRight: 14,
            borderRightWidth: 1, borderRightColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
            marginRight: 14,
          }}>
            <View style={{
              width: 54, height: 54, borderRadius: 27,
              backgroundColor: isDark ? "rgba(46,108,246,0.18)" : "rgba(46,108,246,0.1)",
              borderWidth: 2, borderColor: "rgba(46,108,246,0.35)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name={(item.icon as any) || "people"} size={26} color={theme.colors.primary} />
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.primary, textAlign: "center" }}>
              {item.target_name}
            </Text>
          </View>

          <View style={{ flex: 1, gap: 4, paddingTop: 2 }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "800" }}>
              {item.title}
            </Text>
            {item.description ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.description}
              </Text>
            ) : null}
          </View>

          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Chip
              style={{
                backgroundColor: item.custom_stake ? "rgba(99,102,241,0.1)" : "rgba(255,196,0,0.1)",
                borderColor: item.custom_stake ? "rgba(99,102,241,0.25)" : "rgba(255,196,0,0.25)",
                borderWidth: 1,
              }}
              textStyle={{ color: item.custom_stake ? "#a5b4fc" : "#D4AF37", fontWeight: "800", fontSize: 14 }}
            >
              {item.custom_stake ?? `${stake} coins`}
            </Chip>
            <Chip
              style={{
                backgroundColor: isCreator ? "rgba(46,108,246,0.1)" : "rgba(16,185,129,0.1)",
                borderColor: isCreator ? "rgba(46,108,246,0.25)" : "rgba(16,185,129,0.25)",
                borderWidth: 1,
              }}
              textStyle={{ color: isCreator ? theme.colors.primary : "#10b981", fontWeight: "700", fontSize: 11 }}
            >
              {isCreator ? "Created" : "Joined"}
            </Chip>
          </View>
        </View>

        <Divider style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />

        {/* ── STATS ROW ── */}
        <View style={{ flexDirection: "row", paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: "800" }}>{totalJoined}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>JOINED</Text>
          </View>
          <Divider style={{ width: 1, height: "100%", backgroundColor: "rgba(255,255,255,0.15)" }} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {item.custom_stake ? (
              <Text variant="titleMedium" style={{ color: "#a5b4fc", fontWeight: "700", textAlign: "center" }}>Custom</Text>
            ) : (
              <Text variant="titleLarge" style={{ color: "#D4AF37", fontWeight: "800" }}>{pot}</Text>
            )}
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.custom_stake ? "STAKES" : "COIN POT"}
            </Text>
          </View>
          <Divider style={{ width: 1, height: "100%", backgroundColor: "rgba(255,255,255,0.15)" }} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Chip
              style={{
                backgroundColor: isClosed ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                borderColor: isClosed ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)",
                borderWidth: 1,
              }}
              textStyle={{ color: isClosed ? "#ef4444" : "#10b981", fontWeight: "700", fontSize: 11 }}
            >
              {isClosed ? "Closed" : "Open"}
            </Chip>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>STATUS</Text>
          </View>
        </View>

        <Divider style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />

        {/* ── OPTIONS ── */}
        <View style={{ padding: 12, gap: 8 }}>
          {options.map((opt: any, i: number) => {
            const count = opt.count ?? 0;
            const pct = totalJoined > 0 ? Math.round((count / totalJoined) * 100) : 0;
            const barColor = barColors[i % barColors.length];
            const isMyOption = item.my_option_id === opt.id;

            return (
              <Surface key={opt.id} elevation={3} style={{
                borderRadius: 12, padding: 10,
                borderWidth: 1,
                borderColor: isMyOption ? theme.colors.primary : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"),
                flexDirection: "row", alignItems: "center", gap: 12,
              }}>
                <View style={{ alignItems: "center", minWidth: 52 }}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
                    {opt.text}
                  </Text>
                  {isMyOption && (
                    <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
                  )}
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <ProgressBar
                    progress={pct / 100}
                    color={barColor}
                    style={{ height: 12, borderRadius: 99, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}
                  />
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{count} people</Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: "600" }}>{pct}%</Text>
                  </View>
                </View>
              </Surface>
            );
          })}
        </View>

        {/* ── SETTLED ── */}
        {item.status === 'SETTLED' && (() => {
          const winningOption = (item.options ?? []).find((o: any) => o.id === item.winning_option_id);
          const iWon = item.my_option_id === item.winning_option_id;
          const stake = item.stake_amount ?? 0;
          const totalJoinedNum = Number(item.total_joined ?? 0);
          const winnerCount = (item.options ?? []).find((o: any) => o.id === item.winning_option_id)?.count ?? 1;
          const payout = stake > 0 ? Math.floor((totalJoinedNum * stake) / winnerCount) : 0;
          return (
            <View style={{ padding: 12, paddingTop: 0 }}>
              <Surface elevation={1} style={{
                borderRadius: 12, padding: 12,
                backgroundColor: iWon ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                borderWidth: 1,
                borderColor: iWon ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)",
              }}>
                <Text style={{ color: iWon ? "#10b981" : "#ef4444", fontWeight: "800", textAlign: "center", fontSize: 16 }}>
                  {iWon ? "You Won!" : "You Lost"}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 4 }}>
                  Winner: {winningOption?.text ?? "?"}
                  {iWon && stake > 0 ? `  •  +${payout} coins` : ""}
                  {!iWon && item.custom_stake ? `  •  ${item.custom_stake}` : ""}
                </Text>
              </Surface>
            </View>
          );
        })()}

        {/* ── ACTIONS ── */}
        {(() => {
          const isPendingApproval = item.status === "PENDING_APPROVAL";
          const isDisputed = item.status === "DISPUTED";
          const myVote = item.my_vote;
          const approvalCount = Number(item.approval_count ?? 0);
          const totalVotes = Number(item.total_votes ?? 0);
          const totalJoinedNum = Number(item.total_joined ?? 0);
          const threshold = totalJoinedNum <= 2 ? 1 : Math.ceil(totalJoinedNum * 0.5);
          const proposedOption = (item.options ?? []).find((o: any) => o.id === item.proposed_winner_option_id);

          if (isDisputed) {
            return (
              <View style={{ padding: 12, paddingTop: 0 }}>
                <Surface elevation={1} style={{ borderRadius: 12, padding: 12, backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" }}>
                  <Text style={{ color: "#ef4444", fontWeight: "700", textAlign: "center" }}>⚠️ Outcome Disputed</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 4 }}>
                    Majority disputed this result. No payout has been made.
                  </Text>
                </Surface>
              </View>
            );
          }

          if (isPendingApproval) {
            return (
              <View style={{ padding: 12, paddingTop: 0, gap: 10 }}>
                <Surface elevation={1} style={{ borderRadius: 12, padding: 12, backgroundColor: "rgba(46,108,246,0.08)", borderWidth: 1, borderColor: "rgba(46,108,246,0.2)" }}>
                  <Text style={{ color: theme.colors.primary, fontWeight: "700", textAlign: "center" }}>
                    🏆 Proposed Winner: {proposedOption?.text ?? "?"}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 4 }}>
                    {approvalCount}/{threshold} approvals needed
                  </Text>
                </Surface>

                {!isCreator && myVote === null || (!isCreator && myVote === undefined) ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button
                      mode="contained"
                      onPress={async () => {
                        const sessionId = await getSessionId();
                        const res = await fetch(`${API_BASE}/bets/${item.id}/vote-winner`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
                          body: JSON.stringify({ approve: true }),
                        });

                        if (res.ok) { fetchActiveBets(); fetchRecentResults(); fetchCoins(); DeviceEventEmitter.emit("coinsUpdated"); }
                      }}
                      style={{ flex: 1, borderRadius: 10, backgroundColor: "#10b981" }}
                      labelStyle={{ fontWeight: "700" }}
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={async () => {
                        const sessionId = await getSessionId();
                        const res = await fetch(`${API_BASE}/bets/${item.id}/vote-winner`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
                          body: JSON.stringify({ approve: false }),
                        });
                        if (res.ok) { fetchActiveBets(); fetchRecentResults(); }
                      }}
                      style={{ flex: 1, borderRadius: 10, borderColor: "rgba(239,68,68,0.4)" }}
                      labelStyle={{ color: "#ef4444", fontWeight: "700" }}
                    >
                      ✕ Dispute
                    </Button>
                  </View>
                ) : !isCreator && myVote !== null && myVote !== undefined ? (
                  <Surface elevation={1} style={{ borderRadius: 12, padding: 10, alignItems: "center" }}>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontWeight: "600" }}>
                      You voted: {myVote ? "✓ Approved" : "✕ Disputed"}
                    </Text>
                  </Surface>
                ) : null}
              </View>
            );
          }

          if (isCreator) {
            return (
              <View style={{ flexDirection: "row", gap: 8, padding: 12, paddingTop: 0 }}>
                {!isClosed && (
                  <Button
                    mode="outlined"
                    onPress={async () => {
                      const sessionId = await getSessionId();
                      const res = await fetch(`${API_BASE}/bets/${item.id}/close`, {
                        method: "POST",
                        headers: { "x-session-id": sessionId ?? "" },
                      });
                      if (res.ok) { fetchActiveBets(); fetchRecentResults(); }
                    }}
                    style={{ flex: 1, borderRadius: 10, borderColor: "rgba(239,68,68,0.4)" }}
                    labelStyle={{ color: "#ef4444", fontWeight: "700" }}
                  >
                    Close Bet
                  </Button>
                )}
                {isClosed && (
                  <Button
                    mode="contained"
                    onPress={() => setSettlingBet(item)}
                    style={{ flex: 1, borderRadius: 10, backgroundColor: theme.colors.primary }}
                    labelStyle={{ fontWeight: "700" }}
                  >
                    Declare Winner
                  </Button>
                )}
              </View>
            );
          }

          return null;
        })()}

      </Surface>
    );
  };


  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16, paddingTop: 12 }}>

      {/* ── TABS ── */}
      {!q.trim() && (
        <View style={{ flexDirection: "row", marginBottom: 12, gap: 8 }}>
          <TouchableOpacity
            onPress={() => setActiveTab("feed")}
            style={{
              flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
              backgroundColor: activeTab === "feed" ? theme.colors.primary : (isDark ? "#0F223A" : "#ffffff"),
            }}
          >
            <Text style={{ color: activeTab === "feed" ? "#ffffff" : theme.colors.onSurfaceVariant, fontWeight: "700" }}>
              Feed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("active")}
            style={{
              flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
              backgroundColor: activeTab === "active" ? theme.colors.primary : (isDark ? "#0F223A" : "#ffffff"),
            }}
          >
            <Text style={{ color: activeTab === "active" ? "#ffffff" : theme.colors.onSurfaceVariant, fontWeight: "700" }}>
              Active Bets
            </Text>
          </TouchableOpacity>
        </View>
      )}


      <Searchbar
        placeholder="Search users, circles..."
        value={q}
        onChangeText={setQ}
        style={{
          borderRadius: 12,
          backgroundColor: isDark ? "#0F223A" : "#ffffff",
          marginBottom: 12,
        }}
        inputStyle={{ color: theme.colors.onSurface }}
        iconColor={theme.colors.onSurfaceVariant}
        placeholderTextColor={theme.colors.onSurfaceVariant}
      />

      {q.trim() ? (
        searching ? (
          <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : results.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 24, textAlign: "center", fontSize: 14 }}>
            No matches found
          </Text>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => `${item.type}:${item.id}`}
            renderItem={renderSearchResult}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : activeTab === "feed" ? (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          renderItem={renderFeedItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40, fontSize: 14 }}>
              No bets yet — create one or join a circle!
            </Text>
          }
        />
      ) : (
        <FlatList
         
        data={activeBets.filter(b => b.status !== 'SETTLED')}



          keyExtractor={(item) => item.id}

          ListHeaderComponent={recentResults.length > 0 ? (
            <View style={{ marginBottom: 8 }}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10, letterSpacing: 1 }}>
                RECENT RESULTS
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                {recentResults.map((item) => {
                  const iWon = item.my_option_id === item.winning_option_id;
                  const stake = item.stake_amount ?? 0;
                  const totalJoined = Number(item.total_joined ?? 0);
                  const winnerCount = Number(item.winner_count ?? 1);
                  const payout = stake > 0 ? Math.floor((totalJoined * stake) / winnerCount) : 0;
                  const diff = Date.now() - new Date(item.created_at).getTime();
                  const days = Math.floor(diff / 86400000);
                  const timeLabel = days < 1 ? "today" : days < 7 ? `${days}d ago` : `${Math.floor(days/7)}w ago`;

                  return (
                    <Surface key={item.id} elevation={2} style={{
                      minWidth: 160, borderRadius: 16, padding: 14, flexShrink: 0,
                      borderWidth: 1,
                      borderColor: iWon ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)",
                    }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <Chip
                          style={{
                            backgroundColor: iWon ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                            height: 26,
                          }}
                          textStyle={{ color: iWon ? "#10b981" : "#ef4444", fontSize: 12, fontWeight: "700" }}
                        >
                          {iWon ? "Won" : "Lost"}
                        </Chip>
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>{item.target_name ?? item.creator_username}</Text>
                      </View>
                      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: "700", marginBottom: 6 }} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {iWon && stake > 0 ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#D4AF37" }} />
                          <Text style={{ color: "#D4AF37", fontWeight: "800", fontSize: 18 }}>+{payout}</Text>
                        </View>
                      ) : !iWon && stake > 0 ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#ef4444" }} />
                          <Text style={{ color: "#ef4444", fontWeight: "800", fontSize: 18 }}>-{stake}</Text>
                        </View>
                      ) : item.custom_stake ? (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>{item.custom_stake}</Text>
                      ) : (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>—</Text>
                      )}

                    </Surface>
                  );
                })}
              </ScrollView>

              <Divider style={{ backgroundColor: "rgba(255,255,255,0.15)", marginTop: 16, marginBottom: 12 }} />
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10, letterSpacing: 1 }}>
                ACTIVE BETS
              </Text>
            </View>
          ) : null}

          renderItem={({ item }) => {
            if (item.isHeader) return (
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10, marginTop: 4 }}>
                RECENTLY SETTLED
              </Text>
            );
            return renderActiveBetItem({ item });
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40, fontSize: 14 }}>
              No active bets yet!
            </Text>
          }
        />
      )}

        <Portal>
        <PaperModal
          visible={!!settlingBet}
          onDismiss={() => setSettlingBet(null)}
          contentContainerStyle={{
            margin: 24, borderRadius: 20, padding: 24,
            backgroundColor: isDark ? "#0D1F35" : "#ffffff",
          }}
        >
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: "800", marginBottom: 8 }}>
            Declare Winner
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
            Pick the winning option for "{settlingBet?.title}"
          </Text>
          <View style={{ gap: 10 }}>
            {(settlingBet?.options ?? []).map((opt: any) => (
              <Button
                key={opt.id}
                mode="outlined"
                onPress={async () => {
                  const sessionId = await getSessionId();
                  const res = await fetch(`${API_BASE}/bets/${settlingBet.id}/propose-winner`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
                    body: JSON.stringify({ winningOptionId: opt.id }),
                  });
                  
                  if (res.ok) {
                    setSettlingBet(null);
                    fetchActiveBets();
                    fetchRecentResults();
                }}}
                style={{ borderRadius: 12, borderColor: theme.colors.primary }}
                labelStyle={{ color: theme.colors.primary, fontWeight: "700" }}
              >
                {opt.text}
              </Button>
            ))}
          </View>
          <Button
            mode="text"
            onPress={() => setSettlingBet(null)}
            style={{ marginTop: 8 }}
            labelStyle={{ color: theme.colors.onSurfaceVariant }}
          >
            Cancel
          </Button>
        </PaperModal>
      </Portal>
    </View>
  );
}
import React, { useEffect, useRef, useState } from "react";
import { View, FlatList, TouchableOpacity, ScrollView, Pressable } from "react-native";
import { Text, Searchbar, ActivityIndicator, Button, Divider, Portal, Modal as PaperModal } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme, DesignTokens } from "@/context/ThemeContext";
import UserAvatar from "@/components/UserAvatar";
import GradientBackground from "@/components/GradientBackground";
import BetCard from "@/components/BetCard";
import { API_BASE } from "@/constants/api";

type UserResult   = { type: "user";   id: string; label: string; subtitle: string; isFriend: boolean; avatar_color?: string; avatar_icon?: string; };
type CircleResult = { type: "circle"; id: string; label: string; subtitle: string; isFriend: null; joinStatus?: "pending" | "joined" | null; is_private?: boolean; icon?: string; icon_color?: string; };type SearchResult = UserResult | CircleResult;




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
  const [searchTab, setSearchTab]   = useState<"people" | "circles">("people");
  const [settlingBet, setSettlingBet] = useState<any | null>(null);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const res = await fetch(`${API_BASE}/users/me`, { headers: { "x-session-id": sessionId ?? "" } });
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
      const res = await fetch(`${API_BASE}/homefeed/home`, { headers: { "x-session-id": sessionId ?? "" } });
      if (!res.ok) throw new Error("Feed failed");
      setFeed(await res.json());
    } catch (err) {
      console.error("Feed error:", err);
    }
  }

  // ── Search with debounce ──────────────────────────────────────────────────
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
        const data = await res.json();
        setResults(data.map((r: any) => ({
          ...r,
          joinStatus: r.join_status ?? null,
        })));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // ── Follow user ───────────────────────────────────────────────────────────
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

  // ── Join public circle ────────────────────────────────────────────────────
  const joinCircle = async (circleId: string) => {
    setResults((prev) =>
      prev.map((r) => r.type === "circle" && r.id === circleId
        ? { ...r, joinStatus: "joined" } : r)
    );
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/circles/${circleId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
      });
      if (!res.ok) throw new Error();
    } catch {
      setResults((prev) =>
        prev.map((r) => r.type === "circle" && r.id === circleId
          ? { ...r, joinStatus: null } : r)
      );
    }
  };

  // ── Request to join private circle ────────────────────────────────────────
  const requestJoinCircle = async (circleId: string) => {
    setResults((prev) =>
      prev.map((r) => r.type === "circle" && r.id === circleId
        ? { ...r, joinStatus: "pending" } : r)
    );
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/circles/${circleId}/request-join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
      });
      if (!res.ok) throw new Error();
    } catch {
      setResults((prev) =>
        prev.map((r) => r.type === "circle" && r.id === circleId
          ? { ...r, joinStatus: null } : r)
      );
    }
  };

  const users   = results.filter((r): r is UserResult   => r.type === "user");
  const circles = results.filter((r): r is CircleResult => r.type === "circle");

  // ── Search UI ─────────────────────────────────────────────────────────────
  const renderSearchUI = () => {
    if (searching) {
      return <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 24 }} />;
    }

    return (
      <View style={{ flex: 1, paddingTop: 8, paddingHorizontal: 16 }}>
        {/* Tab bar */}
        <View style={{ flexDirection: "row", marginBottom: 16 }}>
          {(["people", "circles"] as const).map((tab) => {
            const count  = tab === "people" ? users.length : circles.length;
            const active = searchTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setSearchTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderBottomColor: active ? theme.colors.primary : "rgba(255,255,255,0.08)",
                }}
              >
                <Text style={{
                  fontSize:   13,
                  fontWeight: active ? "600" : "400",
                  color:      active ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                }}>
                  {tab === "people" ? "People" : "Circles"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── People list ── */}
        {searchTab === "people" && (
          users.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Ionicons name="people-outline" size={36} color={theme.colors.onSurfaceVariant} />
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, fontSize: 13 }}>
                No users found
              </Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => `user:${item.id}`}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  paddingVertical: 12, gap: 12,
                  borderBottomWidth: 0.5,
                  borderBottomColor: theme.colors.outline,
                }}>
                  <UserAvatar
                    user={{
                      display_name: item.label,
                      username:     item.subtitle,
                      avatar_color: item.avatar_color,
                      avatar_icon:  item.avatar_icon,
                    }}
                    size={42}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.onSurface, fontWeight: "600", fontSize: 14 }}>
                      {item.label}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 1 }}>
                      @{item.subtitle}
                    </Text>
                  </View>
                  {!item.isFriend ? (
                    <TouchableOpacity
                      onPress={() => followUser(item.id)}
                      style={{
                        backgroundColor:  theme.colors.primary,
                        borderRadius:     20,
                        paddingHorizontal: 14,
                        paddingVertical:  6,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>Follow</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{
                      backgroundColor:  theme.colors.surface,
                      borderRadius:     20,
                      paddingHorizontal: 12,
                      paddingVertical:  6,
                      borderWidth:      0.5,
                      borderColor:      theme.colors.outline,
                      flexDirection:    "row",
                      alignItems:       "center",
                      gap:              4,
                    }}>
                      <Ionicons name="checkmark" size={12} color={theme.colors.onSurfaceVariant} />
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Following</Text>
                    </View>
                  )}
                </View>
              )}
            />
          )
        )}

        {/* ── Circles list ── */}
        {searchTab === "circles" && (
          circles.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Ionicons name="ellipse-outline" size={36} color={theme.colors.onSurfaceVariant} />
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, fontSize: 13 }}>
                No circles found
              </Text>
            </View>
          ) : (
            <FlatList
              data={circles}
              keyExtractor={(item) => `circle:${item.id}`}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  paddingVertical: 12, gap: 12,
                  borderBottomWidth: 0.5,
                  borderBottomColor: theme.colors.outline,
                }}>
                  <View style={{
                  width:           42,
                  height:          42,
                  borderRadius:    12,
                  backgroundColor: item.icon_color ?? theme.colors.primary,
                  alignItems:      "center",
                  justifyContent:  "center",
                }}>
                  <Ionicons name={(item.icon as any) || "people"} size={20} color="#fff" />
                </View>

                  <View style={{ flex: 1 }}>
                    {/* Circle name + privacy badge on same line */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ color: theme.colors.onSurface, fontWeight: "600", fontSize: 14 }}>
                        {item.label}
                      </Text>
                      <View style={{
                        flexDirection:    "row",
                        alignItems:       "center",
                        gap:              3,
                        backgroundColor:  item.is_private
                          ? "rgba(232,112,96,0.1)"
                          : "rgba(157,212,190,0.1)",
                        borderRadius:     20,
                        paddingHorizontal: 6,
                        paddingVertical:  2,
                      }}>
                        <Ionicons
                          name={item.is_private ? "lock-closed" : "globe-outline"}
                          size={10}
                          color={item.is_private ? "#e87060" : "#9dd4be"}
                        />
                        <Text style={{
                          fontSize:   10,
                          fontWeight: "500",
                            color: item.is_private ? "#e87060" : "#9dd4be",
                        }}>
                          {item.is_private ? "Private" : "Public"}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 1 }}>
                      {item.subtitle || "Circle"}
                    </Text>
                  </View>

                  {/* Join button — public: join directly, private: request */}
                  <Pressable
                    onPress={() => {
                      if (item.joinStatus === "joined" || item.joinStatus === "pending") return;
                      if (item.is_private) {
                        requestJoinCircle(item.id);
                      } else {
                        joinCircle(item.id);
                      }
                    }}
                    style={{
                      backgroundColor:
                          item.joinStatus === "joined"  ? "rgba(76,175,80,0.1)" :
                          item.joinStatus === "pending" ? theme.colors.surface :
                          theme.colors.primary,
                      borderRadius:     20,
                      paddingHorizontal: 14,
                      paddingVertical:  6,
                      borderWidth:      0.5,
                      borderColor:
                          item.joinStatus === "joined"  ? "rgba(157,212,190,0.25)" :
                          item.joinStatus === "pending" ? "rgba(255,255,255,0.1)" :
                          "rgba(157,212,190,0.3)",
                      flexDirection: "row",
                      alignItems:    "center",
                      gap:           4,
                    }}
                  >
                    {item.joinStatus === "joined" && (
                        <Ionicons name="checkmark" size={12} color="#9dd4be" />
                    )}
                    <Text style={{
                      color:
                          item.joinStatus === "joined"  ? "#9dd4be" :
                          item.joinStatus === "pending" ? theme.colors.onSurfaceVariant :
                          "#fff",
                      fontSize:   12,
                      fontWeight: "500",
                    }}>
                      {item.joinStatus === "joined"  ? "Joined" :
                       item.joinStatus === "pending" ? "Requested" :
                       item.is_private               ? "Request" : "Join"}
                    </Text>
                  </Pressable>
                </View>
              )}
            />
          )
        )}
      </View>
    );
  };

  const renderFeedItem = ({ item }: { item: any }) => (
    <BetCard
      item={item}
      mode="feed"
      accepting={accepting}
      setAccepting={setAccepting}
      onRemove={(id) => setFeed((prev) => prev.filter((b) => b.id !== id))}
    />
  );

  const renderActiveBetItem = ({ item }: { item: any }) => (
    <BetCard
      item={item}
      mode="active"
      onRefresh={() => { fetchActiveBets(); fetchRecentResults(); fetchCoins(); }}
      onSettle={setSettlingBet}
    />
  );

  return (
    <GradientBackground>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <Searchbar
        placeholder="Search users, circles..."
        value={q}
        onChangeText={setQ}
        style={{
          borderRadius:    12,
          backgroundColor: "rgba(255,255,255,0.09)",
          marginBottom:    0,
        }}
        inputStyle={{ color: theme.colors.onSurface }}
        iconColor={theme.colors.onSurfaceVariant}
        placeholderTextColor={theme.colors.onSurfaceVariant}
      />

      </View>
      {!q.trim() && (
        <View style={{ flexDirection: "row", marginBottom: 16, paddingHorizontal: 16 }}>
          <TouchableOpacity
            onPress={() => setActiveTab("feed")}
            style={{
              paddingVertical:   12,
              marginRight:       24,
              marginBottom:      -1,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === "feed" ? theme.colors.primary : "transparent",
            }}
          >
            <Text style={{
              fontSize:   13,
              fontWeight: activeTab === "feed" ? "600" : "400",
              color:      activeTab === "feed" ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
            }}>
              Feed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("active")}
            style={{
              paddingVertical:   12,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === "active" ? theme.colors.primary : "transparent",
            }}
          >
            <Text style={{
              fontSize:   13,
              fontWeight: activeTab === "active" ? "600" : "400",
              color:      activeTab === "active" ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
            }}>
              Active Bets
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flex: 1 }}>
      {q.trim() ? (
        renderSearchUI()
      ) : activeTab === "feed" ? (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          renderItem={renderFeedItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
          style={{ backgroundColor: "transparent" }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40, fontSize: 14 }}>
              No bets yet — create one or join a circle!
            </Text>
          }
        />
      ) : (
        <FlatList
          data={activeBets.filter(b => b.status !== "SETTLED")}
          keyExtractor={(item) => item.id}
          style={{ backgroundColor: "transparent" }}
          ListHeaderComponent={recentResults.length > 0 ? (
            <View style={{ marginBottom: 8 }}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10, letterSpacing: 1 }}>
                RECENT RESULTS
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                {recentResults.map((item) => {
                  const iWon       = item.my_option_id === item.winning_option_id;
                  const stake      = item.stake_amount ?? 0;
                  const totalJoined = Number(item.total_joined ?? 0);
                  const winnerCount = Number(item.winner_count ?? 1);
                  const payout     = stake > 0 ? Math.floor((totalJoined * stake) / winnerCount) : 0;
                  const diff       = Date.now() - new Date(item.created_at).getTime();
                  const days       = Math.floor(diff / 86400000);
                  const timeLabel  = days < 1 ? "today" : days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;

                  return (
                      <View key={item.id} style={{
                          width: 180,
                          borderRadius: 16,
                          padding: 14,
                          flexShrink: 0,
                          backgroundColor: "rgba(255,255,255,0.07)",
                          borderWidth: 2,
                          borderColor: iWon ? "rgba(157,212,190,0.4)" : "rgba(232,112,96,0.4)",
                          flexDirection: "column",
                        }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            {item.target_type === "circle" ? (
                              <View style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: item.circle_icon_color ?? "rgba(255,255,255,0.08)",
                                borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
                                alignItems: "center", justifyContent: "center", flexShrink: 0,
                              }}>
                                <Ionicons name={(item.circle_icon as any) ?? "people"} size={20} color="#fff" />
                              </View>
                            ) : (
                              <UserAvatar
                                user={{
                                  display_name: item.is_creator ? item.target_name : item.creator_username,
                                  username: item.is_creator ? item.target_name : item.creator_username,
                                  avatar_color: item.is_creator ? item.target_avatar_color : item.creator_avatar_color,
                                  avatar_icon: item.is_creator ? item.target_avatar_icon : item.creator_avatar_icon,
                                }}
                                size={40}
                              />
                            )}
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ fontSize: 12, color: iWon ? "#9dd4be" : "#e87060", fontWeight: "600" }} numberOfLines={1}>
                                {item.target_name ?? ""}
                              </Text>
                              <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}>{timeLabel}</Text>
                            </View>
                          </View>
                          <Text style={{ color: theme.colors.onSurface, fontWeight: "500", fontSize: 13, marginBottom: 12, lineHeight: 18, flex: 1 }} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            {iWon && stake > 0 ? (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: DesignTokens.gold }} />
                                <Text style={{ color: DesignTokens.gold, fontWeight: "400", fontSize: 20 }}>+ {payout}</Text>
                              </View>
                            ) : !iWon && stake > 0 ? (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#e87060" }} />
                                <Text style={{ color: "#e87060", fontWeight: "400", fontSize: 20 }}>- {stake}</Text>
                              </View>
                            ) : item.custom_stake ? (
                              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }} numberOfLines={1}>{item.custom_stake}</Text>
                            ) : (
                              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>—</Text>
                            )}
                            {!iWon && !item.is_creator && (
                              <TouchableOpacity
                                onPress={async () => {
                                  const sessionId = await getSessionId();
                                  const res = await fetch(`${API_BASE}/bets/${item.id}/dispute`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
                                  });
                                  if (res.ok) fetchRecentResults();
                                }}
                                style={{
                                  backgroundColor: "rgba(232,112,96,0.1)",
                                  borderWidth: 1, borderColor: "rgba(232,112,96,0.25)",
                                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                                }}
                              >
                                <Text style={{ fontSize: 11, color: "#e87060", fontWeight: "500" }}>Dispute</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
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
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40, fontSize: 14 }}>
              No active bets yet!
            </Text>
          }
        />
      )}

      </View>

      <Portal>
        <PaperModal
          visible={!!settlingBet}
          onDismiss={() => setSettlingBet(null)}
          contentContainerStyle={{
            margin:          24,
            borderRadius:    20,
            padding:         24,
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
                  const res = await fetch(`${API_BASE}/bets/${settlingBet.id}/settle`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
                    body:    JSON.stringify({ winningOptionId: opt.id }),
                  });
                  if (res.ok) {
                    setSettlingBet(null);
                    fetchActiveBets();
                    fetchRecentResults();
                    fetchCoins();
                    setSettlingBet(null);

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
    </GradientBackground>
  );
}
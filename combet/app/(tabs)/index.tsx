import React, { useEffect, useRef, useState } from "react";
import { View, FlatList, TouchableOpacity, DeviceEventEmitter, ScrollView, Animated } from "react-native";
import { Text, Searchbar, ActivityIndicator, Chip, Button, Surface, ProgressBar, Divider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import UserAvatar from "@/components/UserAvatar";

type UserResult   = { type: "user";   id: string; label: string; subtitle: string; isFriend: boolean; avatar_color?: string; avatar_icon?: string; };
type CircleResult = { type: "circle"; id: string; label: string; subtitle: string; isFriend: null };
type SearchResult = UserResult | CircleResult;

const API_BASE = "http://localhost:3001";

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function HomeScreen() {
  const { theme, isDark } = useAppTheme();

  const [q, setQ]                 = useState("");
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [feed, setFeed]           = useState<any[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [coins, setCoins]         = useState<number | null>(null);
  const [searchTab, setSearchTab] = useState<"people" | "circles">("people");
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideAnim                 = useRef(new Animated.Value(0)).current;

  useEffect(() => { fetchFeed(); fetchCoins(); }, []);

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

  const switchTab = (tab: "people" | "circles") => {
    setSearchTab(tab);
    Animated.spring(slideAnim, {
      toValue: tab === "people" ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  };

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

  const users   = results.filter((r): r is UserResult   => r.type === "user");
  const circles = results.filter((r): r is CircleResult => r.type === "circle");

  // ── Search UI ───────────────────────────────────────────────────────────────
  const renderSearchUI = () => {
    if (searching) {
      return <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 24 }} />;
    }

    return (
      <View style={{ flex: 1 }}>
        {/* Tab bar */}
        <View style={{
          flexDirection: "row",
          backgroundColor: theme.colors.surface,
          borderRadius: 10,
          padding: 3,
          marginBottom: 14,
          borderWidth: 0.5,
          borderColor: theme.colors.outline,
        }}>
          {(["people", "circles"] as const).map((tab) => {
            const count = tab === "people" ? users.length : circles.length;
            const active = searchTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => switchTab(tab)}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 7,
                  borderRadius: 8,
                  gap: 6,
                  backgroundColor: active ? theme.colors.background : "transparent",
                  borderWidth: active ? 0.5 : 0,
                  borderColor: theme.colors.outline,
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: active ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                }}>
                  {tab === "people" ? "People" : "Circles"}
                </Text>
                <View style={{
                  backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant,
                  borderRadius: 20,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: "600",
                    color: active ? "#fff" : theme.colors.onSurfaceVariant,
                  }}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sliding panes */}
        <View style={{ flex: 1, overflow: "hidden" }}>
          <Animated.View style={{
            flexDirection: "row",
            width: "200%",
            flex: 1,
            transform: [{
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -180], // half of screen width approx
              }),
            }],
          }}>
            {/* People pane */}
            <View style={{ width: "50%", flex: 1 }}>
              {users.length === 0 ? (
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
                          username: item.subtitle,
                          avatar_color: item.avatar_color,
                          avatar_icon: item.avatar_icon,
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
                            backgroundColor: theme.colors.primary,
                            borderRadius: 20,
                            paddingHorizontal: 14,
                            paddingVertical: 6,
                          }}
                        >
                          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>Follow</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{
                          backgroundColor: theme.colors.surface,
                          borderRadius: 20,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderWidth: 0.5,
                          borderColor: theme.colors.outline,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}>
                          <Ionicons name="checkmark" size={12} color={theme.colors.onSurfaceVariant} />
                          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Following</Text>
                        </View>
                      )}
                    </View>
                  )}
                />
              )}
            </View>

            {/* Circles pane */}
            <View style={{ width: "50%", flex: 1 }}>
              {circles.length === 0 ? (
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
                  renderItem={({ item }) => (
                    <View style={{
                      flexDirection: "row", alignItems: "center",
                      paddingVertical: 12, gap: 12,
                      borderBottomWidth: 0.5,
                      borderBottomColor: theme.colors.outline,
                    }}>
                      {/* Circle icon — rounded square */}
                      <View style={{
                        width: 42, height: 42,
                        borderRadius: 12,
                        backgroundColor: theme.colors.surfaceVariant,
                        borderWidth: 0.5,
                        borderColor: theme.colors.outline,
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Ionicons name="people" size={20} color="#a78bfa" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.onSurface, fontWeight: "600", fontSize: 14 }}>
                          {item.label}
                        </Text>
                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 1 }}>
                          {item.subtitle || "Circle"}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: "#1a1030",
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderWidth: 0.5,
                        borderColor: "#2d1f5e",
                      }}>
                        <Text style={{ color: "#a78bfa", fontSize: 11, fontWeight: "500" }}>Circle</Text>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </Animated.View>
        </View>
      </View>
    );
  };

  // ── Feed item ───────────────────────────────────────────────────────────────
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
            <UserAvatar
              user={{
                display_name: item.creator_name || item.creator_username,
                username: item.creator_username,
                avatar_color: item.creator_avatar_color,
                avatar_icon: item.creator_avatar_icon,
              }}
              size={54}
            />
            <Text variant="labelSmall" style={{ color: theme.colors.primary, textAlign: "center" }}>
              {item.target_name}
            </Text>
          </View>

          <View style={{ flex: 1, gap: 4, paddingTop: 2 }}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>
              {item.creator_name || item.creator_username}
            </Text>
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
              borderWidth: 1,
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
              <Text variant="titleLarge" style={{ color: "#FFC400", fontWeight: "800" }}>{pot}</Text>
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16, paddingTop: 12 }}>
      <Searchbar
        placeholder="Search users, circles..."
        value={q}
        onChangeText={setQ}
        style={{
          borderRadius: 12,
          backgroundColor: isDark ? "#111827" : "#ffffff",
          marginBottom: 12,
        }}
        inputStyle={{ color: theme.colors.onSurface }}
        iconColor={theme.colors.onSurfaceVariant}
        placeholderTextColor={theme.colors.onSurfaceVariant}
      />

      {q.trim() ? (
        renderSearchUI()
      ) : (
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
      )}
    </View>
  );
}

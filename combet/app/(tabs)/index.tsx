import React, { useEffect, useRef, useState } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import {Text, Searchbar, ActivityIndicator, Chip, Button, Surface, ProgressBar, Divider} from "react-native-paper";
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

  const [accepting, setAccepting] = useState<string | null>(null);
    const [coins, setCoins]         = useState<number | null>(null);
    const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { fetchFeed(); fetchCoins(); }, []);

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
            style={{ marginLeft: 10, backgroundColor: "rgba(255,196,0,0.1)", borderColor: "rgba(255,196,0,0.25)", borderWidth: 1 }}
            textStyle={{ color: "#D4AF37", fontWeight: "800", fontSize: 14 }}
          >
            {stake} coins
          </Chip>
        </View>

        <Divider style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />

        {/* ── STATS ROW ── */}
        <View style={{ flexDirection: "row", paddingVertical: 12, paddingHorizontal: 16 }}>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: "800" }}>{totalJoined}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>JOINED</Text>
          </View>
          <Divider style={{ width: 1, height: "100%", backgroundColor: "rgba(255,255,255,0.15)" }} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text variant="titleLarge" style={{ color: "#D4AF37", fontWeight: "800" }}>{pot}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>COIN POT</Text>
          </View>
          <Divider style={{ width: 1, height: "100%", backgroundColor: "rgba(255,255,255,0.15)" }} />
          <View style={{ flex: 1, alignItems: "center" }}>
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

                <Chip
                  style={{ backgroundColor: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.2)", borderWidth: 1 }}
                  textStyle={{ color: "#a5b4fc", fontSize: 11, fontWeight: "700" }}
                >
                  +{potentialWin}
                </Chip>

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
                      if (data.coins !== undefined) setCoins(data.coins);
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
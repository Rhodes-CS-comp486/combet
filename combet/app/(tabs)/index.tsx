import React, { useEffect, useRef, useState } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text, Searchbar, ActivityIndicator, Chip, Button } from "react-native-paper";
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
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchFeed(); }, []);

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
        borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
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
    const cardBg = isDark ? "#0D1E33" : "#ffffff";
    const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";

    return (
      <View style={{
        borderRadius: 18,
        marginBottom: 14,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor,
        flexDirection: "row",
        overflow: "hidden",
        minHeight: 160,
      }}>

        {/* ── LEFT: icon centered + circle name below ── */}
        <View style={{
          width: 90,
          borderRightWidth: 1,
          borderRightColor: borderColor,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 16,
          gap: 8,
        }}>
          <View style={{
            width: 58, height: 58, borderRadius: 29,
            backgroundColor: isDark ? "rgba(46,108,246,0.2)" : "rgba(46,108,246,0.12)",
            borderWidth: 2, borderColor: "rgba(46,108,246,0.4)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name={(item.icon as any) || "people"} size={26} color={theme.colors.primary} />
          </View>
          <Text style={{
            color: theme.colors.primary, fontWeight: "700", fontSize: 11,
            textAlign: "center", paddingHorizontal: 6,
          }} numberOfLines={2}>
            {item.target_name}
          </Text>
        </View>

        {/* ── MIDDLE: bet info ── */}
        <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 6 }}>
          <Text style={{ color: theme.colors.onSurface, fontWeight: "800", fontSize: 17, lineHeight: 22 }}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, lineHeight: 19 }}>
              {item.description}
            </Text>
          ) : null}
          <View style={{ gap: 2, marginTop: 4 }}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
              Posted {fmtDate(item.created_at)}
            </Text>
            {item.closes_at ? (
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                Closes {fmtDate(item.closes_at)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── RIGHT: stacked option buttons + decline ── */}
        <View style={{
          width: 90,
          borderLeftWidth: 1,
          borderLeftColor: borderColor,
        }}>
          {options.map((opt: any, i: number) => (
            <TouchableOpacity
              key={opt.id}
              onPress={async () => {
                setAccepting(`${item.id}-${opt.id}`);
                const sessionId = await getSessionId();
                await fetch(`${API_BASE}/bets/${item.id}/accept`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
                  body: JSON.stringify({ selectedOptionId: opt.id }),
                });
                setFeed((prev) => prev.filter((b) => b.id !== item.id));
                setAccepting(null);
              }}
              style={{
                flex: 1,
                backgroundColor: i % 2 === 0 ? "#2563EB" : "#3B82F6",
                alignItems: "center",
                justifyContent: "center",
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.1)",
                opacity: accepting === `${item.id}-${opt.id}` ? 0.5 : 1,
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>{opt.label}</Text>
              {opt.option_text ? (
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 2, textAlign: "center" }}>
                  {opt.option_text}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}

          {/* Decline */}
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
              flex: 1,
              backgroundColor: isDark ? "#091828" : "#dbeafe",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={16} color={isDark ? "#60a5fa" : "#2563EB"} />
            <Text style={{ color: isDark ? "#60a5fa" : "#2563EB", fontWeight: "700", fontSize: 11, marginTop: 2 }}>
              Decline
            </Text>
          </TouchableOpacity>
        </View>

      </View>
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
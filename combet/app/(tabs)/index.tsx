import React, { useEffect, useRef, useState } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text, Searchbar, Surface, Button, ActivityIndicator, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";

type SearchResult =
  | { type: "user";   id: string; label: string; subtitle: string; isFriend: boolean }
  | { type: "circle"; id: string; label: string; subtitle: string; isFriend: null };

const API_BASE = "http://localhost:3001";

export default function HomeScreen() {
  const { theme, isDark } = useAppTheme();

  const [q, setQ]                 = useState("");
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [feed, setFeed]           = useState<any[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Feed ──────────────────────────────────────────────────────────────────
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

  // ── Search ────────────────────────────────────────────────────────────────
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
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        setResults(await res.json());
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // ── Follow ────────────────────────────────────────────────────────────────
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

  // ── Search result card ────────────────────────────────────────────────────
  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const isUser = item.type === "user";
    return (
      <Surface
        elevation={1}
        style={{
          borderRadius:    14,
          marginBottom:    10,
          backgroundColor: isDark ? "#0F2A44" : "#ffffff",
          padding:         14,
          flexDirection:   "row",
          alignItems:      "center",
        }}
      >
        <View style={{
          width: 42, height: 42, borderRadius: 21,
          backgroundColor: "rgba(46,108,246,0.15)",
          borderWidth: 1, borderColor: "rgba(46,108,246,0.35)",
          alignItems: "center", justifyContent: "center", marginRight: 12,
        }}>
          <Ionicons name={isUser ? "person" : "people"} size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: "600" }}>
            {item.label}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {isUser ? (item.isFriend ? "Friend" : `@${item.subtitle}`) : "Circle"}
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
            style={{ backgroundColor: isDark ? "#0F2A44" : "#e8f0fe" }}
            textStyle={{ color: theme.colors.primary, fontSize: 12 }}>
            Following
          </Chip>
        )}
      </Surface>
    );
  };

  // ── Bet card ──────────────────────────────────────────────────────────────
  const renderFeedItem = ({ item }: { item: any }) => {
    const optionColors = ["#1D4ED8", "#2E6CF6", "#60A5FA", "#93C5FD"];

    return (
      <Surface
        elevation={2}
        style={{
          borderRadius:    20,
          marginBottom:    16,
          backgroundColor: isDark ? "#0D1F35" : "#ffffff",
          overflow:        "hidden",
        }}
      >
        {/* ── Coloured top accent bar ── */}
        <View style={{
          height:          4,
          backgroundColor: theme.colors.primary,
          opacity:         0.85,
        }} />

        <View style={{ padding: 16 }}>
          {/* ── Header row: avatar + meta ── */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            {/* Circle avatar */}
            <View style={{
              width:           44,
              height:          44,
              borderRadius:    22,
              backgroundColor: "rgba(46,108,246,0.18)",
              borderWidth:     1.5,
              borderColor:     "rgba(46,108,246,0.4)",
              alignItems:      "center",
              justifyContent:  "center",
              marginRight:     12,
            }}>
              <Ionicons
                name={(item.icon as any) || "ellipse-outline"}
                size={22}
                color={theme.colors.primary}
              />
            </View>

            {/* Title + meta */}
            <View style={{ flex: 1 }}>
              <Text
                variant="titleMedium"
                style={{
                  color:      theme.colors.onSurface,
                  fontWeight: "800",
                  lineHeight: 22,
                }}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 }}>
                <View style={{
                  backgroundColor: "rgba(46,108,246,0.15)",
                  borderRadius:    6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: "700" }}>
                    {item.target_name}
                  </Text>
                </View>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Description ── */}
          {item.description ? (
            <Text
              variant="bodyMedium"
              style={{
                color:        theme.colors.onSurfaceVariant,
                marginBottom: 16,
                lineHeight:   20,
              }}
            >
              {item.description}
            </Text>
          ) : null}

          {/* ── Divider ── */}
          <View style={{
            height:          1,
            backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
            marginBottom:    14,
          }} />

          {/* ── Options row ── */}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {item.options?.map((opt: any, i: number) => {
              const color = optionColors[i % optionColors.length];
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={async () => {
                    setAccepting(`${item.id}-${opt.id}`);
                    const sessionId = await getSessionId();
                    await fetch(`${API_BASE}/bets/${item.id}/accept`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "x-session-id": sessionId ?? "",
                      },
                      body: JSON.stringify({ selectedOptionId: opt.id }),
                    });
                    setAccepting(null);
                    fetchFeed();
                  }}
                  style={{
                    flex:             1,
                    minWidth:         80,
                    backgroundColor:  color,
                    paddingVertical:  12,
                    paddingHorizontal: 10,
                    borderRadius:     12,
                    alignItems:       "center",
                    opacity:          accepting === `${item.id}-${opt.id}` ? 0.7 : 1,
                    shadowColor:      color,
                    shadowOpacity:    0.35,
                    shadowRadius:     8,
                    shadowOffset:     { width: 0, height: 3 },
                    elevation:        4,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
                    {opt.label}
                  </Text>
                  {opt.text ? (
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 }}>
                      {opt.text}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}

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
                flex:             1,
                minWidth:         80,
                backgroundColor:  "transparent",
                paddingVertical:  12,
                paddingHorizontal: 10,
                borderRadius:     12,
                alignItems:       "center",
                borderWidth:      1.5,
                borderColor:      theme.colors.error,
              }}
            >
              <Text style={{ color: theme.colors.error, fontWeight: "700", fontSize: 14 }}>
                Decline
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Surface>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 16 }}>
      <Searchbar
        placeholder="Search users, circles..."
        value={q}
        onChangeText={setQ}
        style={{
          borderRadius:    12,
          backgroundColor: isDark ? "#0F223A" : "#ffffff",
          marginBottom:    12,
        }}
        inputStyle={{ color: theme.colors.onSurface }}
        iconColor={theme.colors.onSurfaceVariant}
        placeholderTextColor={theme.colors.onSurfaceVariant}
      />

      {q.trim() ? (
        searching ? (
          <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : results.length === 0 ? (
          <Text variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, textAlign: "center" }}>
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
            <Text variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40 }}>
              No bets yet — create one or join a circle!
            </Text>
          }
        />
      )}
    </View>
  );
}
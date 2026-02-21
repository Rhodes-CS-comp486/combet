import { View, Text, FlatList, Pressable, TouchableOpacity } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import SearchBar from "../../components/searchbar";
import { getSessionId } from "@/components/sessionStore";

// searchbar result
type SearchResult =
  | {
      type: "user";
      id: string;
      label: string;     // display name
      subtitle: string;  // username
      isFriend: boolean; // friend status
    }
  | {
      type: "circle";
      id: string;
      label: string;     // circle name
      subtitle: string;  // description
      isFriend: null;
    };

const API_BASE = "http://localhost:3001";

export default function HomeScreen() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = q.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const sessionId = await getSessionId();

        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
          headers: { "x-session-id": sessionId ?? "" },
        });

        if (!res.ok) throw new Error(`Search failed: ${res.status}`);

        const data: SearchResult[] = await res.json();
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  const followUser = async (followingId: string) => {
    setResults((prev) =>
      prev.map((r) =>
        r.type === "user" && r.id === followingId ? { ...r, isFriend: true } : r
      )
    );

    try {
      const sessionId = await getSessionId();

      const res = await fetch(`${API_BASE}/follows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId ?? "",
        },
        body: JSON.stringify({ followingId }),
      });

      if (!res.ok) throw new Error(`Follow failed: ${res.status}`);
    } catch (err) {
      console.error("Follow error:", err);
      // revert
      setResults((prev) =>
        prev.map((r) =>
          r.type === "user" && r.id === followingId ? { ...r, isFriend: false } : r
        )
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#051120", padding: 16, gap: 12 }}>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search users, circles..." />

      {!q.trim() ? (
        <Text style={{ color: "rgba(255,255,255,0.75)" }}>
          Start typing to search.
        </Text>
      ) : loading ? (
        <Text style={{ color: "rgba(255,255,255,0.75)" }}>Searching...</Text>
      ) : results.length === 0 ? (
        <Text style={{ color: "rgba(255,255,255,0.75)" }}>No matches.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}:${item.id}`}
          renderItem={({ item }) => {
            const isUser = item.type === "user";

            return (
              <Pressable
                onPress={() => {
                  // later: navigate based on type
                }}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 10,
                  backgroundColor: "#0F2A44",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: "#FFFFFF" }}>
                    {item.label}
                  </Text>

                  {isUser ? (
                    item.isFriend ? (
                      <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
                        Friend
                      </Text>
                    ) : (
                      <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
                        @{item.subtitle}
                      </Text>
                    )
                  ) : (
                    <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
                      circle
                    </Text>
                  )}
                </View>

                {isUser && !item.isFriend && (
                  <TouchableOpacity
                    onPress={() => followUser(item.id)}
                    style={{
                      backgroundColor: "#2E6CF6",
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>Follow</Text>
                  </TouchableOpacity>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
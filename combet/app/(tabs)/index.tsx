import { View, Text, FlatList, Pressable, TouchableOpacity } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import SearchBar from "../../components/searchbar";
import { getSessionId } from "@/components/sessionStore";
import {Ionicons} from "@expo/vector-icons";

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

  const [feed, setFeed] = useState<any[]>([]);
  useEffect(() => {
          fetchFeed();
        }, []);

        async function fetchFeed() {
          try {
            const sessionId = await getSessionId();

            const res = await fetch(`${API_BASE}/homefeed`, {
              headers: { "x-session-id": sessionId ?? "" },
            });

            if (!res.ok) throw new Error("Feed failed");

            const data = await res.json();
            setFeed(data);
          } catch (err) {
            console.error("Feed error:", err);
          }
        }

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
      <View style={{ flex: 1, backgroundColor: "#051120", padding: 16 }}>

        {/* SEARCH BAR ALWAYS AT TOP */}
        <SearchBar
          value={q}
          onChangeText={setQ}
          placeholder="Search users, circles..."
        />

        {q.trim() ? (
          // 🔎 SHOW SEARCH RESULTS
          loading ? (
            <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 12 }}>
              Searching...
            </Text>
          ) : results.length === 0 ? (
            <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 12 }}>
              No matches.
            </Text>
          ) : (
              <FlatList
              style={{ marginTop: 12 }}
              data={results}
              keyExtractor={(item) => `${item.type}:${item.id}`}
              renderItem={({ item }) => {
                const isUser = item.type === "user";

                return (
                  <Pressable
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
                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                        {item.label}
                      </Text>

                      {isUser ? (
                        item.isFriend ? (
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.7)",
                              marginTop: 4,
                            }}
                          >
                            Friend
                          </Text>
                        ) : (
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.7)",
                              marginTop: 4,
                            }}
                          >
                            @{item.subtitle}
                          </Text>
                        )
                      ) : (
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.7)",
                            marginTop: 4,
                          }}
                        >
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
                        <Text style={{ color: "#fff", fontWeight: "700" }}>
                          Follow
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Pressable>
                );
              }}
            />



          )
        ) : (
          // 🏠 SHOW FEED
          <FlatList
            style={{ marginTop: 12 }}
            data={feed}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              console.log("ICON VALUE:", item.icon);

              return (
                <View
                  style={{
                    backgroundColor: "#0F2A44",
                    borderRadius: 18,
                    marginBottom: 18,
                    padding: 18,
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  {/* LEFT SIDE */}
                  <View style={{ flex: 1, paddingRight: 16, flexDirection: "row" }}>
                    {/* Avatar */}
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: "rgba(59,130,246,0.15)",
                        borderWidth: 1,
                        borderColor: "rgba(59,130,246,0.4)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                      }}
                    >
                      <Ionicons
                      name={item.icon || "ellipse"}
                      size={24}
                      color="#3B82F6"
                    />
                    </View>

                    {/* Text Content */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 20,
                          fontWeight: "700",
                          marginBottom: 6,
                        }}
                      >
                        {item.title}
                      </Text>

                      {item.description ? (
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.75)",
                            fontSize: 14,
                            marginBottom: 8,
                          }}
                        >
                          {item.description}
                        </Text>
                      ) : null}

                      <Text style={{ color: "#94A3B8", fontSize: 12 }}>
                        Posted in {item.target_name}
                      </Text>

                      <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {/* RIGHT SIDE */}
                  <View style={{ justifyContent: "center", gap: 10 }}>
                    {item.options?.map((opt: any) => (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={async () => {
                          const sessionId = await getSessionId();
                          await fetch(`${API_BASE}/bets/${item.id}/accept`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "x-session-id": sessionId ?? "",
                            },
                            body: JSON.stringify({
                              selectedOptionId: opt.id,
                            }),
                          });
                          fetchFeed();
                        }}
                        style={{
                          backgroundColor: "#1E4ED8",
                          paddingVertical: 8,
                          paddingHorizontal: 14,
                          borderRadius: 12,
                          minWidth: 80,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontWeight: "600",
                            textAlign: "center",
                          }}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      onPress={async () => {
                        const sessionId = await getSessionId();
                        await fetch(`${API_BASE}/bets/${item.id}/decline`, {
                          method: "POST",
                          headers: {
                            "x-session-id": sessionId ?? "",
                          },
                        });
                        setFeed((prev) => prev.filter((b) => b.id !== item.id));
                      }}
                      style={{
                        backgroundColor: "#7F1D1D",
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      >
                        Decline
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}

      </View>
    );
}
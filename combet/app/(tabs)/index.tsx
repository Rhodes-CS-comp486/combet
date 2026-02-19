/*import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';
import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
*/

import { View, Text, FlatList, Pressable } from 'react-native';
import React, { useMemo, useState } from "react";
import SearchBar from "../../components/searchbar";


type Result =
  | { type: "friend"; id: string; label: string }
  | { type: "circle"; id: string; label: string }
  | { type: "community"; id: string; label: string };

// placeholder data
const MOCK: Result[] = [
  { type: "friend", id: "u1", label: "Karen Zheng" },
  { type: "friend", id: "u2", label: "Sophia Zamora" },
  { type: "friend", id: "u3", label: "Abril Unda" },
  { type: "circle", id: "c1", label: "Run Friends" },
  { type: "circle", id: "c2", label: "Rhodes CS Squad" },
  { type: "community", id: "m1", label: "Memphis Runners" },
  { type: "community", id: "m2", label: "COMP486 Community" },
];

export default function HomeScreen() {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return MOCK.filter((r) => r.label.toLowerCase().includes(query));
  }, [q]);

  return (
    <View style={{ flex: 1, backgroundColor: "#051120", padding: 16, gap: 12 }}>


      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder="Search friends, circles, communities..."
      />

      {!q.trim() ? (
        <Text style={{ color: "rgba(255,255,255,0.75)" }}>Start typing to search (mock data for now).</Text>
      ) : results.length === 0 ? (
        <Text style={{ color: "rgba(255,255,255,0.75)" }}>No matches.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}:${item.id}`}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                // later: navigate to friend/circle/community detail screens
              }}
              style={{
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 10,
                  backgroundColor: "#0F2A44",
}}
            >
              <Text style={{ fontWeight: "600", color: "#FFFFFF" }}>{item.label}</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)" }}>{item.type}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

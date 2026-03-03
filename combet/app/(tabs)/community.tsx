import React, { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { Text, Searchbar, Surface } from "react-native-paper";
import { useAppTheme } from "@/context/ThemeContext";

// placeholder data
const COMMUNITIES = [
  { id: "m1", name: "Memphis Runners" },
  { id: "m2", name: "COMP486 Community" },
];

export default function CommunityScreen() {
  const { theme } = useAppTheme();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return COMMUNITIES;
    return COMMUNITIES.filter((c) => c.name.toLowerCase().includes(query));
  }, [q]);

  return (
    <View
      style={{
        flex:            1,
        backgroundColor: theme.colors.background,
        padding:         16,
        gap:             12,
      }}
    >
      {/* ── Search Bar ── */}
      <Searchbar
        placeholder="Search communities..."
        value={q}
        onChangeText={setQ}
        style={{
          borderRadius:    12,
          backgroundColor: theme.colors.surface,
        }}
        inputStyle={{ color: theme.colors.onSurface }}
        iconColor={theme.colors.onSurfaceVariant}
        placeholderTextColor={theme.colors.onSurfaceVariant}
      />

      {/* ── Community List ── */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Surface
            elevation={1}
            style={{
              padding:         14,
              borderRadius:    12,
              backgroundColor: theme.colors.surface,
              marginBottom:    10,
            }}
          >
            <Text
              variant="bodyLarge"
              style={{ fontWeight: "600", color: theme.colors.onSurface }}
            >
              {item.name}
            </Text>
          </Surface>
        )}
        ListEmptyComponent={
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40 }}
          >
            No communities found
          </Text>
        }
      />
    </View>
  );
}
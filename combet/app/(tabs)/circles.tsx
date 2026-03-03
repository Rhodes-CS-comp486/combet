import React, { useMemo, useState, useCallback } from "react";
import { FlatList, View } from "react-native";
import { Text, Searchbar, Surface, FAB } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import { TouchableOpacity } from "react-native";

type Circle = {
  circle_id: string;
  name: string;
  icon?: string;
};

export default function CirclesScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  const [circles, setCircles] = useState<Circle[]>([]);
  const [q, setQ] = useState("");

  // ── Fetch circles on focus ────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadCircles = async () => {
        try {
          const sessionId = await getSessionId();
          if (!sessionId) return;

          const res = await fetch("http://localhost:3001/circles/my", {
            headers: { "x-session-id": sessionId },
          });

          if (!res.ok) return;

          const data = await res.json();
          if (isActive) setCircles(data);
        } catch (err) {
          console.error("Error fetching circles:", err);
        }
      };

      loadCircles();
      return () => { isActive = false; };
    }, [])
  );

  // ── Search filtering ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return circles;
    return circles.filter((c) => c.name.toLowerCase().includes(query));
  }, [q, circles]);

  // ── Circle card ───────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Circle }) => (
    <TouchableOpacity
      style={{ width: "33.33%", alignItems: "center", marginBottom: 28 }}
      onPress={() => router.push(`/circle-profile/${item.circle_id}`)}
    >
      <Surface
        elevation={2}
        style={{
          width:            80,
          height:           80,
          borderRadius:     40,
          backgroundColor:  theme.colors.surface,
          justifyContent:   "center",
          alignItems:       "center",
          marginBottom:     8,
        }}
      >
        <Ionicons
          name={(item.icon as any) || "people"}
          size={28}
          color={theme.colors.primary}
        />
      </Surface>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurface, textAlign: "center" }}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16, paddingTop: 12 }}>

      {/* ── Search Bar ── */}
      <Searchbar
        placeholder="Search circles..."
        value={q}
        onChangeText={setQ}
        style={{
          marginBottom:    16,
          borderRadius:    12,
          backgroundColor: theme.colors.surface,
        }}
        inputStyle={{ color: theme.colors.onSurface }}
        iconColor={theme.colors.onSurfaceVariant}
        placeholderTextColor={theme.colors.onSurfaceVariant}
      />

      {/* ── Circles Grid ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.circle_id}
        renderItem={renderItem}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40 }}
          >
            No circles yet
          </Text>
        }
      />

      {/* ── FAB (floating add button) ── */}
      <FAB
        icon="plus"
        onPress={() => router.push("/create-circle")}
        style={{
          position:         "absolute",
          bottom:           24,
          right:            20,
          backgroundColor:  theme.colors.primary,
        }}
        color="white"
      />
    </View>
  );
}
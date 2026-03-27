import React, { useMemo, useState, useCallback } from "react";
import { FlatList, View, TouchableOpacity } from "react-native";
import { Text, Searchbar, Surface } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import { API_BASE } from "@/constants/api";

type Circle = {
  circle_id:  string;
  name:       string;
  icon?:      string;
  is_private: boolean;
};

export default function CirclesScreen() {
  const router      = useRouter();
  const { theme }   = useAppTheme();

  const [circles, setCircles] = useState<Circle[]>([]);
  const [q, setQ]             = useState("");

  // ── Fetch circles on focus ────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadCircles = async () => {
        try {
          const sessionId = await getSessionId();
          if (!sessionId) return;

          const res = await fetch(`${API_BASE}/circles/my`, {
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
          width:           150,
          height:          150,
          borderRadius:    75,
          backgroundColor: theme.colors.surface,
          justifyContent:  "center",
          alignItems:      "center",
          marginBottom:    8,
        }}
      >
        <Ionicons
          name={(item.icon as any) || "people"}
          size={70}
          color={theme.colors.primary}
        />
      </Surface>

      <Text style={{
        color:       theme.colors.onSurface,
        textAlign:   "center",
        fontSize:    15,
        fontWeight:  "300",
        letterSpacing: 1.5,
      }}>
        {item.name}
      </Text>

      {/* ── Private / Public badge ── */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
        <Ionicons
          name={item.is_private ? "lock-closed" : "globe-outline"}
          size={11}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
          {item.is_private ? "Private" : "Public"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <GradientBackground style={{ paddingHorizontal: 16, paddingTop: 12 }}>

      {/* ── Search Bar ── */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Searchbar
          placeholder="Search circles..."
          value={q}
          onChangeText={setQ}
          style={{
            flex:            1,
            borderRadius:    12,
            backgroundColor: "rgba(255,255,255,0.09)",
          }}
          inputStyle={{ color: theme.colors.onSurface }}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
        <TouchableOpacity
          onPress={() => router.push("/create-circle")}
          style={{
            width:           55,
            height:          55,
            borderRadius:    27,
            backgroundColor: "rgba(255,255,255,0.09)",
            borderWidth:     1,
            borderColor:     "rgba(255,255,255,0.13)",
            alignItems:      "center",
            justifyContent:  "center",
          }}
        >
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Circles Grid ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.circle_id}
        renderItem={renderItem}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 100, paddingTop: 25 }}
        ListEmptyComponent={
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40 }}
          >
            No circles yet
          </Text>
        }
      />

    </GradientBackground>
  );
}
import React, { useState, useCallback } from "react";
import { View, ScrollView, Alert } from "react-native";
import { Text, Surface, Button, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";

type Circle = {
  circle_id: string;
  name: string;
  description?: string;
  icon?: string;
};

export default function CircleProfile() {
  const router   = useRouter();
  const { theme, isDark } = useAppTheme();
  const { id }   = useLocalSearchParams();
  const circleId = Array.isArray(id) ? id[0] : id;

  const [circle, setCircle]       = useState<Circle | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "live">("history");

  // ── Fetch circle ────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!circleId) return;
      fetch(`http://localhost:3001/circles/${circleId}`)
        .then((res) => res.json())
        .then((data) => setCircle(data))
        .catch((err) => console.error(err));
    }, [circleId])
  );

  // ── Leave circle ─────────────────────────────────────────────────────────
  const handleLeaveCircle = () => {
    Alert.alert("Leave Circle", "Are you sure you want to leave this circle?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            const sessionId = await getSessionId();
            if (!sessionId) return;

            await fetch(`http://localhost:3001/circles/${circleId}/leave`, {
              method: "DELETE",
              headers: { "x-session-id": sessionId },
            });

            router.replace("/(tabs)/circles");
          } catch (err) {
            console.error("Leave circle error:", err);
          }
        },
      },
    ]);
  };

  if (!circle) return null;

  const cardBg = isDark ? "#0F223A" : "#ffffff";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero section ── */}
        <Surface
          elevation={0}
          style={{
            alignItems:      "center",
            paddingTop:      32,
            paddingBottom:   28,
            paddingHorizontal: 20,
            backgroundColor: theme.colors.background,
          }}
        >
          {/* Icon bubble */}
          <View
            style={{
              width:           120,
              height:          120,
              borderRadius:    60,
              backgroundColor: theme.colors.primary,
              justifyContent:  "center",
              alignItems:      "center",
              marginBottom:    16,
              shadowColor:     theme.colors.primary,
              shadowOpacity:   0.45,
              shadowRadius:    20,
              shadowOffset:    { width: 0, height: 8 },
              elevation:       10,
            }}
          >
            <Ionicons
              name={(circle.icon as any) || "people"}
              size={48}
              color="white"
            />
          </View>

          {/* Name */}
          <Text
            variant="headlineSmall"
            style={{
              color:        theme.colors.onSurface,
              fontWeight:   "800",
              marginBottom: 6,
              textAlign:    "center",
            }}
          >
            {circle.name}
          </Text>

          {/* Description */}
          {circle.description ? (
            <Text
              variant="bodyMedium"
              style={{
                color:            theme.colors.onSurfaceVariant,
                textAlign:        "center",
                paddingHorizontal: 30,
                marginBottom:     20,
              }}
            >
              {circle.description}
            </Text>
          ) : (
            <View style={{ marginBottom: 20 }} />
          )}

          {/* ── Action buttons ── */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            <Button
              mode="contained-tonal"
              icon="account-group"
              onPress={() => router.push(`/circle-profile/${circleId}/members`)}
              style={{ borderRadius: 10 }}
              labelStyle={{ fontSize: 13 }}
            >
              Members
            </Button>

            <Button
              mode="contained"
              icon="pencil"
              onPress={() => router.push(`/circle-profile/${circleId}/edit`)}
              style={{ borderRadius: 10 }}
              labelStyle={{ fontSize: 13 }}
            >
              Edit Circle
            </Button>

            <Button
              mode="contained-tonal"
              icon="account-plus"
              onPress={() => router.push(`/circle-profile/${circleId}/add-friend`)}
              style={{ borderRadius: 10 }}
              labelStyle={{ fontSize: 13 }}
            >
              Add Friend
            </Button>

            <Button
              mode="outlined"
              icon="exit-to-app"
              onPress={handleLeaveCircle}
              style={{
                borderRadius: 10,
                borderColor:  theme.colors.error,
              }}
              labelStyle={{ fontSize: 13, color: theme.colors.error }}
            >
              Leave
            </Button>
          </View>
        </Surface>

        {/* ── Tabs ── */}
        <View
          style={{
            flexDirection:   "row",
            marginHorizontal: 20,
            marginBottom:    16,
            borderRadius:    12,
            overflow:        "hidden",
            backgroundColor: isDark ? "#0F223A" : "#e8edf5",
          }}
        >
          {(["history", "live"] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <View
                key={tab}
                style={{ flex: 1 }}
              >
                <Button
                  mode={active ? "contained" : "text"}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    borderRadius: 0,
                    margin:       0,
                  }}
                  labelStyle={{
                    color:      active ? "white" : theme.colors.onSurfaceVariant,
                    fontWeight: active ? "700" : "400",
                    fontSize:   14,
                  }}
                >
                  {tab === "history" ? "Circle History" : "Live Bets"}
                </Button>
              </View>
            );
          })}
        </View>

        {/* ── Tab content ── */}
        <Surface
          elevation={0}
          style={{
            marginHorizontal: 20,
            borderRadius:     16,
            backgroundColor:  cardBg,
            padding:          24,
            borderWidth:      1,
            borderColor:      isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
            alignItems:       "center",
          }}
        >
          <Ionicons
            name={activeTab === "history" ? "time-outline" : "flash-outline"}
            size={36}
            color={theme.colors.onSurfaceVariant}
            style={{ marginBottom: 12 }}
          />
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}
          >
            {activeTab === "history"
              ? "Circle bet history coming soon"
              : "Live bets coming soon"}
          </Text>
        </Surface>
      </ScrollView>
    </View>
  );
}
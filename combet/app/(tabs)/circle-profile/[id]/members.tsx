import React, { useEffect, useState } from "react";
import { View, FlatList } from "react-native";
import { Text, Surface } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import BackHeader from "@/components/Backheader";

export default function MembersScreen() {
  const { theme, isDark } = useAppTheme();
  const { id } = useLocalSearchParams();
  const circleId = id as string;
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`http://localhost:3001/circles/${circleId}/members`, {
        headers: { "x-session-id": sessionId || "" },
      });
      if (!res.ok) throw new Error("Failed to fetch members");
      setMembers(await res.json());
    } catch (err) {
      console.error("Error loading members:", err);
    }
  };

  const cardBg = isDark ? "#0F2A44" : "#ffffff";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BackHeader label="Circle Profile" href={`/circle-profile/${circleId}`} />

      <View style={{ flex: 1, padding: 20 }}>
        <Text variant="headlineSmall" style={{
          color: theme.colors.onSurface, fontWeight: "800",
          textAlign: "center", marginBottom: 24,
        }}>
          Members
        </Text>

        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text variant="bodyMedium" style={{
              color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40,
            }}>
              No members found
            </Text>
          }
          renderItem={({ item }) => (
            <Surface elevation={1} style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: cardBg, borderRadius: 14,
              padding: 14, marginBottom: 10,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: "rgba(46,108,246,0.15)",
                borderWidth: 1.5, borderColor: "rgba(46,108,246,0.35)",
                alignItems: "center", justifyContent: "center", marginRight: 14,
              }}>
                <Ionicons name="person" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
                  {item.username}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  @{item.username}
                </Text>
              </View>
            </Surface>
          )}
        />
      </View>
    </View>
  );
}
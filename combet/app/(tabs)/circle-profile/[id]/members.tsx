import React, { useEffect, useState } from "react";
import { View, FlatList } from "react-native";
import { Text, Surface } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import BackHeader from "@/components/Backheader";
import GradientBackground from "@/components/GradientBackground";


export default function MembersScreen() {
  const { theme, isDark } = useAppTheme();
  const { id } = useLocalSearchParams();
  const circleId = id as string;
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`http://localhost:3001/circles/${circleId}/history`, {
        headers: { "x-session-id": sessionId || "" },
      });
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch (err) {
      console.error("Error loading members:", err);
    }
  };

  const cardBg = isDark ? "#0F2A44" : "#ffffff";

  return (
      <GradientBackground style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <BackHeader label="Circle Profile" href={`/circle-profile/${circleId}`} />

      <Text style={{
          color: theme.colors.onSurface, fontSize: 24, fontWeight: "300",
          letterSpacing: 2, marginBottom: 24,
        }}>
          Members
        </Text>

        <FlatList
          data={members}
          keyExtractor={(item) => item.id ?? item.username}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text variant="bodyMedium" style={{
              color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40,
            }}>
              No members found
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.09)",
              borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
              borderRadius: 14, padding: 14, marginBottom: 10,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: "rgba(157,212,190,0.12)",
                borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
                alignItems: "center", justifyContent: "center", marginRight: 14,
              }}>
                <Ionicons name="person" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
                  {item.username}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  @{item.username}
                </Text>
              </View>
              {item.joined_at && (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.8 }}>
                  Joined {new Date(item.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              )}
            </View>
          )}
        />
      </GradientBackground>
  );
}
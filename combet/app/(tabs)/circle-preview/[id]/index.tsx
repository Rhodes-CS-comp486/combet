import React, { useState, useCallback } from "react";
import { View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import UserAvatar from "@/components/UserAvatar";
import { API_BASE } from "@/constants/api";

type Member = {
  id: string;
  username: string;
  joined_at: string;
  avatar_color?: string;
  avatar_icon?: string;
  is_creator?: boolean;
};

type Circle = {
  circle_id: string;
  name: string;
  description?: string;
  icon?: string;
  icon_color?: string;
  created_at: string;
  is_private?: boolean;
};

export default function CirclePreviewScreen() {
  const router   = useRouter();
  const { theme } = useAppTheme();
  const { id, userId }   = useLocalSearchParams();
  const circleId = Array.isArray(id) ? id[0] : id;
  const fromUserId = Array.isArray(userId) ? userId[0] : userId;

  const [circle, setCircle]   = useState<Circle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [circleId])
  );

  const fetchData = async () => {
    try {
      const [circleRes, membersRes] = await Promise.all([
        fetch(`${API_BASE}/circles/${circleId}`),
        fetch(`${API_BASE}/circles/${circleId}/members`),
      ]);
      if (circleRes.ok) setCircle(await circleRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
    } catch (err) {
      console.error("CirclePreview fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/circles/${circleId}/join`, {
        method: "POST",
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (res.ok) {
        const dest = { pathname: `/circle-profile/${circleId}`, params: { from: "preview", userId: fromUserId } } as any;
        if (typeof window !== "undefined") {
          window.alert(`You have successfully joined ${circle?.name}!`);
          router.push(dest);
        } else {
          Alert.alert(
            "Joined!",
            `You have successfully joined ${circle?.name}!`,
            [{ text: "OK", onPress: () => router.push(dest) }]
          );
        }
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert("Error", data.error || "Could not join circle");
      }
    } catch {
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setJoining(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) return (
    <GradientBackground>
      <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 80 }} />
    </GradientBackground>
  );

  if (!circle) return (
    <GradientBackground>
      <Text style={{ color: theme.colors.onSurface, textAlign: "center", marginTop: 80 }}>
        Circle not found.
      </Text>
    </GradientBackground>
  );

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Back ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => fromUserId
              ? router.replace({ pathname: `/user/${fromUserId}`, params: {} } as any)
              : router.back()
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ alignSelf: "flex-start", paddingHorizontal: 4, paddingVertical: 7 }}
          >
            <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
        </View>

        {/* ── Circle hero ── */}
        <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20 }}>
          <View style={{
            width: 90, height: 90, borderRadius: 45,
            backgroundColor: circle.icon_color ?? "#2c4a5e",
            justifyContent: "center", alignItems: "center", marginBottom: 14,
          }}>
            <Ionicons name={(circle.icon as any) ?? "people"} size={44} color="#fff" />
          </View>

          <Text style={{ color: theme.colors.onSurface, fontSize: 22, fontWeight: "600", marginBottom: 6 }}>
            {circle.name}
          </Text>

          {/* Public badge */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            backgroundColor: "rgba(255,255,255,0.07)",
            borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10,
          }}>
            <Ionicons name="globe-outline" size={11} color={theme.colors.onSurfaceVariant} />
            <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>Public</Text>
          </View>

          {circle.description ? (
            <Text style={{
              color: theme.colors.onSurfaceVariant, textAlign: "center",
              paddingHorizontal: 30, marginBottom: 16, fontSize: 13,
            }}>
              {circle.description}
            </Text>
          ) : null}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16, opacity: 0.6 }}>
            <Ionicons name="flag-outline" size={13} color={theme.colors.onSurfaceVariant} />
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
              Created {circle.created_at ? formatDate(circle.created_at) : ""}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleJoin}
            disabled={joining}
            style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: theme.colors.primary,
              borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
              opacity: joining ? 0.6 : 1, marginBottom: 20,
            }}
          >
            {joining
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="person-add" size={14} color="#fff" />
            }
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Join</Text>
          </TouchableOpacity>
        </View>

        {/* ── Members preview ── */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{
            color: theme.colors.onSurfaceVariant, fontSize: 11,
            fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12,
          }}>
            Members · {members.length}
          </Text>
          {members.map((member) => (
            <View key={member.id} style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.07)",
              borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
              borderRadius: 14, padding: 12, marginBottom: 8,
            }}>
              <UserAvatar
                user={{ username: member.username, avatar_color: member.avatar_color, avatar_icon: member.avatar_icon }}
                size={38}
              />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: theme.colors.onSurface, fontWeight: "600", fontSize: 14 }}>
                    {member.username}
                  </Text>
                  {member.is_creator && (
                    <View style={{
                      backgroundColor: "rgba(157,212,190,0.18)", borderRadius: 6,
                      paddingHorizontal: 7, paddingVertical: 2,
                      borderWidth: 1, borderColor: "rgba(157,212,190,0.35)",
                    }}>
                      <Text style={{ color: "#9dd4be", fontSize: 11, fontWeight: "600" }}>Creator</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                  @{member.username}
                </Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </GradientBackground>
  );
}
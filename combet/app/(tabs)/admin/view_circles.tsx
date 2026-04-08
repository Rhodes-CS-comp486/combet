import React, { useCallback, useState } from "react";
import { View, FlatList, TouchableOpacity, Modal, Pressable } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import { API_BASE } from "@/constants/api";

type AdminCircle = {
  circle_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  icon_color: string;
  circle_color: string;
  is_private: boolean;
  created_at: string;
  creator_username: string;
  member_count: number;
};

export default function AdminCirclesScreen() {
  const { theme } = useAppTheme();
  const [circles, setCircles]           = useState<AdminCircle[]>([]);
  const [loading, setLoading]           = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AdminCircle | null>(null);
  const [deleting, setDeleting]         = useState(false);

  useFocusEffect(useCallback(() => {
    void loadCircles();
  }, []));

  const loadCircles = async () => {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/admin/circles`, {
        headers: { "x-session-id": sessionId || "" },
      });
      if (res.ok) setCircles(await res.json());
    } catch (err) {
      console.error("Error loading circles:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteCircle = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/admin/circles/${deleteTarget.circle_id}`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId || "" },
      });
      if (res.ok) {
        setCircles((prev) => prev.filter((c) => c.circle_id !== deleteTarget.circle_id));
      }
    } catch (err) {
      console.error("Delete circle error:", err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const renderCircle = ({ item }: { item: AdminCircle }) => (
    <View style={{
      flexDirection: "row", alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.09)",
      borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
      borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
    }}>
      {/* ── Circle icon ── */}
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: item.circle_color ?? "#2c4a5e",
        justifyContent: "center", alignItems: "center",
      }}>
        <Ionicons
          name={(item.icon as any) ?? "people"}
          size={22}
          color={item.icon_color ?? "#fff"}
        />
      </View>

      {/* ── Info ── */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: 15 }}>
            {item.name}
          </Text>
          {item.is_private && (
            <View style={{
              backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 6,
              paddingHorizontal: 7, paddingVertical: 2,
              borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
            }}>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "600" }}>PRIVATE</Text>
            </View>
          )}
        </View>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          @{item.creator_username}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <Ionicons name="people-outline" size={11} color={theme.colors.onSurfaceVariant} />
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
            {item.member_count} members
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>·</Text>
          <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
            {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </Text>
        </View>
        {item.description ? (
          <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 3 }} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </View>

      {/* ── Delete button ── */}
      <TouchableOpacity
        onPress={() => setDeleteTarget(item)}
        style={{
          width: 32, height: 32, borderRadius: 8,
          backgroundColor: "rgba(232,112,96,0.12)",
          borderWidth: 1, borderColor: "rgba(232,112,96,0.3)",
          justifyContent: "center", alignItems: "center",
        }}
      >
        <Ionicons name="trash-outline" size={16} color="#e87060" />
      </TouchableOpacity>
    </View>
  );

  return (
    <GradientBackground style={{ paddingHorizontal: 20, paddingTop: 12 }}>
      {/* ── Header ── */}
      <TouchableOpacity
        onPress={() => router.replace("/(tabs)/profile")}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}
      >
        <Ionicons name="arrow-back" size={20} color={theme.colors.onSurfaceVariant} />
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}>Profile</Text>
      </TouchableOpacity>

      <Text style={{
        color: theme.colors.onSurface, fontSize: 24, fontWeight: "300",
        letterSpacing: 2, marginBottom: 4,
      }}>
        All Circles
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, marginBottom: 20 }}>
        {circles.length} total
      </Text>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={circles}
          keyExtractor={(item) => item.circle_id}
          renderItem={renderCircle}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40 }}>
              No circles found
            </Text>
          }
        />
      )}
      {/* ── Delete Confirmation Modal ── */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(10,20,30,0.85)", justifyContent: "center", alignItems: "center", padding: 32 }}
          onPress={() => !deleting && setDeleteTarget(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: "#1f3347",
              borderRadius: 20, padding: 24,
              borderWidth: 1, borderColor: "rgba(232,112,96,0.3)",
              width: 300,
            }}>
              <View style={{ alignItems: "center", marginBottom: 16 }}>
                <View style={{
                  width: 52, height: 52, borderRadius: 26,
                  backgroundColor: "rgba(232,112,96,0.12)",
                  borderWidth: 1, borderColor: "rgba(232,112,96,0.3)",
                  justifyContent: "center", alignItems: "center", marginBottom: 12,
                }}>
                  <Ionicons name="trash-outline" size={24} color="#e87060" />
                </View>
                <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "center" }}>
                  Delete Circle
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 18 }}>
                  Are you sure you want to delete{"\n"}
                  <Text style={{ color: "#fff", fontWeight: "600" }}>"{deleteTarget?.name}"</Text>?
                  {"\n"}This will remove all members, messages,{"\n"}and invites. This cannot be undone.
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setDeleteTarget(null)}
                  disabled={deleting}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={deleteCircle}
                  disabled={deleting}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12,
                    backgroundColor: "rgba(232,112,96,0.2)",
                    borderWidth: 1, borderColor: "rgba(232,112,96,0.5)",
                    alignItems: "center",
                  }}
                >
                  {deleting
                    ? <ActivityIndicator size="small" color="#e87060" />
                    : <Text style={{ color: "#e87060", fontWeight: "700" }}>Delete</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </GradientBackground>
  );
}
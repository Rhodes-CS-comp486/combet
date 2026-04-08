import React, { useCallback, useState } from "react";
import { View, FlatList, TouchableOpacity, Modal, Pressable } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import UserAvatar from "@/components/UserAvatar";
import { API_BASE } from "@/constants/api";

type AdminBet = {
  id: string;
  title: string;
  description: string;
  status: string;
  stake_amount: number;
  custom_stake: string | null;
  created_at: string;
  closes_at: string | null;
  creator_username: string;
  creator_avatar_color: string;
  creator_avatar_icon: string;
  response_count: number;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:          "#9dd4be",
  CLOSED:           "#f0a050",
  PENDING_APPROVAL: "#f0a050",
  DISPUTED:         "#e87060",
  SETTLED:          "rgba(255,255,255,0.35)",
  CANCELLED:        "rgba(255,255,255,0.25)",
};

export default function AdminBetsScreen() {
  const { theme } = useAppTheme();
  const [bets, setBets]             = useState<AdminBet[]>([]);
  const [loading, setLoading]       = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AdminBet | null>(null);
  const [deleting, setDeleting]     = useState(false);

  useFocusEffect(useCallback(() => {
    void loadBets();
  }, []));

  const loadBets = async () => {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/admin/bets`, {
        headers: { "x-session-id": sessionId || "" },
      });
      if (res.ok) setBets(await res.json());
    } catch (err) {
      console.error("Error loading bets:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteBet = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/admin/bets/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId || "" },
      });
      if (res.ok) {
        setBets((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      }
    } catch (err) {
      console.error("Delete bet error:", err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const renderBet = ({ item }: { item: AdminBet }) => (
    <View style={{
      backgroundColor: "rgba(255,255,255,0.09)",
      borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
      borderRadius: 14, padding: 14, marginBottom: 10, gap: 8,
    }}>
      {/* ── Title row ── */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: 14, flex: 1 }}>
          {item.title}
        </Text>
        <View style={{
          borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
          backgroundColor: "rgba(255,255,255,0.07)",
          borderWidth: 1, borderColor: STATUS_COLORS[item.status] ?? "rgba(255,255,255,0.2)",
        }}>
          <Text style={{ color: STATUS_COLORS[item.status] ?? "#fff", fontSize: 10, fontWeight: "700" }}>
            {item.status}
          </Text>
        </View>
      </View>

      {/* ── Creator + stats row ── */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <UserAvatar
          user={{ username: item.creator_username, avatar_color: item.creator_avatar_color, avatar_icon: item.creator_avatar_icon }}
          size={22}
        />
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          @{item.creator_username}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>·</Text>
        <Ionicons name="people-outline" size={12} color={theme.colors.onSurfaceVariant} />
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          {item.response_count} joined
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>·</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          {item.custom_stake ?? `${item.stake_amount} coins`}
        </Text>
      </View>

      {/* ── Date + delete row ── */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
          Created {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          {item.closes_at ? `  ·  Closes ${new Date(item.closes_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
        </Text>
        <TouchableOpacity
          onPress={() => setDeleteTarget(item)}
          style={{
            width: 30, height: 30, borderRadius: 8,
            backgroundColor: "rgba(232,112,96,0.12)",
            borderWidth: 1, borderColor: "rgba(232,112,96,0.3)",
            justifyContent: "center", alignItems: "center",
          }}
        >
          <Ionicons name="trash-outline" size={14} color="#e87060" />
        </TouchableOpacity>
      </View>
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
        All Bets
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, marginBottom: 20 }}>
        {bets.length} total
      </Text>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bets}
          keyExtractor={(item) => item.id}
          renderItem={renderBet}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40 }}>
              No bets found
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
                  Delete Bet
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 18 }}>
                  Are you sure you want to delete{"\n"}
                  <Text style={{ color: "#fff", fontWeight: "600" }}>"{deleteTarget?.title}"</Text>?
                  {"\n"}This action cannot be undone.
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
                  onPress={deleteBet}
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
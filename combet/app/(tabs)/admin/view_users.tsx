import React, { useCallback, useState } from "react";
import { View, FlatList, Switch, TouchableOpacity, Modal, Pressable } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import UserAvatar from "@/components/UserAvatar";
import { API_BASE } from "@/constants/api";
import { useRouter } from "expo-router";
import PageHeader from "@/components/PageHeader";

type AdminUser = {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  avatar_color: string;
  avatar_icon: string;
  is_admin: boolean;
  coins: number;
};

export default function AdminUsersScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(useCallback(() => {
    void loadUsers();
  }, []));

  const loadUsers = async () => {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { "x-session-id": sessionId || "" },
      });
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId: string, currentValue: boolean) => {
    setToggling(userId);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/admin/users/${userId}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId || "" },
        body: JSON.stringify({ is_admin: !currentValue }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_admin: !currentValue } : u));
      }
    } catch (err) {
      console.error("Toggle admin error:", err);
    } finally {
      setToggling(null);
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "x-session-id": sessionId || "" },
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      }
    } catch (err) {
      console.error("Delete user error:", err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const renderUser = ({ item }: { item: AdminUser }) => (
    <View style={{
      flexDirection: "row", alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.09)",
      borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
      borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
    }}>
      <UserAvatar
        user={{ username: item.username, avatar_color: item.avatar_color, avatar_icon: item.avatar_icon }}
        size={44}
      />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: theme.colors.onSurface, fontWeight: "700", fontSize: 15 }}>{item.username}</Text>
          {item.is_admin && (
            <View style={{
              backgroundColor: "rgba(157,212,190,0.18)", borderRadius: 6,
              paddingHorizontal: 7, paddingVertical: 2,
              borderWidth: 1, borderColor: "rgba(157,212,190,0.35)",
            }}>
              <Text style={{ color: "#9dd4be", fontSize: 11, fontWeight: "600" }}>Admin</Text>
            </View>
          )}
        </View>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>{item.email}</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginTop: 2 }}>
          Joined {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </Text>
      </View>
      {toggling === item.id ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <View style={{ alignItems: "center", gap: 3 }}>
          <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.5, color: item.is_admin ? "#9dd4be" : "rgba(255,255,255,0.35)" }}>
            {item.is_admin ? "ADMIN" : "USER"}
          </Text>
          <Switch
            value={item.is_admin}
            onValueChange={() => toggleAdmin(item.id, item.is_admin)}
            trackColor={{ false: "rgba(255,255,255,0.15)", true: "rgba(157,212,190,0.5)" }}
            thumbColor={item.is_admin ? "#9dd4be" : "#fff"}
          />
        </View>
      )}
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
    <GradientBackground style={{ paddingHorizontal: 20 }}>
      <PageHeader title="All Users" subtitle={`${users.length} total`} onBack={() => router.push("/(tabs)/profile")} />

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40 }}>
              No users found
            </Text>
          }
        />
      )}

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(10,20,30,0.85)", justifyContent: "center", alignItems: "center", padding: 32 }}
          onPress={() => !deleting && setDeleteTarget(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: "#1f3347", borderRadius: 20, padding: 24,
              borderWidth: 1, borderColor: "rgba(232,112,96,0.3)", width: 300,
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
                <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "center" }}>Delete User</Text>
                <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 18 }}>
                  Are you sure you want to delete{" "}
                  <Text style={{ color: "#fff", fontWeight: "600" }}>@{deleteTarget?.username}</Text>?
                  {"\n"}This action cannot be undone.
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setDeleteTarget(null)} disabled={deleting}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center" }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={deleteUser} disabled={deleting}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(232,112,96,0.2)", borderWidth: 1, borderColor: "rgba(232,112,96,0.5)", alignItems: "center" }}
                >
                  {deleting ? <ActivityIndicator size="small" color="#e87060" /> : <Text style={{ color: "#e87060", fontWeight: "700" }}>Delete</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </GradientBackground>
  );
}
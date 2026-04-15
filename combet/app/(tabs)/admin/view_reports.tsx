import React, { useCallback, useState } from "react";
import { View, FlatList, TouchableOpacity, Modal, Pressable } from "react-native";
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

type AdminReport = {
  id: string;
  target_type: "bet" | "user" | "circle";  target_id: string;
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  reporter_username: string;
  reporter_avatar_color: string;
  reporter_avatar_icon: string;
  target_label: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending:   "#f0c070",
  resolved:  "#9dd4be",
  dismissed: "rgba(255,255,255,0.25)",
};

export default function AdminReportsScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [reports, setReports]           = useState<AdminReport[]>([]);
  const [loading, setLoading]           = useState(true);
  const [actioning, setActioning]       = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "resolved" | "dismissed">("pending");
  const [detailTarget, setDetailTarget] = useState<AdminReport | null>(null);

  useFocusEffect(useCallback(() => {
    void loadReports();
  }, []));

  const loadReports = async () => {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/admin/reports`, {
        headers: { "x-session-id": sessionId || "" },
      });
      if (res.ok) setReports(await res.json());
    } catch (err) {
      console.error("Error loading reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (reportId: string, status: "resolved" | "dismissed") => {
    setActioning(reportId);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId || "" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => r.id === reportId ? { ...r, status } : r)
        );
        setDetailTarget(null);
      }
    } catch (err) {
      console.error("Update report status error:", err);
    } finally {
      setActioning(null);
    }
  };

  const deleteContent = async () => {
    if (!detailTarget) return;
    setActioning(detailTarget.id);
    try {
      const sessionId = await getSessionId();
      const endpoint = detailTarget.target_type === "bet"
  ? `${API_BASE}/admin/bets/${detailTarget.target_id}`
  : detailTarget.target_type === "circle"
  ? `${API_BASE}/admin/circles/${detailTarget.target_id}`
  : `${API_BASE}/admin/users/${detailTarget.target_id}`;

      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "x-session-id": sessionId || "" },
      });
      if (res.ok) {
        await fetch(`${API_BASE}/admin/reports/${detailTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-session-id": sessionId || "" },
          body: JSON.stringify({ status: "resolved" }),
        });
        setReports((prev) => prev.map((r) =>
          r.id === detailTarget.id ? { ...r, status: "resolved" } : r
        ));
        setDetailTarget(null);
      }
    } catch (err) {
      console.error("Delete content error:", err);
    } finally {
      setActioning(null);
    }
  };

  const filtered = reports.filter((r) =>
    filterStatus === "all" ? true : r.status === filterStatus
  );

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  const renderReport = ({ item }: { item: AdminReport }) => (
    <TouchableOpacity
      onPress={() => setDetailTarget(item)}
      activeOpacity={0.75}
      style={{
        backgroundColor: "rgba(255,255,255,0.09)",
        borderWidth: 1,
        borderColor: item.status === "pending"
          ? "rgba(240,192,112,0.2)"
          : "rgba(255,255,255,0.13)",
        borderRadius: 14, padding: 14, marginBottom: 10, gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <UserAvatar
            user={{
              username: item.reporter_username,
              avatar_color: item.reporter_avatar_color,
              avatar_icon: item.reporter_avatar_icon,
            }}
            size={24}
          />
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
            @{item.reporter_username}
          </Text>
        </View>
        <View style={{
          borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
          backgroundColor: "rgba(255,255,255,0.07)",
          borderWidth: 1, borderColor: STATUS_COLORS[item.status] ?? "rgba(255,255,255,0.2)",
        }}>
          <Text style={{ color: STATUS_COLORS[item.status] ?? "#fff", fontSize: 10, fontWeight: "700" }}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 4,
          backgroundColor: item.target_type === "bet"
            ? "rgba(123,143,196,0.12)"
            : "rgba(157,212,190,0.12)",
          borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
          borderWidth: 1,
          borderColor: item.target_type === "bet"
            ? "rgba(123,143,196,0.25)"
            : "rgba(157,212,190,0.25)",
        }}>
          <Ionicons
            name={item.target_type === "bet" ? "trophy-outline" : "person-outline"}
            size={10}
            color={item.target_type === "bet" ? "#7b8fc4" : "#9dd4be"}
          />
          <Text style={{
            color: item.target_type === "bet" ? "#7b8fc4" : "#9dd4be",
            fontSize: 10, fontWeight: "700",
          }}>
            {item.target_type.toUpperCase()}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={{ color: theme.colors.onSurface, fontSize: 13, fontWeight: "600", flex: 1 }}
        >
          {item.target_label ?? item.target_id}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{item.reason}</Text>
        <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
          {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <GradientBackground style={{ paddingHorizontal: 20 }}>
      <PageHeader
        title="Reports"
        subtitle={pendingCount > 0 ? `${pendingCount} pending` : `${reports.length} total`}
        onBack={() => router.push("/(tabs)/profile")}
      />

      <View style={{ flexDirection: "row", marginBottom: 16, gap: 8 }}>
        {(["pending", "all", "resolved", "dismissed"] as const).map((s) => {
          const active = filterStatus === s;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setFilterStatus(s)}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                backgroundColor: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
              }}
            >
              <Text style={{
                color: active ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                fontSize: 12, fontWeight: active ? "600" : "400",
                textTransform: "capitalize",
              }}>
                {s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 40 }}>
              {filterStatus === "pending" ? "No pending reports" : "No reports found"}
            </Text>
          }
        />
      )}

      <Modal
        visible={!!detailTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailTarget(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(10,20,30,0.85)", justifyContent: "center", alignItems: "center", padding: 32 }}
          onPress={() => !actioning && setDetailTarget(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: "#1f3347", borderRadius: 20, padding: 24,
              borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", width: 320, gap: 14,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: "rgba(232,112,96,0.12)",
                  borderWidth: 1, borderColor: "rgba(232,112,96,0.3)",
                  justifyContent: "center", alignItems: "center",
                }}>
                  <Ionicons name="flag-outline" size={20} color="#e87060" />
                </View>
                <View>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Report Detail</Text>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                    {detailTarget?.created_at
                      ? new Date(detailTarget.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : ""}
                  </Text>
                </View>
              </View>

              {[
                { label: "Reported by", value: `@${detailTarget?.reporter_username}` },
                { label: "Type",        value: detailTarget?.target_type },
                { label: "Target",      value: detailTarget?.target_label ?? detailTarget?.target_id },
                { label: "Reason",      value: detailTarget?.reason },
                { label: "Status",      value: detailTarget?.status },
              ].map(({ label, value }) => (
                <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{label}</Text>
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500", maxWidth: 180, textAlign: "right" }}>
                    {value}
                  </Text>
                </View>
              ))}

              {detailTarget?.status === "pending" && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    onPress={deleteContent}
                    disabled={!!actioning}
                    style={{
                      paddingVertical: 12, borderRadius: 12,
                      backgroundColor: "rgba(232,112,96,0.12)",
                      borderWidth: 1, borderColor: "rgba(232,112,96,0.35)",
                      alignItems: "center",
                    }}
                  >
                    {actioning === detailTarget?.id ? (
                      <ActivityIndicator size="small" color="#e87060" />
                    ) : (
                      <Text style={{ color: "#e87060", fontWeight: "700" }}>
                          Delete {detailTarget?.target_type === "bet" ? "Bet" : detailTarget?.target_type === "circle" ? "Circle" : "User"}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => detailTarget && updateStatus(detailTarget.id, "dismissed")}
                      disabled={!!actioning}
                      style={{
                        flex: 1, paddingVertical: 12, borderRadius: 12,
                        backgroundColor: "rgba(255,255,255,0.07)",
                        borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>Dismiss</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => detailTarget && updateStatus(detailTarget.id, "resolved")}
                      disabled={!!actioning}
                      style={{
                        flex: 1, paddingVertical: 12, borderRadius: 12,
                        backgroundColor: "rgba(157,212,190,0.12)",
                        borderWidth: 1, borderColor: "rgba(157,212,190,0.3)",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#9dd4be", fontWeight: "700" }}>Resolve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {detailTarget?.status !== "pending" && (
                <TouchableOpacity
                  onPress={() => setDetailTarget(null)}
                  style={{
                    paddingVertical: 12, borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.07)",
                    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
                    alignItems: "center", marginTop: 4,
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </GradientBackground>
  );
}
import React, { useState, useCallback, useRef } from "react";
import {
  View, ScrollView, Alert, TouchableOpacity,
  DeviceEventEmitter, Animated, Pressable, StyleSheet,
} from "react-native";
import { Text, Button, Portal, Modal } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import GradientBackground from "@/components/GradientBackground";
import PageHeader from "@/components/PageHeader";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import BetCard from "@/components/BetCard";
import { API_BASE } from "@/constants/api";
import ReportModal from "@/components/ReportModal";

const DRAWER_WIDTH = 260;

const menuItems = [
  { icon: "people-outline",     label: "Members",     danger: false },
  { icon: "create-outline",     label: "Edit Circle", danger: false },
  { icon: "person-add-outline", label: "Add Friends", danger: false },
  { icon: "chatbubble-outline", label: "Group Chat",  danger: false },
  { icon: "cash-outline",       label: "Coin",        danger: false },
  { icon: "flag-outline",       label: "Report",      danger: true  },
];

type Member    = { id: string; username: string; joined_at: string; avatar_color?: string; avatar_icon?: string; is_creator?: boolean; };
type BetOption = { id: string; label: string; option_text: string };
type Bet = {
  id: string; title: string; description: string; stake_amount: number;
  closes_at: string | null; created_at: string; status: string;
  creator_username: string; my_response: "accepted" | "declined" | null;
  my_selected_option_id: string | null; options: BetOption[];
  is_creator?: boolean;
};
type Circle = {
  circle_id: string; name: string; description?: string; icon?: string;
  icon_color?: string; created_at: string; is_private?: boolean; is_creator?: boolean;
  coin_name?: string; coin_symbol?: string; coin_color?: string; coin_icon?: string;
  my_coin_balance?: number;
};
type HistoryData = { circle: Circle; members: Member[]; bets: Bet[] };

export default function CircleProfile() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { id, from, userId } = useLocalSearchParams();
  const circleId   = Array.isArray(id)     ? id[0]     : id;
  const fromUserId = Array.isArray(userId) ? userId[0] : userId;
  const fromUser   = from === "user";
  const fromPreview = from === "preview";

  const [reportVisible,  setReportVisible]  = useState(false);
  const [circle,         setCircle]         = useState<Circle | null>(null);
  const [history,        setHistory]        = useState<HistoryData | null>(null);
  const [publicMembers,  setPublicMembers]  = useState<Member[]>([]);
  const [publicBets,     setPublicBets]     = useState<Bet[]>([]);
  const [activeTab,      setActiveTab]      = useState<"new" | "open" | "history">("new");
  const [responding,     setResponding]     = useState<string | null>(null);
  const [requestCount,   setRequestCount]   = useState(0);
  const [settlingBet,    setSettlingBet]    = useState<any>(null);
  const [isMember,       setIsMember]       = useState<boolean | null>(null);

  // Drawer animation
  const drawerAnim  = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerAnim,  { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerAnim,  { toValue: DRAWER_WIDTH, duration: 260, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,            duration: 260, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  // ── All original data fetching logic unchanged ──────────────────────────────
  useFocusEffect(useCallback(() => { fetchAll(); }, [circleId]));

  const fetchAll = async () => {
    try {
      const sessionId = await getSessionId();
      const circleRes = await fetch(`${API_BASE}/circles/${circleId}`);
      if (circleRes.ok) setCircle(await circleRes.json());

      const histRes = await fetch(`${API_BASE}/circles/${circleId}/history`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData);
        setCircle(histData.circle);
        setIsMember(true);
      } else {
        setIsMember(false);
        const [membersRes, betsRes] = await Promise.all([
          fetch(`${API_BASE}/circles/${circleId}/members`),
          fetch(`${API_BASE}/circles/${circleId}/bets`, {
            headers: { "x-session-id": sessionId ?? "" },
          }),
        ]);
        if (membersRes.ok) setPublicMembers(await membersRes.json());
        if (betsRes.ok)    setPublicBets(await betsRes.json());
      }

      const reqRes = await fetch(`${API_BASE}/circles/${circleId}/requests`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (reqRes.ok) setRequestCount((await reqRes.json()).length);
    } catch (err) {
      console.error("fetchAll error:", err);
    }
  };

  const handleJoin = async () => {
    try {
      const sessionId = await getSessionId();
      const endpoint  = circle?.is_private
        ? `${API_BASE}/circles/${circleId}/request-join`
        : `${API_BASE}/circles/${circleId}/join`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (res.ok) {
        circle?.is_private ? alert("Join request sent!") : (alert(`You have successfully joined ${circle?.name}!`), fetchAll());
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not join circle");
      }
    } catch { alert("Could not connect to server"); }
  };

  const handleLeave = async () => {
    const leaveNow = async () => {
      try {
        const sessionId = await getSessionId();
        if (!sessionId) { alert("Not authenticated"); return; }
        const res = await fetch(`${API_BASE}/circles/${circleId}/leave`, {
          method: "DELETE",
          headers: { "x-session-id": sessionId },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Could not leave circle");
          return;
        }
        if (fromUserId) {
          router.replace({ pathname: `/user/${fromUserId}`, params: {} } as any);
        } else {
          router.replace("/(tabs)/circles");
        }
      } catch {
        alert("Could not connect to server");
      }
    };

    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (window.confirm("Are you sure you want to leave this circle?")) leaveNow();
    } else {
      Alert.alert(
        "Leave Circle",
        "Are you sure you want to leave this circle?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave",  style: "destructive", onPress: leaveNow },
        ]
      );
    }
  };

  const handleSettle = async (opt: any) => {
    if (!settlingBet) return;
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/bets/${settlingBet.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
        body: JSON.stringify({ winning_option_id: opt.id }),
      });
      if (res.ok) { setSettlingBet(null); fetchAll(); DeviceEventEmitter.emit("coinsUpdated"); }
    } catch (err) { console.error("Settle error:", err); }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (!circle) return null;

  // ── All original bet filtering logic unchanged ──────────────────────────────
  const allBets: Bet[] = isMember ? (history?.bets ?? []) : publicBets;
  const newBets      = allBets.filter((b) => b.my_response == null && b.status?.toUpperCase() === "PENDING");
  const openBets     = allBets.filter((b) =>
    (b.my_response === "accepted" || b.is_creator) &&
    !["SETTLED", "CANCELLED"].includes(b.status?.toUpperCase() ?? "")
  );
  const resolvedBets = allBets.filter((b) =>
    ["SETTLED", "CANCELLED"].includes(b.status?.toUpperCase() ?? "")
  );

  const members = isMember ? (history?.members ?? []) : publicMembers;

  const renderTabContent = () => {
    const emptyIcon = activeTab === "history" ? "receipt-outline" : "flash-outline";
    const emptyText = activeTab === "new" ? "No new bets right now"
      : activeTab === "open" ? "No open bets right now"
      : "No bet history yet";
    const bets = activeTab === "new" ? newBets : activeTab === "open" ? openBets : resolvedBets;

    if (bets.length === 0) return (
      <View style={styles.emptyState}>
        <Ionicons name={emptyIcon} size={36} color={theme.colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", fontSize: 14 }}>{emptyText}</Text>
      </View>
    );

    return (
      <View>
        {bets.map((bet) => (
          <BetCard
            key={bet.id}
            item={bet}
            mode={activeTab === "new" ? "feed" : "active"}
            accepting={responding}
            setAccepting={setResponding}
            onRemove={(removeId) =>
              setHistory((prev) => prev ? { ...prev, bets: prev.bets.filter((b) => b.id !== removeId) } : prev)
            }
            onRefresh={fetchAll}
            onSettle={setSettlingBet}
          />
        ))}
      </View>
    );
  };

  return (
    <GradientBackground>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Bar ── */}
        <View style={styles.topbar}>
          <TouchableOpacity
            onPress={() => {
              if ((fromUser || fromPreview) && fromUserId) {
                router.replace({ pathname: `/user/${fromUserId}`, params: {} } as any);
              } else {
                router.replace("/(tabs)/circles");
              }
            }}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>

          <View style={styles.topbarTitle}>
            <Text style={styles.topbarText}>{circle.name}</Text>
            {circle.is_private && (
              <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.4)" />
            )}
          </View>

          <TouchableOpacity style={styles.dotsBtn} onPress={openDrawer}>
            <Text style={styles.dotsText}>···</Text>
          </TouchableOpacity>
        </View>
        {/* ── Profile Card ── */}
        <View style={styles.card}>

          {/* Avatar + Stats */}
          <View style={styles.topRow}>
            <View style={[styles.avatar, { backgroundColor: circle.icon_color ?? "#2c4a5e" }]}>
              <Ionicons name={(circle.icon as any) ?? "people"} size={32} color="#fff" />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{allBets.length}</Text>
                <Text style={styles.statLbl}>Bets</Text>
              </View>
              <TouchableOpacity
                style={styles.stat}
                onPress={() => router.push(`/(tabs)/circle-profile/${circleId}/members?isPrivate=${circle.is_private ? "1" : "0"}&isCreator=${circle.is_creator ? "1" : "0"}&hasCoin=${circle.coin_name ? "1" : "0"}&coinName=${encodeURIComponent(circle.coin_name ?? "")}&coinColor=${encodeURIComponent(circle.coin_color ?? "")}&coinIcon=${encodeURIComponent(circle.coin_icon ?? "")}&coinSymbol=${encodeURIComponent(circle.coin_symbol ?? "")}`)}>
                <Text style={styles.statNum}>{members.length}</Text>
                <Text style={styles.statLbl}>Members</Text>
              </TouchableOpacity>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{openBets.length}</Text>
                <Text style={styles.statLbl}>Open</Text>
              </View>
              {circle.coin_name && (
                <View style={styles.stat}>
                  <View style={[styles.coinCircle, {
                    backgroundColor: (circle.coin_color ?? "#f0c070") + "22",
                    borderColor: (circle.coin_color ?? "#f0c070") + "66",
                  }]}>
                    <Ionicons name={(circle.coin_icon ?? "star") as any} size={14} color={circle.coin_color ?? "#f0c070"} />
                    <Text style={[styles.coinCircleNum, { color: circle.coin_color ?? "#f0c070" }]}>
                      {circle.my_coin_balance ?? 0}
                    </Text>
                  </View>
                  <Text style={styles.statLbl}> </Text>
                </View>
              )}
            </View>
          </View>

          {/* Info */}
          <Text style={styles.circleName}>{circle.name}</Text>
          {circle.description ? (
            <Text style={styles.circleDesc}>{circle.description}</Text>
          ) : null}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.3)" />
            <Text style={styles.circleDate}>  Created {formatDate(circle.created_at)}</Text>
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.btnMsg}
              onPress={() => isMember
                ? router.push(`/circle-profile/${circleId}/inbox?name=${encodeURIComponent(circle.name)}`)
                : alert("Join this circle to use Message.")
              }
            >
              <Ionicons name="chatbubble-outline" size={15} color="#fff" />
              <Text style={styles.btnMsgText}>  Message</Text>
            </TouchableOpacity>

            {isMember ? (
              <TouchableOpacity style={styles.btnLeave} onPress={handleLeave}>
                <Ionicons name="exit-outline" size={15} color="#e87070" />
                <Text style={styles.btnLeaveText}>  Leave</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.btnJoin} onPress={handleJoin}>
                <Ionicons name="person-add" size={15} color="#fff" />
                <Text style={styles.btnJoinText}>  {circle.is_private ? "Request" : "Join"}</Text>
              </TouchableOpacity>
            )}
          </View>


        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabBar}>
          {(["new", "open", "history"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab Content ── */}
        <View style={{ paddingTop: 8 }}>
          {renderTabContent()}
        </View>

      </ScrollView>

      {/* ── Drawer Overlay ── */}
      {drawerOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        </Animated.View>
      )}

      {/* ── Slide-in Drawer ── */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}
        pointerEvents={drawerOpen ? "auto" : "none"}
      >
        <View style={styles.drawerHeader}>
          <TouchableOpacity style={styles.drawerClose} onPress={closeDrawer}>
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {menuItems.map((item) => {
          if (item.label === "Report" && circle.is_creator) return null;
          if (item.label === "Coin" && !circle.is_creator) return null;
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.drawerItem}
              onPress={() => {
                closeDrawer();
                if (item.label === "Members")    router.push(`/(tabs)/circle-profile/${circleId}/members?isPrivate=${circle.is_private ? "1" : "0"}&isCreator=${circle.is_creator ? "1" : "0"}&hasCoin=${circle.coin_name ? "1" : "0"}&coinName=${encodeURIComponent(circle.coin_name ?? "")}&coinColor=${encodeURIComponent(circle.coin_color ?? "")}&coinIcon=${encodeURIComponent(circle.coin_icon ?? "")}&coinSymbol=${encodeURIComponent(circle.coin_symbol ?? "")}`);
                else if (item.label === "Edit Circle")  router.push(`/(tabs)/circle-profile/${circleId}/edit`);
                else if (item.label === "Add Friends")  router.push(`/(tabs)/circle-profile/${circleId}/add-friend`);
                else if (item.label === "Group Chat")   router.push(`/(tabs)/circle-profile/${circleId}/inbox?name=${encodeURIComponent(circle.name)}`);
                else if (item.label === "Coin")         router.push(`/circle-profile/${circleId}/coin`);
                else if (item.label === "Report")       setReportVisible(true);
              }}
            >
              <View style={[styles.drawerIcon, item.danger && styles.drawerIconDanger]}>
                <Ionicons name={item.icon as any} size={16} color={item.danger ? "#e87070" : "#fff"} />
              </View>
              <Text style={[styles.drawerLabel, item.danger && styles.drawerLabelDanger]}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* ── Settle Modal (unchanged) ── */}
      <Portal>
        <Modal
          visible={!!settlingBet}
          onDismiss={() => setSettlingBet(null)}
          contentContainerStyle={{
            margin: 24, borderRadius: 20, padding: 24,
            backgroundColor: "#1f3347",
            borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
          }}
          style={{ backgroundColor: "rgba(10,20,30,0.85)" }}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "700", marginBottom: 4 }}>
            Declare Winner
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16, fontSize: 13 }}>
            {settlingBet?.title}
          </Text>
          {(settlingBet?.options ?? []).map((opt: any) => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => handleSettle(opt)}
              style={{ padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: "rgba(157,212,190,0.07)", borderWidth: 1, borderColor: "rgba(157,212,190,0.2)" }}
            >
              <Text style={{ color: theme.colors.onSurface, fontWeight: "500", fontSize: 14 }}>
                {opt.label}. {opt.option_text ?? opt.text}
              </Text>
            </TouchableOpacity>
          ))}
          <Button onPress={() => setSettlingBet(null)} textColor={theme.colors.onSurfaceVariant} style={{ marginTop: 4 }}>
            Cancel
          </Button>
        </Modal>
      </Portal>

      <ReportModal
        visible={reportVisible}
        onDismiss={() => setReportVisible(false)}
        targetType="circle"
        targetId={circleId}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, marginBottom: 8,
  },
  topbarTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  topbarText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  dotsBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  dotsText: { color: "#fff", fontSize: 16, letterSpacing: 1, lineHeight: 18 },

  card: { backgroundColor: "#1e2f3c", borderRadius: 18, padding: 16, marginBottom: 12 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 16 },
  avatar: { width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center" },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center" },
  statNum: { color: "#fff", fontSize: 22, fontWeight: "600" },
  statLbl: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },

  circleName: { color: "#fff", fontSize: 17, fontWeight: "600", marginBottom: 4 },
  circleDesc: { color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 5 },
  dateRow: { flexDirection: "row", alignItems: "center" },
  circleDate: { color: "rgba(255,255,255,0.3)", fontSize: 12 },

  coinCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  coinCircleNum: {
    fontSize: 11, fontWeight: "700", lineHeight: 13,
  },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  btnMsg: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 12, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12,
  },
  btnMsgText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  btnLeave: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 12, backgroundColor: "rgba(200,60,60,0.12)",
    borderWidth: 1, borderColor: "rgba(200,60,60,0.35)", borderRadius: 12,
  },
  btnLeaveText: { color: "#e87070", fontSize: 14, fontWeight: "500" },
  btnJoin: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 12, backgroundColor: "#3aaa6e", borderRadius: 12,
  },
  btnJoinText: { color: "#fff", fontSize: 14, fontWeight: "500" },


  tabBar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#fff" },
  tabText: { color: "rgba(255,255,255,0.35)", fontSize: 13 },
  tabTextActive: { color: "#fff" },

  emptyState: {
    borderRadius: 16, padding: 28,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 10 },
  drawer: {
    position: "absolute", top: 0, right: 0, bottom: 0,
    width: DRAWER_WIDTH, backgroundColor: "#1e2f3c",
    borderTopLeftRadius: 18, borderBottomLeftRadius: 18, zIndex: 11,
  },
  drawerHeader: { alignItems: "flex-end", paddingTop: 14, paddingRight: 14, paddingBottom: 6 },
  drawerClose: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  drawerItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 15, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  drawerIcon: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center",
  },
  drawerIconDanger: { backgroundColor: "rgba(220,60,60,0.15)" },
  drawerLabel: { color: "#fff", fontSize: 15 },
  drawerLabelDanger: { color: "#e87070" },
});
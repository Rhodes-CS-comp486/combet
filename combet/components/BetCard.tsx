import React from "react";
import { View, TouchableOpacity, DeviceEventEmitter } from "react-native";
import { Text, Chip, Button, ProgressBar, Divider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import { DesignTokens } from "@/context/ThemeContext";
import UserAvatar from "@/components/UserAvatar";

const API_BASE = "http://localhost:3001";

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type BetCardProps = {
  item: any;
  mode: "feed" | "active";
  accepting?: string | null;
  setAccepting?: (val: string | null) => void;
  onRemove?: (id: string) => void;
  onRefresh?: () => void;
  onSettle?: (item: any) => void;
};

export default function BetCard({
  item,
  mode,
  accepting,
  setAccepting,
  onRemove,
  onRefresh,
  onSettle,
}: BetCardProps) {
  const { theme, isDark } = useAppTheme();

  const options = item.options ?? [];
  const totalJoined = Number(item.total_joined ?? 0);
  const stake = item.stake_amount ?? 0;
  const pot = stake * totalJoined;
  const isCreator = item.is_creator;
  const isClosed = item.status === "CLOSED";

  return (
    <View style={{
      borderRadius: 20, marginBottom: 14, overflow: "hidden",
      backgroundColor: "rgba(255,255,255,0.09)",
      borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
    }}>

        {/* ── HEADER ── */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 5, marginTop: 5 }}>
            {mode === "feed" ? (
              item.target_type === "circle" ? (
                <View style={{
                  width: 60, height: 60, borderRadius: 30,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name={(item.icon as any) || "people"} size={26} color={theme.colors.primary} />
                </View>
              ) : (
                <UserAvatar
                  user={{
                    display_name: item.creator_name || item.creator_username,
                    username: item.creator_username,
                    avatar_color: item.creator_avatar_color,
                    avatar_icon: item.creator_avatar_icon,
                  }}
                  size={60}
                />
              )
            ) : (
              <View style={{
                width: 60, height: 60, borderRadius: 30,
                backgroundColor: "rgba(157,212,190,0.15)",
                borderWidth: 1, borderColor: "rgba(157,212,190,0.25)",
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name={(item.icon as any) || "people"} size={26} color={theme.colors.primary} />
              </View>
            )}

            <View style={{ flex: 1, marginTop: 6 }}>
              <Text style={{ fontSize: 20, fontWeight: "600", color: theme.colors.onSurface, lineHeight: 22 }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {mode === "feed"
                  ? `${item.creator_name || item.creator_username} · ${item.target_name}`
                  : item.target_name}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <View style={{
                backgroundColor: item.custom_stake ? "rgba(99,102,241,0.1)" : "rgba(240,192,112,0.12)",
                borderColor: item.custom_stake ? "rgba(99,102,241,0.25)" : "rgba(240,192,112,0.2)",
                borderWidth: 1, borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 5,
              }}>
                <Text style={{ color: item.custom_stake ? "#a5b4fc" : DesignTokens.gold, fontWeight: "600", fontSize: 12 }}>
                  {item.custom_stake ?? `${stake} coins`}
                </Text>
              </View>
              {mode === "active" && (
                <View style={{
                  backgroundColor: isCreator ? "rgba(157,212,190,0.12)" : "rgba(123,143,196,0.12)",
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: isCreator ? "rgba(157,212,190,0.2)" : "rgba(123,143,196,0.2)",
                }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: isCreator ? theme.colors.primary : "#a0b0d8" }}>
                    {isCreator ? "Created" : "Joined"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>


      {/* ── STATS ── */}
      <View style={{ flexDirection: "row", paddingVertical: 10, paddingHorizontal: 16 }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "300", color: theme.colors.onSurface }}>{totalJoined}</Text>
          <Text style={{ fontSize: 9, fontWeight: "500", color: theme.colors.onSurfaceVariant, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2 }}>Joined</Text>
        </View>
        <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.07)", marginVertical: 4 }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          {item.custom_stake ? (
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#a5b4fc" }}>Custom</Text>
          ) : (
            <Text style={{ fontSize: 20, fontWeight: "300", color: DesignTokens.gold }}>{pot}</Text>
          )}
          <Text style={{ fontSize: 9, fontWeight: "500", color: theme.colors.onSurfaceVariant, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2 }}>
            {item.custom_stake ? "Stakes" : "Coin pot"}
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.07)", marginVertical: 4 }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          {mode === "active" ? (
            <View style={{
              backgroundColor: isClosed ? "rgba(239,68,68,0.1)" : "rgba(157,212,190,0.1)",
              borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
              borderWidth: 1,
              borderColor: isClosed ? "rgba(239,68,68,0.25)" : "rgba(157,212,190,0.25)",
            }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: isClosed ? "#ef4444" : theme.colors.primary }}>
                {isClosed ? "Closed" : "Open"}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 13, fontWeight: "300", color: theme.colors.onSurface }}>
              {item.closes_at ? fmtDate(item.closes_at) : "—"}
            </Text>
          )}
          <Text style={{ fontSize: 9, fontWeight: "500", color: theme.colors.onSurfaceVariant, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2 }}>
            {mode === "active" ? "Status" : "Closes"}
          </Text>
        </View>
      </View>

      <Divider style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />

      {/* ── OPTIONS ── */}
      <View style={{ padding: 12, gap: 8 }}>
        {options.map((opt: any, i: number) => {
          const count = opt.count ?? 0;
          const pct = totalJoined > 0 ? Math.round((count / totalJoined) * 100) : 0;
          const isMyOption = item.my_option_id === opt.id;
          const colors = DesignTokens.optionColors[i % DesignTokens.optionColors.length];
          const potentialWin = mode === "feed" && !item.custom_stake
            ? Math.round((pot + stake) / (count + 1)) - stake
            : null;

          return (
              <View key={opt.id} style={{
                borderRadius: 12, padding: 10,
                borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: "rgba(255,255,255,0.04)",
              }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: theme.colors.onSurface, minWidth: 40, textAlign: "center" }}>
                  {opt.text}
                </Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ height: 5, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                    <View style={{ height: "100%", width: `${pct}%`, backgroundColor: colors.bar, borderRadius: 99 }} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>{count} people</Text>
                    <Text style={{ fontSize: 11, fontWeight: "500", color: theme.colors.onSurfaceVariant }}>{pct}%</Text>
                  </View>
                </View>
                {isMyOption && <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />}

                  {mode === "feed" && !item.custom_stake && potentialWin !== null && (
                  <View style={{
                    backgroundColor: "rgba(157,212,190,0.08)",
                    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
                    borderWidth: 1, borderColor: "rgba(157,212,190,0.15)",
                  }}>
                    <Text style={{ fontSize: 11, color: theme.colors.primary }}>+{potentialWin}</Text>
                  </View>
                )}

                  {mode === "feed" && (
                  <Button
                    mode="contained"
                    compact
                    loading={accepting === `${item.id}-${opt.id}`}
                    disabled={accepting !== null}
                    onPress={async () => {
                      setAccepting?.(`${item.id}-${opt.id}`);
                      try {
                        const sessionId = await getSessionId();
                        const res = await fetch(`${API_BASE}/bets/${item.id}/accept`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
                          body: JSON.stringify({ selectedOptionId: opt.id }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          if (res.status === 400 && data.error === "Not enough coins") {
                            alert(`Not enough coins! You have ${data.coins} but this bet costs ${stake}.`);
                          }
                          return;
                        }
                        if (data.coins !== undefined) DeviceEventEmitter.emit("coinsUpdated");
                        onRemove?.(item.id);
                      } finally {
                        setAccepting?.(null);
                      }
                    }}
                    style={{ borderRadius: 8, backgroundColor: colors.btn, borderWidth: 1, borderColor: colors.btnBorder }}
                    labelStyle={{ fontWeight: "600", fontSize: 11, color: colors.btnText }}
                  >

                    Join
                  </Button>
                )}
              </View>
            );
        })}
      </View>

        {/* ── SETTLED ── */}
        {item.status === "SETTLED" && (() => {
          const winningOption = options.find((o: any) => o.id === item.winning_option_id);
          const iWon = item.my_option_id === item.winning_option_id || item.my_selected_option_id === item.winning_option_id;          const winnerCount = options.find((o: any) => o.id === item.winning_option_id)?.count ?? 1;
          const payout = stake > 0 ? Math.floor((totalJoined * stake) / winnerCount) : 0;
          return (
            <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
              <View style={{
                borderRadius: 12, padding: 12,
                backgroundColor: iWon ? "rgba(157,212,190,0.08)" : "rgba(239,68,68,0.08)",
                borderWidth: 1,
                borderColor: iWon ? "rgba(157,212,190,0.2)" : "rgba(239,68,68,0.2)",
              }}>
                <Text style={{ color: iWon ? "#9dd4be" : "#e87060", fontWeight: "600", textAlign: "center", fontSize: 14 }}>
                  {iWon ? "You won!" : "You lost"}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 4, fontSize: 12 }}>
                    {winningOption ? `Winner: ${winningOption.text ?? winningOption.option_text}` : "Result pending"}
                  {iWon && stake > 0 ? `  •  +${payout} coins` : ""}
                </Text>
              </View>
            </View>
          );
        })()}


      {/* ── ACTIONS ── */}
      {mode === "feed" && (
        <TouchableOpacity
          onPress={async () => {
            const sessionId = await getSessionId();
            await fetch(`${API_BASE}/bets/${item.id}/decline`, {
              method: "POST",
              headers: { "x-session-id": sessionId ?? "" },
            });
            onRemove?.(item.id);
          }}
          style={{ paddingVertical: 10, paddingHorizontal: 16, alignItems: "flex-end" }}
        >
            <Text style={{ fontSize: 13, color: "#e87060", fontWeight: "500" }}>  Pass</Text>
        </TouchableOpacity>
      )}

      {mode === "active" && (() => {
        const isPendingApproval = item.status === "PENDING_APPROVAL";
        const isDisputed = item.status === "DISPUTED";
        const myVote = item.my_vote;
        const approvalCount = Number(item.approval_count ?? 0);
        const totalJoinedNum = Number(item.total_joined ?? 0);
        const threshold = totalJoinedNum <= 2 ? 1 : Math.ceil(totalJoinedNum * 0.5);
        const proposedOption = options.find((o: any) => o.id === item.proposed_winner_option_id);

        if (isDisputed) return (
          <View style={{ padding: 12, paddingTop: 0 }}>
            <View style={{ borderRadius: 12, padding: 12, backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" }}>
              <Text style={{ color: "#ef4444", fontWeight: "700", textAlign: "center" }}>⚠️ Outcome Disputed</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 4, fontSize: 12 }}>
                Majority disputed this result. No payout has been made.
              </Text>
            </View>
          </View>
        );

        if (isPendingApproval) return (
          <View style={{ padding: 12, paddingTop: 0, gap: 10 }}>
            <View style={{ borderRadius: 12, padding: 12, backgroundColor: "rgba(157,212,190,0.08)", borderWidth: 1, borderColor: "rgba(157,212,190,0.2)" }}>
              <Text style={{ color: theme.colors.primary, fontWeight: "700", textAlign: "center" }}>
                 Proposed winner: {proposedOption?.text ?? "?"}
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 4, fontSize: 12 }}>
                {approvalCount}/{threshold} approvals needed
              </Text>
            </View>
            {!isCreator && (myVote === null || myVote === undefined) ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button
                  mode="contained"
                  onPress={async () => {
                    const sessionId = await getSessionId();
                    const res = await fetch(`${API_BASE}/bets/${item.id}/vote-winner`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
                      body: JSON.stringify({ approve: true }),
                    });
                    if (res.ok) { onRefresh?.(); DeviceEventEmitter.emit("coinsUpdated"); }
                  }}
                  style={{ flex: 1, borderRadius: 10, backgroundColor: "#10b981" }}
                  labelStyle={{ fontWeight: "700" }}
                >✓ Approve</Button>
                <Button
                  mode="outlined"
                  onPress={async () => {
                    const sessionId = await getSessionId();
                    const res = await fetch(`${API_BASE}/bets/${item.id}/vote-winner`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
                      body: JSON.stringify({ approve: false }),
                    });
                    if (res.ok) onRefresh?.();
                  }}
                  style={{ flex: 1, borderRadius: 10, borderColor: "rgba(239,68,68,0.4)" }}
                  labelStyle={{ color: "#ef4444", fontWeight: "700" }}
                >✕ Dispute</Button>
              </View>
            ) : !isCreator && myVote !== null && myVote !== undefined ? (
              <View style={{ borderRadius: 12, padding: 10, alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)" }}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontWeight: "600", fontSize: 13 }}>
                  You voted: {myVote ? "✓ Approved" : "✕ Disputed"}
                </Text>
              </View>
            ) : null}
          </View>
        );

        if (isCreator) return (
          <TouchableOpacity
            onPress={async () => {
              if (isClosed) {
                onSettle?.(item);
                return;
              }
              const sessionId = await getSessionId();
              const res = await fetch(`${API_BASE}/bets/${item.id}/close`, {
                method: "POST", headers: { "x-session-id": sessionId ?? "" },
              });
              if (res.ok) onRefresh?.();
            }}
            style={{ paddingVertical: 10, paddingHorizontal: 16, alignItems: "flex-end" }}
          >
            <Text style={{ fontSize: 13, color: isClosed ? theme.colors.primary : "rgba(239,68,68,0.7)", fontWeight: "500" }}>
              {isClosed ? "Declare Winner →" : "Close Bet"}
            </Text>
          </TouchableOpacity>
        );


        return null;
      })()}
    </View>
  );
}
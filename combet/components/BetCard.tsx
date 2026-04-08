import React from "react";
import { View, TouchableOpacity, DeviceEventEmitter, ActivityIndicator } from "react-native";
import { Text, Button, Divider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme, DesignTokens } from "@/context/ThemeContext";
import UserAvatar from "@/components/UserAvatar";

import { API_BASE } from "@/constants/api";

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type BetCardProps = {
  item: any;
  mode: "feed" | "active" | "profile";
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

  const options     = item.options ?? [];
  const totalJoined = Number(item.total_joined ?? 0);
  const stake       = item.stake_amount ?? 0;
  const pot         = stake * totalJoined;
  const isCreator   = item.is_creator;
  const isClosed    = ["CLOSED", "CANCELLED", "SETTLED"].includes(item.status?.toUpperCase());

  const circleIconName  = item.icon       ?? "people-outline";
  const circleIconColor = item.circle_icon_color ?? item.icon_color ?? "rgba(255,255,255,0.08)";

  // ── PROFILE (compact) mode ─────────────────────────────────────────────────
  if (mode === "profile") {
    return (
      <View style={{
        borderRadius: 14, marginBottom: 10, overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.07)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
      }}>
        <View style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
          {item.target_type === "circle" ? (
            <View style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: circleIconColor,
              alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Ionicons name={circleIconName as any} size={16} color="#fff" />
            </View>
          ) : (
            <UserAvatar
              user={{
                display_name: item.creator_name || item.creator_username,
                username:     item.creator_username,
                avatar_color: item.creator_avatar_color,
                avatar_icon:  item.creator_avatar_icon,
              }}
              size={38}
            />
          )}

          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: theme.colors.onSurface }}>
              {item.title}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {item.creator_name || item.creator_username}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <View style={{
              backgroundColor: item.custom_stake ? "rgba(99,102,241,0.1)" : "rgba(240,192,112,0.12)",
              borderColor:     item.custom_stake ? "rgba(99,102,241,0.25)" : "rgba(240,192,112,0.2)",
              borderWidth: 1, borderRadius: 20,
              paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{ color: item.custom_stake ? "#a5b4fc" : DesignTokens.gold, fontWeight: "600", fontSize: 11 }}>
                {item.custom_stake ?? `${stake} coins`}
              </Text>
            </View>
            <View style={{
              backgroundColor: isCreator ? "rgba(157,212,190,0.12)" : "rgba(123,143,196,0.12)",
              borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
              borderWidth: 1,
              borderColor: isCreator ? "rgba(157,212,190,0.2)" : "rgba(123,143,196,0.2)",
            }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: isCreator ? theme.colors.primary : "#a0b0d8" }}>
                {isCreator ? "Created" : "Joined"}
              </Text>
            </View>
          </View>
        </View>

        {options.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, paddingBottom: 12 }}>
            {options.map((opt: any, i: number) => {
              const colors     = DesignTokens.optionColors[i % DesignTokens.optionColors.length];
              const isMyOption = item.my_option_id === opt.id;
              return (
                <View key={opt.id} style={{
                  flexDirection: "row", alignItems: "center", gap: 4,
                  backgroundColor: isMyOption ? colors.btn : "rgba(255,255,255,0.05)",
                  borderWidth: 1,
                  borderColor: isMyOption ? colors.btnBorder : "rgba(255,255,255,0.08)",
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: "500", color: isMyOption ? colors.btnText : theme.colors.onSurfaceVariant }}>
                    {opt.label}. {opt.option_text ?? opt.text}
                  </Text>
                  {isMyOption && <Ionicons name="checkmark-circle" size={11} color={colors.btnText} />}
                </View>
              );
            })}
          </View>
        )}

        {item.status === "SETTLED" && (() => {
          const iWon = item.my_option_id === item.winning_option_id;
          const winningOption = options.find((o: any) => o.id === item.winning_option_id);
          return (
            <View style={{
              marginHorizontal: 12, marginBottom: 12,
              borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
              backgroundColor: iWon ? "rgba(157,212,190,0.08)" : "rgba(239,68,68,0.08)",
              borderWidth: 1,
              borderColor: iWon ? "rgba(157,212,190,0.2)" : "rgba(239,68,68,0.2)",
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            }}>
              <Text style={{ fontSize: 11, color: iWon ? "#9dd4be" : "#e87060", fontWeight: "600" }}>
                {iWon ? "You won!" : "You lost"}
              </Text>
              {winningOption && (
                <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
                  Winner: {winningOption.text ?? winningOption.option_text}
                </Text>
              )}
            </View>
          );
        })()}
      </View>
    );
  }

  // ── FEED / ACTIVE (full) mode ──────────────────────────────────────────────
  return (
    <View style={{
      borderRadius: 20, marginBottom: 14, overflow: "hidden",
      backgroundColor: "rgba(255,255,255,0.09)",
      borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
    }}>

      {/* HEADER */}
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 5, marginTop: 5 }}>

          {item.target_type === "circle" ? (
            <View style={{
              width: 60, height: 60, borderRadius: 30,
              backgroundColor: circleIconColor,
              borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name={circleIconName as any} size={26} color="#fff" />
            </View>
          ) : (
            <UserAvatar
              user={{
                display_name: item.creator_name || item.creator_username,
                username:     item.creator_username,
                avatar_color: item.creator_avatar_color,
                avatar_icon:  item.creator_avatar_icon,
              }}
              size={60}
            />
          )}

          <View style={{ flex: 1, marginTop: 6 }}>
              <Text style={{ fontSize: 22, fontWeight: "400", color: theme.colors.onSurface, lineHeight: 22 }}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {mode === "feed"
                ? `${item.creator_name || item.creator_username} - ${item.target_name}`
                : item.target_type === "user"
                  ? isCreator ? item.target_name : item.creator_username
                  : item.target_name}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 6 }}>
            {item.custom_stake ? (
              <View style={{
                backgroundColor: "rgba(99,102,241,0.1)",
                borderColor: "rgba(99,102,241,0.25)",
                borderWidth: 1, borderRadius: 20,
                paddingHorizontal: 16, paddingVertical: 8,
              }}>
                <Text style={{ color: "#a5b4fc", fontWeight: "600", fontSize: 15 }}>
                  {item.custom_stake}
                </Text>
              </View>
            ) : (
              <View style={{
                width: 62, height: 62, borderRadius: 31,
                backgroundColor: "rgba(240,192,112,0.1)",
                borderWidth: 1, borderColor: "rgba(240,192,112,0.2)",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ color: DesignTokens.gold, fontWeight: "600", fontSize: 18, lineHeight: 21 }}>
                  {stake}
                </Text>
                <Text style={{ color: "rgba(240,192,112,0.6)", fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  coins
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* STATS */}
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
          <Text style={{ fontSize: 20, fontWeight: "300", color: isClosed ? "#e87060" : theme.colors.onSurface }}>
            {mode === "active"
              ? (item.status?.toUpperCase() === "CANCELLED" ? "Cancelled"
                : item.status?.toUpperCase() === "SETTLED" ? "Settled"
                : item.status?.toUpperCase() === "CLOSED" ? "Closed"
                : item.closes_at ? fmtDate(item.closes_at) : "Open")
              : (item.closes_at ? fmtDate(item.closes_at) : "-")}
            </Text>
          <Text style={{ fontSize: 9, fontWeight: "500", color: theme.colors.onSurfaceVariant, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2 }}>
            {mode === "active" ? (isClosed ? "Status" : "Closes") : "Closes"}
          </Text>
        </View>
      </View>

      <Divider style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />

      {/* OPTIONS */}
      <View style={{ padding: 12, gap: 8 }}>
        {options.map((opt: any, i: number) => {
          const count        = opt.count ?? 0;
          const pct          = totalJoined > 0 ? Math.round((count / totalJoined) * 100) : 0;
          const isMyOption   = item.my_option_id === opt.id;
          const colors       = DesignTokens.optionColors[i % DesignTokens.optionColors.length];
          const potentialWin = mode === "feed" && !item.custom_stake
            ? Math.round((pot + stake) / (count + 1))
            : null;

          return (
            <View key={opt.id} style={{
              borderRadius: 12, padding: 10,
              borderWidth: 1, borderColor: isMyOption ? colors.btnBorder : "rgba(255,255,255,0.07)",
              flexDirection: "row", alignItems: "center", gap: 12,
              backgroundColor: isMyOption ? colors.btn : "rgba(255,255,255,0.04)",
            }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                  <Text style={{ fontSize: 16, fontWeight: "500", color: isMyOption ? colors.btnText : theme.colors.onSurface }}>
                    {opt.text ?? opt.option_text}
                  </Text>
                  {potentialWin !== null && (
                    <Text style={{ fontSize: 16, fontWeight: "500", color: colors.bar }}>
                      + {potentialWin} coins
                    </Text>
                  )}
                </View>
                <View style={{ height: 5, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginBottom: 5 }}>
                  <View style={{ height: "100%", width: `${pct}%`, backgroundColor: colors.bar, borderRadius: 99 }} />
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>{count} people</Text>
                  <Text style={{ fontSize: 11, fontWeight: "500", color: theme.colors.onSurfaceVariant }}>{pct}%</Text>
                </View>
              </View>

              {mode === "feed" && (
                <TouchableOpacity
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
                  style={{
                    width: 38, height: 38, borderRadius: 19,
                    backgroundColor: colors.btn,
                    borderWidth: 1, borderColor: colors.btnBorder,
                    alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    opacity: accepting !== null ? 0.5 : 1,
                  }}
                >
                  {accepting === `${item.id}-${opt.id}`
                    ? <ActivityIndicator size="small" color={colors.btnText} />
                    : <Ionicons name="add" size={20} color={colors.btnText} />
                  }
                </TouchableOpacity>
              )}

              {mode === "active" && (
                <View style={{
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: isMyOption ? colors.btn : "transparent",
                  borderWidth: 1, borderColor: isMyOption ? colors.btnBorder : colors.bar + "66",
                  alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Text style={{
                    fontSize: 13, fontWeight: isMyOption ? "600" : "500",
                    color: isMyOption ? colors.btnText : colors.bar + "bb",
                  }}>
                    {count}
                  </Text>
                </View>
              )}

            </View>
          );

        })}
      </View>

      {/* SETTLED */}
      {item.status === "SETTLED" && (() => {
          const winningOption = options.find((o: any) => String(o.id) === String(item.winning_option_id));
        const iWon          = item.my_option_id === item.winning_option_id || item.my_selected_option_id === item.winning_option_id;
        const winnerCount   = options.find((o: any) => o.id === item.winning_option_id)?.count ?? 1;
        const payout        = stake > 0 ? Math.floor((totalJoined * stake) / winnerCount) : 0;
        return (
          <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
              <View style={{
                borderRadius: 12, padding: 14,
                backgroundColor: iWon ? "rgba(157,212,190,0.08)" : "rgba(239,68,68,0.08)",                borderWidth: 1,
                borderColor: iWon ? "rgba(157,212,190,0.2)" : "rgba(232,112,96,0.2)",
                flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
              }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ color: iWon ? "#9dd4be" : "#e87060", fontWeight: "400", fontSize: 20 }}>
                    {iWon ? "You won!" : "You lost"}
                  </Text>
                  <Text style={{ color: iWon ? "rgba(157,212,190,0.7)" : "rgba(232,112,96,0.7)", fontSize: 14 }}>
                    {winningOption ? `Winner: ${winningOption.text ?? winningOption.option_text}` : "Result pending"}
                  </Text>
                </View>
                {stake > 0 && (
                  <View style={{
                    width: 64, height: 64, borderRadius: 32,
                    backgroundColor: iWon ? "rgba(240,192,112,0.1)" : "rgba(232,112,96,0.1)",
                    borderWidth: 1, borderColor: iWon ? "rgba(240,192,112,0.25)" : "rgba(232,112,96,0.25)",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Text style={{ color: iWon ? "#f0c070" : "#e87060", fontWeight: "400", fontSize: 18 }}>
                      {iWon ? `+${payout}` : `-${stake}`}
                    </Text>
                    <Text style={{ color: iWon ? "rgba(240,192,112,0.6)" : "rgba(232,112,96,0.6)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      coins
                    </Text>
                  </View>
                )}
              </View>
            {!isCreator && !iWon && (
              <TouchableOpacity
                onPress={async () => {
                  const sessionId = await getSessionId();
                  const res = await fetch(`${API_BASE}/bets/${item.id}/dispute`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
                  });
                  if (res.ok) onRefresh?.();
                }}
                style={{
                  alignSelf: "flex-end", marginTop: 6,
                  backgroundColor: "rgba(232,112,96,0.1)",
                  borderWidth: 1, borderColor: "rgba(232,112,96,0.25)",
                  borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: 11, color: "#e87060", fontWeight: "500" }}>Dispute result</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })()}

      {/* FEED ACTIONS */}
      {mode === "feed" && (
        <View style={{ paddingVertical: 10, paddingHorizontal: 16, alignItems: "flex-end" }}>
          <TouchableOpacity
            onPress={async () => {
              const sessionId = await getSessionId();
              await fetch(`${API_BASE}/bets/${item.id}/decline`, {
                method: "POST",
                headers: { "x-session-id": sessionId ?? "" },
              });
              onRemove?.(item.id);
            }}
            style={{
              backgroundColor: "rgba(232,112,96,0.1)",
              borderWidth: 1, borderColor: "rgba(232,112,96,0.25)",
              borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 12, color: "#e87060", fontWeight: "500" }}>Pass</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ACTIVE ACTIONS */}
      {mode === "active" && (() => {
          if (["SETTLED", "CANCELLED"].includes(item.status?.toUpperCase())) return null;
        const isDisputed      = item.status === "DISPUTED";
        const participantCount = Number(item.total_joined ?? 0);
        const tooFewToSettle  = participantCount < 2;

        if (isDisputed) return (
          <View style={{ padding: 12, paddingTop: 0 }}>
            <View style={{ borderRadius: 12, padding: 12, backgroundColor: "rgba(232,112,96,0.08)", borderWidth: 1, borderColor: "rgba(232,112,96,0.2)"  }}>
                <Text style={{ color: "#e87060", fontWeight: "700", textAlign: "center" }}>Outcome Disputed</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 4, fontSize: 12 }}>
                  This result has been disputed and is waiting on admin review
              </Text>
            </View>
          </View>
        );

        if (isCreator && tooFewToSettle && ["CLOSED"].includes(item.status?.toUpperCase())) return (
          <View style={{ paddingVertical: 10, paddingHorizontal: 16, alignItems: "flex-end" }}>
            <TouchableOpacity
              onPress={async () => {
                const sessionId = await getSessionId();
                const res = await fetch(`${API_BASE}/bets/${item.id}/cancel`, {
                  method: "POST", headers: { "x-session-id": sessionId ?? "" },
                });
                if (res.ok) { onRefresh?.(); DeviceEventEmitter.emit("coinsUpdated"); }
              }}
              style={{
                backgroundColor: "rgba(232,112,96,0.1)",
                borderWidth: 1, borderColor: "rgba(232,112,96,0.25)",
                borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: "#e87060", fontWeight: "500" }}>Cancel Bet</Text>
            </TouchableOpacity>
          </View>
        );

        if (isCreator) return (
          <View style={{ paddingVertical: 10, paddingHorizontal: 16, alignItems: "flex-end" }}>
            <TouchableOpacity
              onPress={async () => {
                if (isClosed) { onSettle?.(item); return; }
                const sessionId = await getSessionId();
                const res = await fetch(`${API_BASE}/bets/${item.id}/close`, {
                  method: "POST", headers: { "x-session-id": sessionId ?? "" },
                });
                if (res.ok) onRefresh?.();
              }}
              style={{
                backgroundColor: isClosed ? "rgba(157,212,190,0.1)" : "rgba(232,112,96,0.1)",
                borderWidth: 1, borderColor: isClosed ? "rgba(157,212,190,0.25)" : "rgba(232,112,96,0.25)",
                borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: isClosed ? theme.colors.primary : "#e87060", fontWeight: "500" }}>
                {isClosed ? "Declare Winner" : "Close Bet"}
              </Text>
            </TouchableOpacity>
          </View>
        );

        return null;
      })()}
    </View>
  );
}
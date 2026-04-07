import React, { useState, useCallback } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme, DesignTokens } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import UserAvatar from "@/components/UserAvatar";
import { getSessionId } from "@/components/sessionStore";
import { API_BASE } from "@/constants/api";
import Svg, { Path, Rect } from "react-native-svg";

type Period = "week" | "month" | "alltime";

type LeaderboardUser = {
  rank: number;
  id: string;
  display_name: string;
  avatar_color: string;
  avatar_icon: string;
  coins_won: number;
  coins_staked: number;
  wins: number;
  losses: number;
  win_streak: number;
  loss_streak: number;
  pct_change: number | null;
  most_bets: boolean;
  is_me: boolean;
};

type LeaderboardCircle = {
  circle_id: string;
  name: string;
  icon: string;
  icon_color: string;
  bet_count: number;
  member_count: number;
  coins_wagered: number;
};

type LeaderboardData = {
  period: string;
  users: LeaderboardUser[];
  circles: LeaderboardCircle[];
};

const TEAL   = "#9dd4be";
const PEACH  = "#e87060";
const GOLD   = DesignTokens.gold;
const PURPLE = "#c97ab2";
const BLUE   = "#7b8fc4";

function Card({ children, style, accent }: { children: React.ReactNode; style?: any; accent?: string }) {
  return (
    <View style={[{
      borderRadius: 16,
      backgroundColor: accent ? `${accent}0d` : "rgba(255,255,255,0.05)",
      borderWidth: 1,
      borderColor: accent ? `${accent}30` : "rgba(255,255,255,0.09)",
      padding: 16,
      overflow: "hidden",
    }, style]}>
      {children}
    </View>
  );
}

function StreakDots({ results, color }: { results: ("W" | "L")[]; color: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
      {results.map((r, i) => (
        <View key={i} style={{
          width: 22, height: 22, borderRadius: 6,
          backgroundColor: `${color}25`,
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 9, fontWeight: "700", color }}>{r}</Text>
        </View>
      ))}
    </View>
  );
}

function SpotlightCard({
  accent, label, avatarNode, name, sub, badgeStat, badgeSub, children, style,
}: {
  accent: string;
  label: string;
  avatarNode: React.ReactNode;
  name: string;
  sub: string;
  badgeStat: string;
  badgeSub?: string;
  children?: React.ReactNode;
  style?: any;
}) {
  return (
    <Card style={[{ flex: 1 }, style]} accent={accent}>
      <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1, color: accent, marginBottom: 14 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {avatarNode}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#f0f0f0" }} numberOfLines={1}>{name}</Text>
          <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{sub}</Text>
        </View>
        <View style={{
          width: 56, height: 56, borderRadius: 14,
          backgroundColor: `${accent}20`,
          borderWidth: 1.5, borderColor: `${accent}40`,
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: accent, letterSpacing: -0.5 }}>{badgeStat}</Text>
          {badgeSub && <Text style={{ fontSize: 9, color: `${accent}99`, marginTop: 1 }}>{badgeSub}</Text>}
        </View>
      </View>
      {children}
    </Card>
  );
}

export default function LeaderboardScreen() {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const [period, setPeriod]   = useState<Period>("week");
  const [data, setData]       = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const isSmall   = width < 600;
  const avSpot    = isSmall ? 42 : 48;
  const avPodium1 = isSmall ? 50 : 60;
  const avPodium2 = isSmall ? 38 : 46;
  const avPodium3 = isSmall ? 30 : 38;
  const avList    = isSmall ? 34 : 38;
  const avMe      = isSmall ? 44 : 50;

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/leaderboard?period=${p}`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (!res.ok) throw new Error("Leaderboard fetch failed");
      setData(await res.json());
    } catch (err) {
      console.error("Leaderboard error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void fetchData(period); }, [period]));

  const changePeriod = (p: Period) => { setPeriod(p); void fetchData(p); };

  const users   = data?.users   ?? [];
  const circles = data?.circles ?? [];

  const top3         = users.slice(0, 3);
  const onFire       = [...users].sort((a, b) => b.win_streak  - a.win_streak)[0];
  const losingBad    = [...users].sort((a, b) => b.loss_streak - a.loss_streak)[0];
  const biggestFall  = [...users].sort((a, b) => a.coins_won   - b.coins_won)[0];
  const mostImproved = [...users]
    .filter(u => u.pct_change !== null && u.pct_change > 0)
    .sort((a, b) => (b.pct_change ?? 0) - (a.pct_change ?? 0))[0] ?? null;
  const mostBetsUser = users.find(u => u.most_bets);
  const hotCircle    = [...circles].sort((a, b) => b.bet_count - a.bet_count)[0];
  const me           = users.find(u => u.is_me) ?? null;
  const periodLabel  = period === "week" ? "last wk" : period === "month" ? "last mo" : null;

  return (
    <GradientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 100, paddingTop: 12 }}
      >
        <Text style={{
          color: theme.colors.onSurface, fontSize: 28, fontWeight: "300",
          letterSpacing: 0.5, marginBottom: 16, marginTop: 8,
        }}>
          Leaderboard
        </Text>

        <View style={{
          flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)",
          borderRadius: 20, padding: 3, marginBottom: 16,
        }}>
          {(["week", "month", "alltime"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p} onPress={() => changePeriod(p)}
              style={{
                flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 17,
                backgroundColor: period === p ? "rgba(255,255,255,0.11)" : "transparent",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "500", color: period === p ? theme.colors.onSurface : "rgba(255,255,255,0.4)" }}>
                {p === "week" ? "This week" : p === "month" ? "This month" : "All time"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <ActivityIndicator color={TEAL} />
          </View>
        ) : users.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Ionicons name="trophy-outline" size={40} color="rgba(255,255,255,0.2)" />
            <Text style={{ color: "rgba(255,255,255,0.3)", marginTop: 12, fontSize: 14 }}>
              No data yet for this period
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>

            {/* ── Podium ── */}
            {top3.length >= 3 && (
              <Card style={{ paddingBottom: 0 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: GOLD, marginBottom: 14 }}>TOP 3</Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 6 }}>

                  <View style={{ flex: 1, alignItems: "center", gap: 5 }}>
                    <View style={{ height: 28 }} />
                    <UserAvatar user={top3[1]} size={avPodium2} />
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)" }} numberOfLines={1}>
                      {top3[1].display_name.split(" ")[0]}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: top3[1].avatar_color }}>
                      +{top3[1].coins_won}
                    </Text>
                    <View style={{
                      width: "100%", height: 40, borderRadius: 8,
                      backgroundColor: `${top3[1].avatar_color}25`,
                      borderWidth: 1, borderColor: `${top3[1].avatar_color}40`,
                      borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ fontSize: 16, fontWeight: "900", color: "rgba(255,255,255,0.5)" }}>2</Text>
                    </View>
                  </View>

                  <View style={{ flex: 1, alignItems: "center", gap: 5 }}>
                    <Svg width={28} height={20} viewBox="0 0 28 20">
                      <Path d="M2 16 L4 6 L9 11 L14 2 L19 11 L24 6 L26 16 Z" fill={GOLD} stroke={GOLD} strokeWidth={0.5} strokeLinejoin="round" />
                      <Rect x={2} y={16} width={24} height={3} rx={1.5} fill={GOLD} />
                    </Svg>
                    <UserAvatar user={top3[0]} size={avPodium1} />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }} numberOfLines={1}>
                      {top3[0].display_name.split(" ")[0]}
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: top3[0].avatar_color }}>
                      +{top3[0].coins_won}
                    </Text>
                    <View style={{
                      width: "100%", height: 56, borderRadius: 8,
                      backgroundColor: `${top3[0].avatar_color}25`,
                      borderWidth: 1, borderColor: `${top3[0].avatar_color}40`,
                      borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ fontSize: 20, fontWeight: "900", color: "rgba(255,255,255,0.5)" }}>1</Text>
                    </View>
                  </View>

                  <View style={{ flex: 1, alignItems: "center", gap: 5 }}>
                    <View style={{ height: 28 }} />
                    <UserAvatar user={top3[2]} size={avPodium3} />
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)" }} numberOfLines={1}>
                      {top3[2].display_name.split(" ")[0]}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: top3[2].avatar_color }}>
                      +{top3[2].coins_won}
                    </Text>
                    <View style={{
                      width: "100%", height: 26, borderRadius: 8,
                      backgroundColor: `${top3[2].avatar_color}25`,
                      borderWidth: 1, borderColor: `${top3[2].avatar_color}40`,
                      borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: "900", color: "rgba(255,255,255,0.5)" }}>3</Text>
                    </View>
                  </View>

                </View>
              </Card>
            )}

            {/* ── On fire + Hottest circle ── */}
              <View style={{ flexDirection: isSmall ? "column" : "row", gap: 8 }}>
              {onFire && onFire.win_streak > 0 && (
                <SpotlightCard
                  accent={TEAL} label="ON FIRE"
                  avatarNode={<UserAvatar user={onFire} size={avSpot} />}
                  name={onFire.display_name.split(" ")[0]}
                  sub="win streak"
                  badgeStat={`${onFire.win_streak}W`}
                >
                  <StreakDots results={Array(Math.min(onFire.win_streak, 7)).fill("W")} color={TEAL} />
                </SpotlightCard>
              )}
              {hotCircle && (
                <SpotlightCard
                  accent={PURPLE} label="HOTTEST CIRCLE"
                  avatarNode={
                    <View style={{
                      width: avSpot, height: avSpot, borderRadius: 12,
                      backgroundColor: hotCircle.icon_color ?? PURPLE,
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Ionicons name={(hotCircle.icon as any) ?? "people"} size={avSpot * 0.5} color="#fff" />
                    </View>
                  }
                  name={hotCircle.name}
                  sub={`${hotCircle.member_count} members`}
                  badgeStat={`${hotCircle.bet_count}`}
                  badgeSub="bets"
                />
              )}
            </View>

            {/* ── Losing streak + Most active ── */}
              <View style={{ flexDirection: isSmall ? "column" : "row", gap: 8 }}>
              {losingBad && losingBad.loss_streak > 0 && (
                <SpotlightCard
                  accent={PEACH} label="LOSING STREAK"
                  avatarNode={<UserAvatar user={losingBad} size={avSpot} />}
                  name={losingBad.display_name.split(" ")[0]}
                  sub="in a row"
                  badgeStat={`${losingBad.loss_streak}L`}
                >
                  <StreakDots results={Array(Math.min(losingBad.loss_streak, 7)).fill("L")} color={PEACH} />
                </SpotlightCard>
              )}
              {mostBetsUser && (
                <SpotlightCard
                  accent={BLUE} label="MOST ACTIVE"
                  avatarNode={<UserAvatar user={mostBetsUser} size={avSpot} />}
                  name={mostBetsUser.display_name.split(" ")[0]}
                  sub="bets this period"
                  badgeStat={`${mostBetsUser.wins + mostBetsUser.losses}`}
                />
              )}
            </View>

            {/* ── Biggest fall + Most improved ── */}
              <View style={{ flexDirection: isSmall ? "column" : "row", gap: 8 }}>
              {biggestFall && biggestFall.coins_won < 0 && (
                <SpotlightCard
                  accent={PEACH} label="BIGGEST FALL"
                  avatarNode={<UserAvatar user={biggestFall} size={avSpot} />}
                  name={biggestFall.display_name.split(" ")[0]}
                  sub="coins this period"
                  badgeStat={`${biggestFall.coins_won}`}
                />
              )}
              {mostImproved && (
                <SpotlightCard
                  accent={GOLD} label="MOST IMPROVED"
                  avatarNode={<UserAvatar user={mostImproved} size={avSpot} />}
                  name={mostImproved.display_name.split(" ")[0]}
                  sub={periodLabel ? `vs ${periodLabel}` : "all time"}
                  badgeStat={`+${mostImproved.pct_change}%`}
                />
              )}
            </View>

            {/* ── Coins ranking ── */}
            <Card>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>
                Coins won
              </Text>
              <View style={{ gap: 14 }}>
                {users.slice(0, 5).map((u, i) => {
                  const accent = i === 0 ? TEAL : i === 1 ? BLUE : i === 2 ? GOLD : "rgba(255,255,255,0.4)";
                  const maxCoins = users[0]?.coins_won ?? 1;
                  const barWidth = maxCoins > 0 ? Math.max((u.coins_won / maxCoins) * 100, 4) : 4;
                  return (
                    <View key={u.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.25)", width: 16 }}>{u.rank}</Text>
                      <UserAvatar user={u} size={avList} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                          <Text style={{ fontSize: 14, fontWeight: "600", color: theme.colors.onSurface }}>
                            {u.display_name.split(" ")[0]}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: u.coins_won >= 0 ? TEAL : PEACH }}>
                              {u.coins_won >= 0 ? "+" : ""}{u.coins_won}
                            </Text>
                            {u.pct_change !== null && periodLabel && (
                              <Text style={{ fontSize: 11, fontWeight: "500", color: u.pct_change >= 0 ? TEAL : PEACH }}>
                                {u.pct_change >= 0 ? "+" : ""}{u.pct_change}%
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={{ height: 4, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
                          <View style={{ height: "100%", borderRadius: 4, backgroundColor: accent, width: `${barWidth}%`, opacity: 0.8 }} />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* ── Circle rankings ── */}
            {circles.length > 0 && (
              <Card>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>
                  Circle rankings
                </Text>
                <View style={{ gap: 14 }}>
                  {circles.map((c, i) => (
                    <View key={c.circle_id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.25)", width: 16 }}>{i + 1}</Text>
                      <View style={{
                        width: avList, height: avList, borderRadius: avList / 2,
                        backgroundColor: c.icon_color ?? PURPLE,
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Ionicons name={(c.icon as any) ?? "people"} size={avList * 0.5} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: theme.colors.onSurface }}>{c.name}</Text>
                        <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                          {c.bet_count} bets · {c.member_count} members
                        </Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.7)" }}>
                        {c.coins_wagered.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* ── You ── */}
            {me && (
              <Card accent={TEAL}>
                <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1, color: TEAL, marginBottom: 14 }}>YOU</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <UserAvatar user={me} size={avMe} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#f0f0f0" }}>{me.display_name}</Text>
                    <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
                      {me.wins}W · {me.losses}L · {me.wins + me.losses > 0 ? Math.round((me.wins / (me.wins + me.losses)) * 100) : 0}% ratio
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: me.coins_won >= 0 ? TEAL : PEACH, marginTop: 6 }}>
                      {me.coins_won >= 0 ? "+" : ""}{me.coins_won} coins
                    </Text>
                  </View>
                  <View style={{
                    width: 56, height: 56, borderRadius: 14,
                    backgroundColor: `${TEAL}20`, borderWidth: 1.5, borderColor: `${TEAL}40`,
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Text style={{ fontSize: 18, fontWeight: "900", color: TEAL }}>#{me.rank}</Text>
                  </View>
                </View>
              </Card>
            )}

          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}
import React, { useState, useEffect } from "react";
import DateTimePickerModal from "react-native-ui-datepicker";
import dayjs from "dayjs";
import { View, ScrollView, Alert, Pressable, DeviceEventEmitter } from "react-native";
import GradientBackground from "@/components/GradientBackground";
import {
  Text,
  TextInput,
  Button,
  HelperText,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import {DesignTokens, useAppTheme} from "@/context/ThemeContext";
import { API_BASE } from "@/constants/api";
import UserAvatar from "@/components/UserAvatar";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Filter } from "bad-words";
const filter = new Filter();

export default function AddBet() {
  const { theme, isDark } = useAppTheme();

  const [postTo, setPostTo]                         = useState<"circles" | "friends">("circles");
  const [title, setTitle]                           = useState("");
  const [description, setDescription]               = useState("");
  const [options, setOptions]                       = useState<string[]>(["", ""]);

  const [stake, setStake]                           = useState("");
  const [stakeType, setStakeType] = useState<"coins" | "circle_coin" | "custom">("coins");

  const [customStake, setCustomStake]               = useState("");

  const [closeAt, setCloseAt]                       = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker]          = useState(false);

  const [targets, setTargets]                       = useState<any[]>([]);
  const [selectedTargetId, setSelectedTargetId]     = useState<string | null>(null);
  const [selectedTargetName, setSelectedTargetName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]               = useState("");
  const [loading, setLoading]                       = useState(false);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [step, setStep]                             = useState<1 | 2 | 3>(1);

  const [creatorOptionIndex, setCreatorOptionIndex] = useState<number | null>(null);

  const [idempotencyKey] = useState(() => uuidv4());

  const [selectedTargetColor, setSelectedTargetColor] = useState<string | null>(null);
    const [selectedTargetIcon, setSelectedTargetIcon] = useState<string | null>(null);
const [circleCoin, setCircleCoin] = useState<{ name: string; symbol: string; color: string; icon: string } | null>(null);
const [circleCoinBalance, setCircleCoinBalance] = useState<number | null>(null);

    useEffect(() => {
      if (!circleCoin && stakeType === "circle_coin") {
        setStakeType("coins");
      }
    }, [circleCoin]);

    useEffect(() => {
      const fetchBalance = async () => {
        const sessionId = await getSessionId();
        if (!sessionId) return;
        const res = await fetch(`${API_BASE}/users/me`, { headers: { "x-session-id": sessionId } });
        const data = await res.json();
        if (res.ok) setCoinBalance(data.coins ?? 0);
      };
      fetchBalance();
    }, []);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const sessionId = await getSessionId();
        if (!sessionId) return;
        const endpoint = postTo === "circles"
          ? `${API_BASE}/circles/my`
            : `${API_BASE}/users/friends`;
        const res  = await fetch(endpoint, { headers: { "x-session-id": sessionId } });
        const data = await res.json();

        console.log("targets fetched for", postTo, data);


        if (res.ok) { setTargets(data); setSelectedTargetId(null); setSelectedTargetName(null); }
      } catch (err) {
        console.error("Fetch targets error:", err);
      }
    };
    fetchTargets();
  }, [postTo]);

  const filteredTargets = targets.filter((item) => {
    const name = item.username ?? item.name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const updateOption = (index: number, text: string) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const canProceedStep1 = title.trim().length > 0;
    const canProceedStep2 = options.filter((o) => o.trim()).length >= 2;

    const canShowSummary = canProceedStep1 && canProceedStep2 && !!selectedTargetId &&
        (stakeType === "custom" ? !!customStake.trim() : !!stake);

    const stakeExceedsBalance =
      stakeType === "coins"       ? (coinBalance !== null && Number(stake) > coinBalance) :
      stakeType === "circle_coin" ? (circleCoinBalance !== null && Number(stake) > circleCoinBalance) :
      false;
    const canSubmit = canShowSummary && creatorOptionIndex !== null && !stakeExceedsBalance;

  const handleCreateBet = async () => {
    try {
      setLoading(true);
      const textToCheck = [title, description, customStake, ...options].filter(Boolean);
        if (textToCheck.some((t) => filter.isProfane(t))) {
          Alert.alert("Inappropriate Content", "Please remove any inappropriate language from your bet.");
          setLoading(false);
          return;
        }

      const sessionId = await getSessionId();
      if (!sessionId) { Alert.alert("Error", "Not logged in"); return; }

      const cleanedOptions = options.filter((o) => o.trim() !== "");

      const response = await fetch(`${API_BASE}/bets`, {

        method: "POST",
          headers: { "Content-Type": "application/json", "x-session-id": sessionId, "x-idempotency-key": idempotencyKey },
        body: JSON.stringify({
          title, description,

            stake: stakeType !== "custom" ? Number(stake) : 0,
          customStake: stakeType === "custom" ? customStake.trim() : null,
          useCircleCoin: stakeType === "circle_coin",
            closesAt: closeAt ? closeAt.toISOString() : null,
          options:    cleanedOptions,
          targetType: postTo === "circles" ? "circle" : "user",
          targetId:   selectedTargetId,
            creatorOptionIndex,
        }),
      });

      const data = await response.json();
        if (!response.ok) {
          const errMsg = data.error || "Failed to create bet";
          typeof window !== "undefined" ? window.alert(errMsg) : Alert.alert("Error", errMsg);
          return;
        }

      setTitle(""); setDescription(""); setOptions(["", ""]); setStake("");
      setCloseAt(null); setPostTo("circles"); setSelectedTargetId(null); setStep(1);
      DeviceEventEmitter.emit("coinsUpdated");
    router.back();
    } catch {
      Alert.alert("Network Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  const cardBg   = "rgba(255,255,255,0.09)";
    const subtleBg = "rgba(255,255,255,0.06)";
    const optionColors = DesignTokens.optionColors.map((c: any) => c.btn);
  const stepLabels   = ["The Bet", "The Picks", "Who & Stakes"];

  const StepIndicator = () => (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
      {[1, 2, 3].map((s) => (
        <React.Fragment key={s}>
          <Pressable onPress={() => {
            if (s < step) setStep(s as 1 | 2 | 3);
            else if (s === 2 && canProceedStep1) setStep(2);
            else if (s === 3 && canProceedStep1 && canProceedStep2) setStep(3);
          }}>
            <View style={{
              width:           32, height: 32, borderRadius: 16,
              backgroundColor: step >= s ? theme.colors.primary : (isDark ? "rgba(255,255,255,0.08)" : "#e0e7ff"),
              alignItems: "center", justifyContent: "center",
              shadowColor:    step === s ? theme.colors.primary : "transparent",
              shadowOpacity:  0.5, shadowRadius: 8,
              elevation:      step === s ? 4 : 0,
            }}>
              {step > s
                ? <Ionicons name="checkmark" size={16} color="white" />
                : <Text style={{ color: step >= s ? "white" : theme.colors.onSurfaceVariant, fontWeight: "700", fontSize: 13 }}>{s}</Text>
              }
            </View>
          </Pressable>
          {s < 3 && (
            <View style={{
              width: 40, height: 2,
              backgroundColor: step > s ? theme.colors.primary : (isDark ? "rgba(255,255,255,0.08)" : "#e0e7ff"),
              marginHorizontal: 4,
            }} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  return (
      <GradientBackground>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <Text variant="headlineMedium" style={{
          color: theme.colors.onSurface, fontWeight: "300",
          textAlign: "center", marginBottom: 6, letterSpacing: 1,
        }}>
          Create a Bet
        </Text>
        <Text variant="bodyMedium" style={{
          color: theme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 24,
        }}>
          {stepLabels[step - 1]}
        </Text>

        <StepIndicator />

        {/* ══ STEP 1 ══ */}
        {step === 1 && (
          <View style={{
          borderRadius: 20,
          backgroundColor: "rgba(255,255,255,0.09)",
          borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
          padding: 20, marginBottom: 16,
        }}>
            <Text style={{
          color: theme.colors.onSurfaceVariant, fontWeight: "400",
          letterSpacing: 0.5, marginBottom: 16, fontSize: 16, textTransform: "uppercase"
        }}>
          What's the bet?
        </Text>

        <View style={{
          backgroundColor: "rgba(255,255,255,0.07)",
          borderRadius: 12, marginBottom: 8,
          borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
        }}>
          <TextInput label="Bet title" value={title} onChangeText={setTitle}
            maxLength={80} mode="flat"
            style={{ backgroundColor: "transparent" }}
            underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant } }}
          />
        </View>
        <HelperText type="info" visible style={{ marginBottom: 8 }}>
          {title.length}/80 characters
        </HelperText>

        <View style={{
          backgroundColor: "rgba(255,255,255,0.07)",
          borderRadius: 12, marginBottom: 16,
          borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
        }}>
          <TextInput label="Description" value={description} onChangeText={setDescription}
            mode="flat" multiline numberOfLines={3}
            style={{ backgroundColor: "transparent" }}
            underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant } }}
          />
        </View>
            <Button mode="outlined" onPress={() => setStep(2)} disabled={!canProceedStep1}
              style={{ borderRadius: 14, marginTop: 20, borderColor: theme.colors.primary }}
              labelStyle={{ fontWeight: "400", color: theme.colors.primary }}>
               Add Picks →
            </Button>

            <Button mode="text" onPress={() => router.back()}
              style={{ marginTop: 4 }}
              labelStyle={{ color: theme.colors.onSurfaceVariant }}>
              Cancel
            </Button>
          </View>
        )}

        {/* ══ STEP 2 ══ */}
        {step === 2 && (
          <View style={{
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.09)",
              borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
              padding: 20, marginBottom: 16,
            }}>
            <Text variant="labelLarge" style={{
              color: theme.colors.onSurfaceVariant, fontSize:16, fontWeight: "400",
              letterSpacing: 0.5, marginBottom: 4,
            }}>
              PICKS
            </Text>


            {options.map((opt, index) => (
              <View key={index} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: optionColors[index],
                  alignItems: "center", justifyContent: "center", marginRight: 12,
                }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <View style={{
                  flex: 1,
                  backgroundColor: "rgba(255,255,255,0.07)",
                  borderRadius: 12,
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
                }}>
                  <TextInput
                    label={`Option ${String.fromCharCode(65 + index)}`}
                    value={opt} onChangeText={(text) => updateOption(index, text)}
                    mode="flat"
                    style={{ backgroundColor: "transparent" }}
                    underlineColor="transparent"
                    activeUnderlineColor={theme.colors.primary}
                    theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
                  />
                </View>
                {options.length > 2 && (
                  <Pressable onPress={() => removeOption(index)} style={{ marginLeft: 8, padding: 4 }}>
                    <Ionicons name="close-circle" size={22} color={theme.colors.error} />
                  </Pressable>
                )}
              </View>
            ))}

            {options.length < 4 && (
              <Pressable onPress={() => setOptions([...options, ""])}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "center",
                  padding: 12, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed",
                  borderColor: theme.colors.primary, marginTop: 4, marginBottom: 16,
                }}>
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontWeight: "400", marginLeft: 6 }}>
                  Add Option {String.fromCharCode(65 + options.length)}
                </Text>
              </Pressable>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button mode="outlined" onPress={() => setStep(1)}
                style={{ flex: 1, borderRadius: 14 }} labelStyle={{ fontWeight: "400" }}>
                ← Back
              </Button>
              <Button mode="outlined" onPress={() => setStep(3)} disabled={!canProceedStep2}
                  style={{ flex: 2, borderRadius: 14, borderColor: theme.colors.primary }}
                  labelStyle={{ fontWeight: "400", color: theme.colors.primary }}>
                   Who & Stakes →
                </Button>
            </View>

            <Button mode="text" onPress={() => router.back()}
              style={{ marginTop: 4 }}
              labelStyle={{ color: theme.colors.onSurfaceVariant }}>
              Cancel
            </Button>
          </View>
        )}

        {/* ══ STEP 3 ══ */}
        {step === 3 && (
          <View style={{ gap: 16 }}>
            <View style={{
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.09)",
              borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
              padding: 20, marginBottom: 16,
            }}>
              <Text variant="labelLarge" style={{
                color: theme.colors.onSurfaceVariant, fontWeight: "400", fontSize: 16,
                letterSpacing: 0.5, marginBottom: 14,
              }}>
                POST TO
              </Text>

                <View style={{ flexDirection: "row", marginBottom: 16 }}>
              {(["circles", "friends"] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => { setPostTo(tab); setSearchQuery(""); setSelectedTargetId(null); setSelectedTargetName(null); }}
                  style={{
                    flex: 1, paddingVertical: 10, alignItems: "center",
                    borderBottomWidth: 2,
                    borderBottomColor: postTo === tab ? theme.colors.primary : "rgba(255,255,255,0.08)",
                  }}
                >
                  <Text style={{
                    fontSize: 14, fontWeight: postTo === tab ? "600" : "400",
                    color: postTo === tab ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                  }}>
                    {tab === "circles" ? "Circles" : "Friends"}
                  </Text>
                </Pressable>
              ))}
            </View>


              {selectedTargetId && !searchQuery && (
                <View style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    backgroundColor: "rgba(157,212,190,0.12)",
                    borderWidth: 1, borderColor: "rgba(157,212,190,0.25)",
                  borderRadius: 12, padding: 12, marginBottom: 12,
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.primary, fontWeight: "700", marginLeft: 8 }}>
                      {selectedTargetName}
                    </Text>
                  </View>
                  <Pressable
                      onPress={() => { setSelectedTargetId(null); setSelectedTargetName(null); setCircleCoin(null); setCircleCoinBalance(null); }}>
                    <Ionicons name="close-circle-outline" size={20} color={theme.colors.onSurfaceVariant} />
                  </Pressable>
                </View>
              )}

             <View style={{
                  backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 8,
                }}>
                  <TextInput label={`Search ${postTo}`} value={searchQuery} onChangeText={setSearchQuery}
                    mode="flat"
                    style={{ backgroundColor: "transparent" }}
                    underlineColor="transparent"
                    activeUnderlineColor={theme.colors.primary}
                    theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
                    left={<TextInput.Icon icon="magnify" />} />
                </View>

              {searchQuery.length > 0 && filteredTargets.map((item) => {
                const id       = item.id ?? item.circle_id;
                const name     = item.name ?? item.username;
                const selected = selectedTargetId === id;
                return (
                  <Pressable key={id}
                             onPress={() => {
                              setSelectedTargetId(id);
                              setSelectedTargetName(name);
                              setSelectedTargetColor(item.icon_color ?? item.avatar_color ?? null);
                              setSelectedTargetIcon(item.icon ?? item.avatar_icon ?? null);
                              setCircleCoin(item.coin_name ? {
                              name: item.coin_name,
                              symbol: item.coin_symbol ?? item.coin_name,
                              color: item.coin_color ?? "#f0c070",
                              icon: item.coin_icon ?? "ellipse",
                            } : null);

                              console.log("SELECTED TARGET:", item.name ?? item.username, "my_coin_balance:", item.my_coin_balance);

                            setCircleCoinBalance(item.coin_name ? (item.my_coin_balance ?? 0) : null);
                            setSearchQuery("");
                            }}
                    style={({ pressed }) => ({
                      flexDirection: "row", alignItems: "center",
                      padding: 12, borderRadius: 12, marginTop: 8,
                      backgroundColor: selected
                        ? (isDark ? "rgba(46,108,246,0.2)" : "rgba(46,108,246,0.1)") : subtleBg,
                      borderWidth: 1, borderColor: selected ? theme.colors.primary : "transparent",
                      opacity: pressed ? 0.8 : 1,
                    })}>
                    {postTo === "circles" ? (
                      <View style={{
                        width: 36, height: 36, borderRadius: 18,
                        backgroundColor: item.icon_color ?? "rgba(255,255,255,0.08)",
                        borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Ionicons name={(item.icon as any) ?? "people"} size={18} color="#fff" />
                      </View>
                    ) : (
                      <UserAvatar
                        user={{
                          display_name: item.name ?? item.username,
                          username: item.username ?? item.name,
                          avatar_color: item.avatar_color,
                          avatar_icon: item.avatar_icon,
                        }}
                        size={36}
                      />
                    )}
                    <Text style={{
                      color: selected ? theme.colors.primary : theme.colors.onSurface,
                      fontWeight: selected ? "700" : "500", marginLeft: 10,
                    }}>
                      {name}
                    </Text>
                  </Pressable>
                );
              })}

              {searchQuery.length > 0 && filteredTargets.length === 0 && (
                <Text variant="bodySmall" style={{
                  color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 12,
                }}>
                  No {postTo} found matching &quot;{searchQuery}&quot;
                </Text>
              )}
            </View>

            <View style={{
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.09)",
              borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
              padding: 20, marginBottom: 16,
            }}>
              <Text variant="labelLarge" style={{
                color: theme.colors.onSurfaceVariant, fontWeight: "400", fontSize:16,
                letterSpacing: 0.5, marginBottom: 14,
              }}>
                STAKE & DEADLINE
              </Text>

             {/* Build pills dynamically so circle coin appears as a 3rd option when available */}
        {(() => {
          type StakeMode = "coins" | "circle_coin" | "custom";
          const modes: { key: StakeMode; label: string; icon?: string; color?: string }[] = [
            { key: "coins", label: "Coins" },
            ...(circleCoin ? [{ key: "circle_coin" as StakeMode, label: circleCoin.name, icon: circleCoin.icon, color: circleCoin.color }] : []),
            { key: "custom", label: "Custom" },
          ];
          return (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {modes.map(({ key, label, icon, color }) => {
                const active = stakeType === key;
                const pillColor = color ?? theme.colors.primary;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setStakeType(key)}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 5,
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                      backgroundColor: active ? (color ? `${color}22` : "rgba(157,212,190,0.15)") : "transparent",
                      borderWidth: 1,
                      borderColor: active ? (color ? `${color}55` : "rgba(157,212,190,0.3)") : "rgba(255,255,255,0.1)",
                    }}
                  >
                    {icon && <Ionicons name={icon as any} size={12} color={active ? pillColor : theme.colors.onSurfaceVariant} />}
                    <Text style={{ fontSize: 12, fontWeight: active ? "600" : "400", color: active ? pillColor : theme.colors.onSurfaceVariant }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })()}

                {(stakeType === "coins" || stakeType === "circle_coin") ? (
                  <>
                    <View style={{
                      backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
                      borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12,
                    }}>
                      <TextInput
                      label={stakeType === "circle_coin" && circleCoin ? `Stake (${circleCoin.symbol})` : "Stake (coins)"}
                      value={stake}
                      onChangeText={setStake}
                      mode="flat" keyboardType="numeric"
                      style={{ backgroundColor: "transparent" }}
                      underlineColor="transparent"
                      activeUnderlineColor={stakeType === "circle_coin" && circleCoin ? circleCoin.color : theme.colors.primary}
                      theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
                      left={<TextInput.Icon icon="cash" />} />
                    </View>
                    {stakeExceedsBalance && (
                      <HelperText type="error" visible>
                        {stakeType === "circle_coin"
                          ? `You only have ${circleCoinBalance} ${circleCoin?.symbol} in this circle`
                          : `You only have ${coinBalance} coins`}
                      </HelperText>
                    )}
                  </>
                ) : (


                  <View style={{
                    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
                    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12,
                  }}>
                    <TextInput label="What's at stake?" value={customStake} onChangeText={setCustomStake}
                      mode="flat"
                      style={{ backgroundColor: "transparent" }}
                      underlineColor="transparent"
                      activeUnderlineColor={theme.colors.primary}
                      theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
                      placeholder="e.g. loser buys coffee"
                      left={<TextInput.Icon icon={"trophy-outline" as any} />} />
                  </View>
                )}

              {showDatePicker && (
                  <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                  <DateTimePickerModal
                    mode="single"

                    components={{
                      IconPrev: <Ionicons name="chevron-back" size={20} color="#ffffff" />,
                      IconNext: <Ionicons name="chevron-forward" size={20} color="#ffffff" />,
                    }}



                    date={closeAt ? dayjs(closeAt) : dayjs()}
                    onChange={({ date }) => {
                      setCloseAt(date ? dayjs(date).toDate() : null);
                      setShowDatePicker(false);
                    }}
                    minDate={dayjs()}

                    styles={{
                      day_label: { color: "#ffffff" },
                      day_cell: { backgroundColor: "transparent" },
                      selected: { backgroundColor: theme.colors.primary },
                      selected_label: { color: "#0d2a22" },
                      today: { borderColor: theme.colors.primary },
                      today_label: { color: theme.colors.primary },
                      month_label: { color: "#ffffff" },
                      year_label: { color: "#ffffff" },
                      weekday_label: { color: "rgba(255,255,255,0.5)" },
                      caption_label: { color: "#ffffff" },
                      header_label: { color: "#ffffff" },
                      title: { color: "#ffffff" },
                      header: { backgroundColor: "transparent" },
                    } as any}
                  />
                </View>
              )}

              <Pressable onPress={() => setShowDatePicker(!showDatePicker)}>
                  <View pointerEvents="none" style={{
                    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
                    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
                  }}>
                    <TextInput
                      label="Closes at (optional)"
                      value={closeAt ? dayjs(closeAt).format("MMM D, YYYY") : ""}
                      mode="flat"
                      style={{ backgroundColor: "transparent" }}
                      underlineColor="transparent"
                      activeUnderlineColor={theme.colors.primary}
                      theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
                      left={<TextInput.Icon icon="calendar" />}
                      placeholder="Select a date"
                      editable={false}
                    />
                  </View>
                </Pressable>

            </View>

            {canShowSummary && (
              <View style={{
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.09)",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
                padding: 16, marginBottom: 16,
              }}>
                <Text style={{ fontSize: 16, fontWeight: "400", color: theme.colors.onSurfaceVariant, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>
                  Bet Summary
                </Text>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                  {postTo === "circles" ? (
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: selectedTargetColor ?? "rgba(255,255,255,0.08)",
                    borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name={(selectedTargetIcon as any) ?? "people"} size={20} color="#fff" />
                  </View>
                ) : (
                  <UserAvatar
                    user={{
                      display_name: selectedTargetName ?? "",
                      username: selectedTargetName ?? "",
                      avatar_color: selectedTargetColor ?? undefined,
                      avatar_icon: selectedTargetIcon ?? undefined,
                    }}
                    size={44}
                  />
                )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.onSurface }}>{title}</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{selectedTargetName}</Text>
                  </View>
                  {stakeType === "circle_coin" && circleCoin ? (
                      <View style={{
                        width: 72, height: 72, borderRadius: 36,
                        backgroundColor: `${circleCoin.color}22`,
                        borderColor: `${circleCoin.color}44`,
                        borderWidth: 1,
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Ionicons name={circleCoin.icon as any} size={18} color={circleCoin.color} style={{ marginBottom: 2 }} />
                        <Text style={{ color: circleCoin.color, fontWeight: "700", fontSize: 16 }}>{stake}</Text>
                        <Text style={{ color: circleCoin.color, fontWeight: "400", fontSize: 10, letterSpacing: 1.5 }}>
                          {circleCoin.symbol.toUpperCase()}
                        </Text>
                      </View>
                    ) : stakeType === "coins" ? (
                      <View style={{
                        width: 72, height: 72, borderRadius: 36,
                        backgroundColor: "rgba(240,192,112,0.12)",
                        borderColor: "rgba(240,192,112,0.2)",
                        borderWidth: 1,
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ color: "#f0c070", fontWeight: "700", fontSize: 22 }}>{stake}</Text>
                        <Text style={{ color: "#f0c070", fontWeight: "400", fontSize: 10, letterSpacing: 1.5 }}>COINS</Text>
                      </View>
                    ) : (
                      <View style={{
                          backgroundColor: "rgba(99,102,241,0.1)",
                          borderColor: "rgba(99,102,241,0.25)",
                          borderWidth: 1, borderRadius: 20,
                          paddingHorizontal: 12, paddingVertical: 5,
                        }}>
                          <Text style={{ color: "#a5b4fc", fontWeight: "600", fontSize: 12 }}>{customStake}</Text>
                        </View>
                    )}
                </View>

                <Text style={{ fontSize: 12, fontWeight: "400", color: theme.colors.onSurfaceVariant, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 16, marginBottom: 8 }}>
                  Pick your side
                </Text>
                <View style={{ gap: 6 }}>
                  {options.filter(Boolean).map((opt, i) => {
                    const selected = creatorOptionIndex === i;
                    return (
                      <Pressable key={i} onPress={() => setCreatorOptionIndex(i)} style={{
                        borderRadius: 10, padding: 10,
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.primary : "rgba(255,255,255,0.07)",
                        flexDirection: "row", alignItems: "center", gap: 10,
                        backgroundColor: selected ? "rgba(157,212,190,0.1)" : "rgba(255,255,255,0.04)",
                      }}>
                        <View style={{
                          width: 24, height: 24, borderRadius: 12,
                          backgroundColor: optionColors[i],
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>{String.fromCharCode(65 + i)}</Text>
                        </View>
                        <Text style={{ color: selected ? theme.colors.primary : theme.colors.onSurface, fontSize: 13, fontWeight: selected ? "600" : "400" }}>{opt}</Text>
                        {selected && <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} style={{ marginLeft: "auto" }} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button mode="outlined" onPress={() => setStep(2)}
                style={{ flex: 1, alignSelf: "center" ,borderRadius: 14 }} labelStyle={{ fontWeight: "400" }}>
                ← Back
              </Button>
              <Button mode="contained" onPress={handleCreateBet} loading={loading}
                disabled={!canSubmit || loading} style={{ flex: 2, borderRadius: 14 }}
                contentStyle={{ paddingVertical: 6 }} labelStyle={{ fontWeight: "400", fontSize: 15 }}>
                 Place Bet
              </Button>
            </View>

            <Button mode="text" onPress={() => router.back()}
              labelStyle={{ color: theme.colors.onSurfaceVariant }}>
              Cancel
            </Button>
          </View>
        )}
      </ScrollView>
      </GradientBackground>
  );
}
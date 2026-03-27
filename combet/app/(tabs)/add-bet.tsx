import React, { useState, useEffect } from "react";

import { View, ScrollView, Alert, Pressable, Platform } from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import DateTimePickerModal from "react-native-ui-datepicker";
import dayjs from "dayjs";
import GradientBackground from "@/components/GradientBackground";


import {
  Text,
  TextInput,
  Button,
  Surface,
  HelperText,
  SegmentedButtons,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import {DesignTokens, useAppTheme} from "@/context/ThemeContext";

export default function AddBet() {
  const { theme, isDark } = useAppTheme();

  const [postTo, setPostTo]                         = useState<"circles" | "friends">("circles");
  const [title, setTitle]                           = useState("");
  const [description, setDescription]               = useState("");
  const [options, setOptions]                       = useState<string[]>(["", ""]);

  const [stake, setStake]                           = useState("");
  const [stakeType, setStakeType]                   = useState<"coins" | "custom">("coins");
  const [customStake, setCustomStake]               = useState("");

  const [closeAt, setCloseAt]                       = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker]          = useState(false);

  const [targets, setTargets]                       = useState<any[]>([]);
  const [selectedTargetId, setSelectedTargetId]     = useState<string | null>(null);
  const [selectedTargetName, setSelectedTargetName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]               = useState("");
  const [loading, setLoading]                       = useState(false);
  const [step, setStep]                             = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const sessionId = await getSessionId();
        if (!sessionId) return;
        const endpoint = postTo === "circles"
          ? "http://localhost:3001/circles/my"
          : "http://localhost:3001/users/friends";
        const res  = await fetch(endpoint, { headers: { "x-session-id": sessionId } });
        const data = await res.json();
        if (res.ok) { setTargets(data); setSelectedTargetId(null); setSelectedTargetName(null); }
      } catch (err) {
        console.error("Fetch targets error:", err);
      }
    };
    fetchTargets();
  }, [postTo]);

  const filteredTargets = targets.filter((item) => {
    const name = item.name ?? item.username;
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

  const canProceedStep1 = title.trim().length > 0 && description.trim().length > 0;
  const canProceedStep2 = options.filter((o) => o.trim()).length >= 2;

  const canSubmit = canProceedStep1 && canProceedStep2 && !!selectedTargetId &&
    (stakeType === "coins" ? !!stake : !!customStake.trim());

  const handleCreateBet = async () => {
    try {
      setLoading(true);
      const sessionId = await getSessionId();
      if (!sessionId) { Alert.alert("Error", "Not logged in"); return; }

      const cleanedOptions = options.filter((o) => o.trim() !== "");

      const response = await fetch("http://localhost:3001/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId },
        body: JSON.stringify({
          title, description,

            stake:      stakeType === "coins" ? Number(stake) : 0,
          customStake: stakeType === "custom" ? customStake.trim() : null,
          closesAt: closeAt ? closeAt.toISOString() : null,
          options:    cleanedOptions,
          targetType: postTo === "circles" ? "circle" : "user",
          targetId:   selectedTargetId,
        }),
      });

      const data = await response.json();
      if (!response.ok) { Alert.alert("Error", data.error || "Failed to create bet"); return; }

      setTitle(""); setDescription(""); setOptions(["", ""]); setStake("");
      setCloseAt(null); setPostTo("circles"); setSelectedTargetId(null); setStep(1);
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
                  <Pressable onPress={() => { setSelectedTargetId(null); setSelectedTargetName(null); }}>
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
                    onPress={() => { setSelectedTargetId(id); setSelectedTargetName(name); setSearchQuery(""); }}
                    style={({ pressed }) => ({
                      flexDirection: "row", alignItems: "center",
                      padding: 12, borderRadius: 12, marginTop: 8,
                      backgroundColor: selected
                        ? (isDark ? "rgba(46,108,246,0.2)" : "rgba(46,108,246,0.1)") : subtleBg,
                      borderWidth: 1, borderColor: selected ? theme.colors.primary : "transparent",
                      opacity: pressed ? 0.8 : 1,
                    })}>
                    <Ionicons name={postTo === "circles" ? "people" : "person"} size={18}
                      color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant} />
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

             <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                  {(["coins", "custom"] as const).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setStakeType(type)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                        backgroundColor: stakeType === type ? "rgba(157,212,190,0.15)" : "transparent",
                        borderWidth: 1,
                        borderColor: stakeType === type ? "rgba(157,212,190,0.3)" : "rgba(255,255,255,0.1)",
                      }}
                    >
                      <Text style={{
                        fontSize: 12, fontWeight: stakeType === type ? "600" : "400",
                        color: stakeType === type ? theme.colors.primary : theme.colors.onSurfaceVariant,
                      }}>
                        {type === "coins" ? "Coins" : "Custom"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

              {stakeType === "coins" ? (
                  <View style={{
                    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
                    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12,
                  }}>
                    <TextInput label="Stake (coins)" value={stake} onChangeText={setStake}
                      mode="flat" keyboardType="numeric"
                      style={{ backgroundColor: "transparent" }}
                      underlineColor="transparent"
                      activeUnderlineColor={theme.colors.primary}
                      theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
                      left={<TextInput.Icon icon="cash" />} />
                  </View>
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

            {canSubmit && (
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
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: "rgba(157,212,190,0.12)",
                    borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name="people" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.onSurface }}>{title}</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{selectedTargetName}</Text>
                  </View>
                  <View style={{
                    backgroundColor: "rgba(240,192,112,0.12)",
                    borderColor: "rgba(240,192,112,0.2)",
                    borderWidth: 1, borderRadius: 20,
                    paddingHorizontal: 12, paddingVertical: 5,
                  }}>
                    <Text style={{ color: "#f0c070", fontWeight: "600", fontSize: 12 }}>
                      {stakeType === "coins" ? `${stake} coins` : customStake}
                    </Text>
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  {options.filter(Boolean).map((opt, i) => (
                    <View key={i} style={{
                      borderRadius: 10, padding: 10,
                      borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
                      flexDirection: "row", alignItems: "center", gap: 10,
                      backgroundColor: "rgba(255,255,255,0.04)",
                    }}>
                      <View style={{
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: optionColors[i],
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>{String.fromCharCode(65 + i)}</Text>
                      </View>
                      <Text style={{ color: theme.colors.onSurface, fontSize: 13 }}>{opt}</Text>
                    </View>
                  ))}
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
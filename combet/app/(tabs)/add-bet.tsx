import React, { useState, useEffect } from "react";
import { View, ScrollView, Alert, Pressable, TouchableOpacity } from "react-native";
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
import { useAppTheme } from "@/context/ThemeContext";

export default function AddBet() {
  const { theme, isDark } = useAppTheme();

  const [postTo, setPostTo]                   = useState<"circles" | "friends">("circles");
  const [title, setTitle]                     = useState("");
  const [description, setDescription]         = useState("");
  const [options, setOptions]                 = useState<string[]>(["", ""]);
  const [stake, setStake]                     = useState("");
  const [closeAt, setCloseAt]                 = useState("");
  const [targets, setTargets]                 = useState<any[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedTargetName, setSelectedTargetName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]         = useState("");
  const [loading, setLoading]                 = useState(false);
  const [step, setStep]                       = useState<1 | 2 | 3>(1);

  // ── Fetch circles or friends ─────────────────────────────────────────────
  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const sessionId = await getSessionId();
        if (!sessionId) return;
        const endpoint = postTo === "circles"
          ? "http://localhost:3001/circles/my"
          : "http://localhost:3001/users/friends";
        const res = await fetch(endpoint, { headers: { "x-session-id": sessionId } });
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

  // ── Validation per step ──────────────────────────────────────────────────
  const canProceedStep1 = title.trim().length > 0 && description.trim().length > 0;
  const canProceedStep2 = options.filter((o) => o.trim()).length >= 2;
  const canSubmit       = canProceedStep1 && canProceedStep2 && !!selectedTargetId && !!stake;

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
          title,
          description,
          stake:      Number(stake),
          closesAt:   closeAt || null,
          options:    cleanedOptions,
          targetType: postTo === "circles" ? "circle" : "user",
          targetId:   selectedTargetId,
        }),
      });

      const data = await response.json();
      if (!response.ok) { Alert.alert("Error", data.error || "Failed to create bet"); return; }

      // Reset
      setTitle(""); setDescription(""); setOptions(["", ""]); setStake("");
      setCloseAt(""); setPostTo("circles"); setSelectedTargetId(null); setStep(1);
      router.back();
    } catch {
      Alert.alert("Network Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  const cardBg   = isDark ? "#0D1F35" : "#ffffff";
  const subtleBg = isDark ? "#091828" : "#f2f6ff";
  const optionColors = ["#1D4ED8", "#2E6CF6", "#60A5FA", "#93C5FD"];

  // ── Step indicator ───────────────────────────────────────────────────────
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
              width:           32,
              height:          32,
              borderRadius:    16,
              backgroundColor: step >= s ? theme.colors.primary : (isDark ? "#1a2f4a" : "#e0e7ff"),
              alignItems:      "center",
              justifyContent:  "center",
              shadowColor:     step === s ? theme.colors.primary : "transparent",
              shadowOpacity:   0.5,
              shadowRadius:    8,
              elevation:       step === s ? 4 : 0,
            }}>
              {step > s ? (
                <Ionicons name="checkmark" size={16} color="white" />
              ) : (
                <Text style={{
                  color:      step >= s ? "white" : theme.colors.onSurfaceVariant,
                  fontWeight: "700",
                  fontSize:   13,
                }}>
                  {s}
                </Text>
              )}
            </View>
          </Pressable>
          {s < 3 && (
            <View style={{
              width:           40,
              height:          2,
              backgroundColor: step > s ? theme.colors.primary : (isDark ? "#1a2f4a" : "#e0e7ff"),
              marginHorizontal: 4,
            }} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  // ── Step labels ──────────────────────────────────────────────────────────
  const stepLabels = ["The Bet", "The Picks", "Who & Stakes"];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <Text variant="headlineMedium" style={{
          color: theme.colors.onSurface, fontWeight: "900",
          textAlign: "center", marginBottom: 6, letterSpacing: 0.5,
        }}>
          Create a Bet
        </Text>
        <Text variant="bodyMedium" style={{
          color: theme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 24,
        }}>
          {stepLabels[step - 1]}
        </Text>

        <StepIndicator />

        {/* ══════════════════════════════════════════════
            STEP 1 — The Bet
        ══════════════════════════════════════════════ */}
        {step === 1 && (
          <Surface elevation={0} style={{
            borderRadius: 20, backgroundColor: cardBg, padding: 20,
            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
          }}>
            <Text variant="labelLarge" style={{
              color: theme.colors.onSurfaceVariant, fontWeight: "700",
              letterSpacing: 0.5, marginBottom: 16,
            }}>
              WHAT'S THE BET?
            </Text>

            <TextInput
              label="Bet title"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              outlineStyle={{ borderRadius: 12 }}
              style={{ backgroundColor: subtleBg, marginBottom: 4 }}
              placeholder="e.g. Will Sophia wake up on time?"
            />
            <HelperText type="info" visible style={{ marginBottom: 8 }}>
              {title.length}/80 characters
            </HelperText>

            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              outlineStyle={{ borderRadius: 12 }}
              style={{ backgroundColor: subtleBg }}
              placeholder="Give some context about this bet..."
            />

            <Button
              mode="contained"
              onPress={() => setStep(2)}
              disabled={!canProceedStep1}
              contentStyle={{ paddingVertical: 6 }}
              labelStyle={{ fontWeight: "800", fontSize: 15 }}
              style={{ borderRadius: 14, marginTop: 20 }}
            >
              Next: Add Picks →
            </Button>
          </Surface>
        )}

        {/* ══════════════════════════════════════════════
            STEP 2 — The Picks (options)
        ══════════════════════════════════════════════ */}
        {step === 2 && (
          <Surface elevation={0} style={{
            borderRadius: 20, backgroundColor: cardBg, padding: 20,
            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
          }}>
            <Text variant="labelLarge" style={{
              color: theme.colors.onSurfaceVariant, fontWeight: "700",
              letterSpacing: 0.5, marginBottom: 4,
            }}>
              PICKS
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
              Add 2–4 options for people to choose from
            </Text>

            {options.map((opt, index) => (
              <View key={index} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                {/* Color badge */}
                <View style={{
                  width:           38,
                  height:          38,
                  borderRadius:    19,
                  backgroundColor: optionColors[index],
                  alignItems:      "center",
                  justifyContent:  "center",
                  marginRight:     12,
                  shadowColor:     optionColors[index],
                  shadowOpacity:   0.4,
                  shadowRadius:    6,
                  elevation:       3,
                }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <TextInput
                    label={`Option ${String.fromCharCode(65 + index)}`}
                    value={opt}
                    onChangeText={(text) => updateOption(index, text)}
                    mode="outlined"
                    outlineStyle={{ borderRadius: 10, borderColor: optionColors[index] }}
                    style={{ backgroundColor: subtleBg }}
                  />
                </View>

                {/* Remove button (only if > 2 options) */}
                {options.length > 2 && (
                  <Pressable onPress={() => removeOption(index)} style={{ marginLeft: 8, padding: 4 }}>
                    <Ionicons name="close-circle" size={22} color={theme.colors.error} />
                  </Pressable>
                )}
              </View>
            ))}

            {/* Add option */}
            {options.length < 4 && (
              <Pressable
                onPress={() => setOptions([...options, ""])}
                style={{
                  flexDirection:  "row",
                  alignItems:     "center",
                  justifyContent: "center",
                  padding:        12,
                  borderRadius:   12,
                  borderWidth:    1.5,
                  borderStyle:    "dashed",
                  borderColor:    theme.colors.primary,
                  marginTop:      4,
                  marginBottom:   16,
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontWeight: "700", marginLeft: 6 }}>
                  Add Option {String.fromCharCode(65 + options.length)}
                </Text>
              </Pressable>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button mode="outlined" onPress={() => setStep(1)}
                style={{ flex: 1, borderRadius: 14 }}
                labelStyle={{ fontWeight: "700" }}>
                ← Back
              </Button>
              <Button mode="contained" onPress={() => setStep(3)}
                disabled={!canProceedStep2}
                style={{ flex: 2, borderRadius: 14 }}
                labelStyle={{ fontWeight: "800" }}>
                Next: Who & Stakes →
              </Button>
            </View>
          </Surface>
        )}

        {/* ══════════════════════════════════════════════
            STEP 3 — Who's in & Stakes
        ══════════════════════════════════════════════ */}
        {step === 3 && (
          <View style={{ gap: 16 }}>

            {/* ── Post To ── */}
            <Surface elevation={0} style={{
              borderRadius: 20, backgroundColor: cardBg, padding: 20,
              borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
            }}>
              <Text variant="labelLarge" style={{
                color: theme.colors.onSurfaceVariant, fontWeight: "700",
                letterSpacing: 0.5, marginBottom: 14,
              }}>
                POST TO
              </Text>

              <SegmentedButtons
                value={postTo}
                onValueChange={(v) => { setPostTo(v as "circles" | "friends"); setSearchQuery(""); setSelectedTargetId(null); setSelectedTargetName(null); }}
                buttons={[
                  { value: "circles", label: "Circles", icon: "people-outline" as any },
                  { value: "friends", label: "Friends", icon: "person-outline" as any },
                ]}
                style={{ marginBottom: 16 }}
              />

              {/* Selected target chip */}
              {selectedTargetId && !searchQuery && (
                <View style={{
                  flexDirection:   "row",
                  alignItems:      "center",
                  justifyContent:  "space-between",
                  backgroundColor: isDark ? "rgba(46,108,246,0.2)" : "rgba(46,108,246,0.1)",
                  borderRadius:    12,
                  padding:         12,
                  marginBottom:    12,
                  borderWidth:     1,
                  borderColor:     theme.colors.primary,
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

              {/* Search */}
              <TextInput
                label={`Search ${postTo}`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                mode="outlined"
                outlineStyle={{ borderRadius: 12 }}
                style={{ backgroundColor: subtleBg }}
                left={<TextInput.Icon icon="magnify" />}
              />

              {/* Results */}
              {searchQuery.length > 0 && filteredTargets.map((item) => {
                const id   = item.id ?? item.circle_id;
                const name = item.name ?? item.username;
                const selected = selectedTargetId === id;

                return (
                  <Pressable
                    key={id}
                    onPress={() => { setSelectedTargetId(id); setSelectedTargetName(name); setSearchQuery(""); }}
                    style={({ pressed }) => ({
                      flexDirection:   "row",
                      alignItems:      "center",
                      padding:         12,
                      borderRadius:    12,
                      marginTop:       8,
                      backgroundColor: selected
                        ? (isDark ? "rgba(46,108,246,0.2)" : "rgba(46,108,246,0.1)")
                        : subtleBg,
                      borderWidth:     1,
                      borderColor:     selected ? theme.colors.primary : "transparent",
                      opacity:         pressed ? 0.8 : 1,
                    })}
                  >
                    <Ionicons
                      name={postTo === "circles" ? "people" : "person"}
                      size={18}
                      color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                    <Text style={{
                      color:      selected ? theme.colors.primary : theme.colors.onSurface,
                      fontWeight: selected ? "700" : "500",
                      marginLeft: 10,
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
                  No {postTo} found matching "{searchQuery}"
                </Text>
              )}
            </Surface>

            {/* ── Stake & Close ── */}
            <Surface elevation={0} style={{
              borderRadius: 20, backgroundColor: cardBg, padding: 20,
              borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
            }}>
              <Text variant="labelLarge" style={{
                color: theme.colors.onSurfaceVariant, fontWeight: "700",
                letterSpacing: 0.5, marginBottom: 14,
              }}>
                STAKE & DEADLINE
              </Text>

              <TextInput
                label="Stake (coins)"
                value={stake}
                onChangeText={setStake}
                mode="outlined"
                keyboardType="numeric"
                outlineStyle={{ borderRadius: 12 }}
                style={{ backgroundColor: subtleBg, marginBottom: 12 }}
                left={<TextInput.Icon icon="cash" />}
              />

              <TextInput
                label="Closes at (optional)"
                value={closeAt}
                onChangeText={setCloseAt}
                mode="outlined"
                outlineStyle={{ borderRadius: 12 }}
                style={{ backgroundColor: subtleBg }}
                left={<TextInput.Icon icon="calendar" />}
                placeholder="e.g. 2026-03-01"
              />
            </Surface>

            {/* ── Bet summary ── */}
            {canSubmit && (
              <Surface elevation={0} style={{
                borderRadius: 20, backgroundColor: isDark ? "rgba(46,108,246,0.12)" : "rgba(46,108,246,0.07)",
                padding: 16,
                borderWidth: 1, borderColor: isDark ? "rgba(46,108,246,0.3)" : "rgba(46,108,246,0.2)",
              }}>
                <Text variant="labelLarge" style={{
                  color: theme.colors.primary, fontWeight: "700", marginBottom: 10,
                }}>
                  📋 BET SUMMARY
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: "600", marginBottom: 4 }}>
                  {title}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                  {description}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {options.filter(Boolean).map((opt, i) => (
                    <View key={i} style={{
                      backgroundColor: optionColors[i],
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                    }}>
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                        {String.fromCharCode(65 + i)}: {opt}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  📍 {selectedTargetName} · 🪙 {stake} coins
                </Text>
              </Surface>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button mode="outlined" onPress={() => setStep(2)}
                style={{ flex: 1, borderRadius: 14 }}
                labelStyle={{ fontWeight: "700" }}>
                ← Back
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateBet}
                loading={loading}
                disabled={!canSubmit || loading}
                style={{ flex: 2, borderRadius: 14 }}
                contentStyle={{ paddingVertical: 6 }}
                labelStyle={{ fontWeight: "900", fontSize: 15 }}
              >
                 Place Bet
              </Button>
            </View>

            <Button mode="text" onPress={() => router.back()}
              labelStyle={{ color: theme.colors.onSurfaceVariant }}>
              Cancel
            </Button>
          </View>
        )}
            <Button mode="text" onPress={() => router.back()}
                    style={{ marginTop: 6 }}
                    labelStyle={{ color: theme.colors.onSurfaceVariant }}>
                    Cancel
            </Button>
      </ScrollView>
    </View>
  );
}
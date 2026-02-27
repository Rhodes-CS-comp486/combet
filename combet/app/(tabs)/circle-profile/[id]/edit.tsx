import React, { useEffect, useState } from "react";
import { View, ScrollView, Alert, Pressable } from "react-native";
import { Text, TextInput, Button, Surface, HelperText } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";
import BackHeader from "@/components/Backheader";

const ICON_OPTIONS: { key: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: "people",          label: "People"  },
  { key: "flame",           label: "Flame"   },
  { key: "football",        label: "Sports"  },
  { key: "book",            label: "Study"   },
  { key: "fitness",         label: "Fitness" },
  { key: "trophy",          label: "Trophy"  },
  { key: "cash",            label: "Money"   },
  { key: "game-controller", label: "Gaming"  },
];

export default function EditCircle() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const { id } = useLocalSearchParams();
  const circleId = Array.isArray(id) ? id[0] : id;

  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>("people");
  const [nameError, setNameError]     = useState<string | null>(null);
  const [descError, setDescError]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (!circleId) return;
    fetch(`http://localhost:3001/circles/${circleId}`)
      .then((res) => res.json())
      .then((data) => {
        setName(data.name);
        setDescription(data.description || "");
        setSelectedIcon(data.icon || "people");
      })
      .catch(console.error);
  }, [circleId]);

  const handleSave = async () => {
    setNameError(null);
    setDescError(null);
    if (name.length < 5 || name.length > 15) { setNameError("Name must be 5–15 characters"); return; }
    if (description.length > 100) { setDescError("Description must be under 100 characters"); return; }

    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/circles/${circleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, icon: selectedIcon }),
      });
      if (!res.ok) throw new Error("Failed to update");
      router.replace(`/circle-profile/${circleId}`);
    } catch {
      Alert.alert("Error saving changes");
    } finally {
      setLoading(false);
    }
  };

  const cardBg   = isDark ? "#0F223A" : "#ffffff";
  const subtleBg = isDark ? "#091828" : "#f2f6ff";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BackHeader label="Circle Profile" href={`/circle-profile/${circleId}`} />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="headlineSmall" style={{
          color: theme.colors.onSurface, fontWeight: "800",
          textAlign: "center", marginBottom: 24,
        }}>
          Edit Circle
        </Text>

        {/* ── Icon preview ── */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: theme.colors.primary,
            justifyContent: "center", alignItems: "center",
            shadowColor: theme.colors.primary, shadowOpacity: 0.45,
            shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 10,
          }}>
            <Ionicons name={selectedIcon} size={42} color="white" />
          </View>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 10 }}>
            Tap an icon below to change
          </Text>
        </View>

        {/* ── Icon picker ── */}
        <Surface elevation={0} style={{
          borderRadius: 20, backgroundColor: cardBg, padding: 16, marginBottom: 16,
          borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
        }}>
          <Text variant="labelLarge" style={{
            color: theme.colors.onSurfaceVariant, marginBottom: 14, fontWeight: "700", letterSpacing: 0.5,
          }}>
            CHOOSE AN ICON
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {ICON_OPTIONS.map(({ key, label }) => {
              const selected = selectedIcon === key;
              return (
                <Pressable key={key} onPress={() => setSelectedIcon(key)}
                  style={({ pressed }) => ({
                    flex: 1, minWidth: 70, alignItems: "center", paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: selected ? theme.colors.primary : subtleBg,
                    borderWidth: selected ? 0 : 1,
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                    opacity: pressed ? 0.8 : 1,
                    shadowColor: selected ? theme.colors.primary : "transparent",
                    shadowOpacity: selected ? 0.4 : 0, shadowRadius: 8, elevation: selected ? 4 : 0,
                  })}>
                  <Ionicons name={key} size={24} color={selected ? "white" : theme.colors.onSurfaceVariant} />
                  <Text variant="labelSmall" style={{
                    color: selected ? "white" : theme.colors.onSurfaceVariant,
                    marginTop: 6, fontWeight: selected ? "700" : "400",
                  }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Surface>

        {/* ── Name & Description ── */}
        <Surface elevation={0} style={{
          borderRadius: 20, backgroundColor: cardBg, padding: 16, marginBottom: 24,
          borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
        }}>
          <TextInput
            label="Circle name" value={name}
            onChangeText={(t) => { setName(t); setNameError(null); }}
            mode="outlined" maxLength={15} outlineStyle={{ borderRadius: 12 }}
            style={{ backgroundColor: subtleBg }}
            right={<TextInput.Affix text={`${name.length}/15`} textStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }} />}
          />
          <HelperText type="error" visible={!!nameError}>{nameError ?? " "}</HelperText>

          <TextInput
            label="Description (optional)" value={description}
            onChangeText={(t) => { setDescription(t); setDescError(null); }}
            mode="outlined" multiline numberOfLines={3} maxLength={100}
            outlineStyle={{ borderRadius: 12 }} style={{ backgroundColor: subtleBg, marginTop: 4 }}
            right={<TextInput.Affix text={`${description.length}/100`} textStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }} />}
          />
          <HelperText type="error" visible={!!descError}>{descError ?? " "}</HelperText>
        </Surface>

        <Button mode="contained" onPress={handleSave} loading={loading} disabled={loading}
          contentStyle={{ paddingVertical: 8 }} labelStyle={{ fontWeight: "900", fontSize: 16 }}
          style={{ borderRadius: 16 }}>
          Save Changes
        </Button>

        <Button mode="text" onPress={() => router.replace(`/circle-profile/${circleId}`)}
          style={{ marginTop: 6 }} labelStyle={{ color: theme.colors.onSurfaceVariant }}>
          Cancel
        </Button>
      </ScrollView>
    </View>
  );
}
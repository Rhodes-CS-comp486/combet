import React, { useEffect, useState } from "react";
import { View, ScrollView, Alert } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";
import BackHeader from "@/components/Backheader";
import IconCarousel, { ICONS } from "@/components/IconCarousel";
import GradientBackground from "@/components/GradientBackground";

export default function EditCircle() {
  const router            = useRouter();
  const { theme, isDark } = useAppTheme();
  const { id }            = useLocalSearchParams();
  const circleId          = Array.isArray(id) ? id[0] : id;

  const [iconIndex, setIconIndex]     = useState(0);
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError]     = useState<string | null>(null);
  const [descError, setDescError]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [ready, setReady]             = useState(false);

  useEffect(() => {
    if (!circleId) return;
    fetch(`http://localhost:3001/circles/${circleId}`)
      .then((res) => res.json())
      .then((data) => {
        setName(data.name);
        setDescription(data.description || "");
        const idx = ICONS.indexOf(data.icon);
        setIconIndex(idx >= 0 ? idx : 0);
        setReady(true);
      })
      .catch(console.error);
  }, [circleId]);

  const handleSave = async () => {
    setNameError(null);
    setDescError(null);
    if (name.length < 5 || name.length > 15) { setNameError("Name must be 5–15 characters"); return; }
    if (description.length > 100)            { setDescError("Description must be under 100 characters"); return; }

    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/circles/${circleId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, description, icon: ICONS[iconIndex] }),
      });
      if (!res.ok) throw new Error("Failed to update");
      router.replace(`/circle-profile/${circleId}`);
    } catch {
      Alert.alert("Error saving changes");
    } finally {
      setLoading(false);
    }
  };

  const subtleBg = isDark ? "#0F223A" : "#f0f4ff";

  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BackHeader label="Circle Profile" href={`/circle-profile/${circleId}`} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="headlineSmall" style={{
          color:        theme.colors.onSurface,
          fontWeight:   "800",
          textAlign:    "center",
          marginTop:    20,
          marginBottom: 28,
        }}>
          Edit Circle
        </Text>

        {/* ── Icon carousel ── */}
        <Text variant="labelLarge" style={{
          color:         theme.colors.onSurfaceVariant,
          fontWeight:    "700",
          letterSpacing: 1,
          textAlign:     "center",
          marginBottom:  16,
        }}>
          CHANGE ICON
        </Text>

        <IconCarousel selectedIndex={iconIndex} onIndexChange={setIconIndex} />

        {/* ── Inputs ── */}
        <View style={{ paddingHorizontal: 20 }}>
          <TextInput
            label="Circle name"
            value={name}
            onChangeText={(t) => { setName(t); setNameError(null); }}
            mode="outlined"
            maxLength={15}
            outlineStyle={{ borderRadius: 12 }}
            style={{ backgroundColor: subtleBg }}
            right={
              <TextInput.Affix
                text={`${name.length}/15`}
                textStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
              />
            }
          />
          <HelperText type="error" visible={!!nameError}>{nameError ?? " "}</HelperText>

          <TextInput
            label="Description (optional)"
            value={description}
            onChangeText={(t) => { setDescription(t); setDescError(null); }}
            mode="outlined"
            multiline
            numberOfLines={3}
            maxLength={100}
            outlineStyle={{ borderRadius: 12 }}
            style={{ backgroundColor: subtleBg, marginTop: 4 }}
            right={
              <TextInput.Affix
                text={`${description.length}/100`}
                textStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
              />
            }
          />
          <HelperText type="error" visible={!!descError}>{descError ?? " "}</HelperText>

          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            contentStyle={{ paddingVertical: 8 }}
            labelStyle={{ fontWeight: "900", fontSize: 16 }}
            style={{ borderRadius: 16, marginTop: 8 }}
          >
            Save Changes
          </Button>

          <Button
            mode="text"
            onPress={() => router.replace(`/circle-profile/${circleId}`)}
            style={{ marginTop: 6 }}
            labelStyle={{ color: theme.colors.onSurfaceVariant }}
          >
            Cancel
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
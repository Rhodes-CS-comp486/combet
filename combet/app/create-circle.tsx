import React, { useState } from "react";
import { View, ScrollView, Alert } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import IconCarousel, { ICONS } from "@/components/IconCarousel";

const BASE_URL = "http://localhost:3001";

export default function CreateCircle() {
  const router            = useRouter();
  const { theme, isDark } = useAppTheme();
  const insets            = useSafeAreaInsets();

  const [iconIndex, setIconIndex] = useState(0);
  const [name, setName]           = useState("");
  const [description, setDesc]    = useState("");
  const [loading, setLoading]     = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);

  const handleCreate = async () => {
    setNameError(null);
    setDescError(null);
    if (name.length < 5 || name.length > 15) { setNameError("Name must be 5–15 characters"); return; }
    if (description.length > 100)            { setDescError("Description max 100 characters"); return; }

    try {
      setLoading(true);
      const sessionId = await getSessionId();
      if (!sessionId) { Alert.alert("Not authenticated"); return; }

      const res = await fetch(`${BASE_URL}/circles`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId },
        body:    JSON.stringify({ name, description, icon: ICONS[iconIndex] }),
      });

      const data = await res.json();
      if (!res.ok) { Alert.alert(data.error || "Error creating circle"); return; }
      router.replace("/(tabs)/circles");
    } catch {
      Alert.alert("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  const subtleBg = isDark ? "#0F223A" : "#f0f4ff";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop:    insets.top + 16,
          paddingBottom: insets.bottom + 60,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back ── */}
        <View style={{ paddingHorizontal: 20 }}>
          <Button
            icon="arrow-left" mode="text" compact
            onPress={() => router.back()}
            style={{ alignSelf: "flex-start", marginLeft: -8, marginBottom: 8 }}
            labelStyle={{ color: theme.colors.onSurfaceVariant }}
          >
            Back
          </Button>

          <Text variant="headlineMedium" style={{
            color:        theme.colors.onSurface,
            fontWeight:   "900",
            textAlign:    "center",
            marginBottom: 32,
          }}>
            Create a Circle
          </Text>
        </View>

        {/* ── Icon carousel ── */}
        <Text variant="labelLarge" style={{
          color:         theme.colors.onSurfaceVariant,
          fontWeight:    "700",
          letterSpacing: 1,
          textAlign:     "center",
          marginBottom:  16,
        }}>
          PICK AN ICON
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
            outlineStyle={{ borderRadius: 14 }}
            style={{ backgroundColor: subtleBg, marginBottom: 2 }}
            right={
              <TextInput.Affix
                text={`${name.length}/15`}
                textStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
              />
            }
          />
          <HelperText type={nameError ? "error" : "info"} visible style={{ marginBottom: 8 }}>
            {nameError ?? "5–15 characters"}
          </HelperText>

          <TextInput
            label="Description (optional)"
            value={description}
            onChangeText={(t) => { setDesc(t); setDescError(null); }}
            mode="outlined"
            multiline
            numberOfLines={3}
            maxLength={100}
            outlineStyle={{ borderRadius: 14 }}
            style={{ backgroundColor: subtleBg, marginBottom: 2 }}
            right={
              <TextInput.Affix
                text={`${description.length}/100`}
                textStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
              />
            }
          />
          <HelperText type="error" visible={!!descError} style={{ marginBottom: 24 }}>
            {descError ?? " "}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleCreate}
            loading={loading}
            disabled={loading || name.length < 5}
            contentStyle={{ paddingVertical: 10 }}
            labelStyle={{ fontWeight: "900", fontSize: 16, letterSpacing: 0.5 }}
            style={{ borderRadius: 16 }}
          >
            Create Circle
          </Button>

          <Button
            mode="text"
            onPress={() => router.back()}
            style={{ marginTop: 8 }}
            labelStyle={{ color: theme.colors.onSurfaceVariant }}
          >
            Cancel
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
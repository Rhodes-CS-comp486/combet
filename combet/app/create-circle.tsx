import React, { useState } from "react";
import { View, ScrollView, Alert, Switch , TouchableOpacity} from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import IconCarousel, { ICONS } from "@/components/IconCarousel";
import { API_BASE } from "@/constants/api";
import { AVATAR_COLORS } from "@/components/UserAvatar";
import GradientBackground from "@/components/GradientBackground";
import { Filter } from "bad-words";
const filter = new Filter();


export default function CreateCircle() {
  const router            = useRouter();
  const { theme, isDark } = useAppTheme();
  const insets            = useSafeAreaInsets();

  const [iconIndex, setIconIndex] = useState(0);
  const [name, setName]           = useState("");
  const [description, setDesc]    = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [checkingName, setCheckingName] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState("#9dd4be");

  const handleCreate = async () => {
    setNameError(null);
    setDescError(null);
    if (name.length < 5 || name.length > 15) { setNameError("Name must be 5–15 characters"); return; }
    if (description.length > 100)            { setDescError("Description max 100 characters"); return; }

    if (filter.isProfane(name)) { setNameError("Circle name contains inappropriate language."); return; }
    if (description && filter.isProfane(description)) { setDescError("Description contains inappropriate language."); return; }

    try {
      setLoading(true);
      const sessionId = await getSessionId();
      if (!sessionId) { Alert.alert("Not authenticated"); return; }

      const res = await fetch(`${API_BASE}/circles`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId },
        body: JSON.stringify({ name, description, icon: ICONS[iconIndex], icon_color: selectedColor, is_private: isPrivate }),
      });

      const data = await res.json();
      if (res.status === 409) { setNameError(data.error); return; }
      if (!res.ok)            { Alert.alert(data.error || "Error creating circle"); return; }
      router.replace("/(tabs)/circles");
    } catch {
      Alert.alert("Server connection failed");
    } finally {
      setLoading(false);
    }
  };


  const checkNameUnique = async (val: string) => {
    if (val.length < 5) return;
    try {
      setCheckingName(true);
      const res = await fetch(`${API_BASE}/circles/check-name?name=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.taken) setNameError("A circle with that name already exists");
    } catch {}
    finally { setCheckingName(false); }
  };


  return (
  <GradientBackground style={{ paddingHorizontal: 20 }}>
    <ScrollView
      contentContainerStyle={{
        paddingTop:    insets.top + 16,
        paddingBottom: insets.bottom + 60,
      }}

        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back ── */}
        <View>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ alignSelf: "flex-start", paddingHorizontal: 4, paddingVertical: 7, marginBottom: 8 }}
          >
            <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>

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

        <IconCarousel selectedIndex={iconIndex} onIndexChange={setIconIndex} selectedColor={selectedColor}/>

        {/* Color picker */}
        <Text variant="labelLarge" style={{
          color: theme.colors.onSurfaceVariant, fontWeight: "600",
          letterSpacing: 1.5, marginBottom: 12, fontSize: 11, textAlign: "center",
        }}>
          PICK A COLOR
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginBottom: 28 }}>
          {AVATAR_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => setSelectedColor(color)}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: color,
                borderWidth: selectedColor === color ? 3 : 0,
                borderColor: "#fff",
              }}
            />
          ))}
        </View>
        {/* ── Inputs ── */}
        <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 2 }}>
          <TextInput
            label="Circle name"
            value={name}
            onChangeText={(t) => { setName(t); setNameError(null); }}
            onBlur={() => checkNameUnique(name)}
            mode="flat"
            maxLength={15}
            style={{ backgroundColor: "transparent" }}
            underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
            right={
              <TextInput.Affix
                text={`${name.length}/15`}
                textStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
              />
            }
          />
        </View>
        <HelperText type="error" visible={!!nameError} style={{ marginBottom: 8 }}>
          {nameError ?? " "}
        </HelperText>

        <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 2 }}>
          <TextInput
            label="Description (optional)"
            value={description}
            onChangeText={(t) => { setDesc(t); setDescError(null); }}
            mode="flat"
            multiline
            numberOfLines={3}
            maxLength={100}
            style={{ backgroundColor: "transparent" }}
            underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
            right={
              <TextInput.Affix
                text={`${description.length}/100`}
                textStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
              />
            }
          />
        </View>
        <HelperText type="error" visible={!!descError} style={{ marginBottom: 16 }}>
          {descError ?? " "}
        </HelperText>

        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          backgroundColor: "rgba(255,255,255,0.07)",
          borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
          marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons
              name={isPrivate ? "lock-closed" : "globe-outline"}
              size={18}
              color={isPrivate ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontWeight: "600", fontSize: 14 }}>
                {isPrivate ? "Private" : "Public"}
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                {isPrivate ? "Members must request to join" : "Anyone can search and join"}
              </Text>
            </View>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: isDark ? "#2a3a4a" : "#d0d8e8", true: theme.colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading || name.length < 5}
          contentStyle={{ paddingVertical: 10 }}
          labelStyle={{ fontWeight: "400", fontSize: 16 }}
          style={{ borderRadius: 14, marginBottom: 8 }}
        >
          Create Circle
        </Button>

        <Button
          mode="text"
          onPress={() => router.back()}
          style={{ marginTop: 4 }}
          labelStyle={{ color: theme.colors.onSurfaceVariant }}
        >
          Cancel
        </Button>

      </ScrollView>
  </GradientBackground>
  );
}
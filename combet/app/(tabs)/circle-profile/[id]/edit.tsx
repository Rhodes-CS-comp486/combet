import React, { useEffect, useState } from "react";
import { View, ScrollView, Alert, Switch, TouchableOpacity} from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";
import BackHeader from "@/components/Backheader";
import IconCarousel, { ICONS } from "@/components/IconCarousel";
import GradientBackground from "@/components/GradientBackground";
import { API_BASE } from "@/constants/api";
import { AVATAR_COLORS } from "@/components/UserAvatar";

export default function EditCircle() {
  const router            = useRouter();
  const { theme, isDark } = useAppTheme();
  const { id }            = useLocalSearchParams();
  const circleId          = Array.isArray(id) ? id[0] : id;

  const [iconIndex, setIconIndex]     = useState(0);
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate]     = useState(false);
  const [nameError, setNameError]     = useState<string | null>(null);
  const [descError, setDescError]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [ready, setReady]             = useState(false);
  const [selectedColor, setSelectedColor] = useState("#9dd4be");

  useEffect(() => {
    if (!circleId) return;
    fetch(`${API_BASE}/circles/${circleId}`)
      .then((res) => res.json())
      .then((data) => {
        setName(data.name);
        setDescription(data.description || "");
        setIsPrivate(data.is_private ?? false);
        const idx = ICONS.indexOf(data.icon);
        setIconIndex(idx >= 0 ? idx : 0);
        setReady(true);
        setSelectedColor(data.icon_color ?? "#9dd4be");
      })
      .catch(console.error);
  }, [circleId]);

  const checkNameUnique = async (val: string) => {
    if (val.length < 5) return;
    try {
      const res = await fetch(
  `${API_BASE}/circles/check-name?name=${encodeURIComponent(val)}&excludeId=${circleId}`
        );
      const data = await res.json();
      if (data.taken) setNameError("A circle with that name already exists");
    } catch {}
  };

  const handleSave = async () => {
    setNameError(null);
    setDescError(null);
    if (name.length < 5 || name.length > 15) { setNameError("Name must be 5-15 characters"); return; }
    if (description.length > 100)            { setDescError("Description must be under 100 characters"); return; }

    try {
      setLoading(true);
        const res = await fetch(`${API_BASE}/circles/${circleId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, icon: ICONS[iconIndex], icon_color: selectedColor, is_private: isPrivate }),
      });

      if (res.status === 409) { const data = await res.json(); setNameError(data.error); return; }
      if (!res.ok) throw new Error("Failed to update");
      router.replace(`/circle-profile/${circleId}`);
    } catch {
      Alert.alert("Error saving changes");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
      <GradientBackground style={{ paddingHorizontal: 20 }}>
  <BackHeader label="Circle Profile" href={`/circle-profile/${circleId}`} />

  <ScrollView
      contentContainerStyle={{ paddingBottom: 120, paddingTop: 12 }}

        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{
          color:         theme.colors.onSurface,
          fontSize:      28,
          fontWeight:    "300",
          letterSpacing: 0.5,
          marginBottom:  28,
          marginTop:     8,
        }}>
          Edit Circle
        </Text>

        <Text variant="labelLarge" style={{
          color:         theme.colors.onSurfaceVariant,
          fontWeight:    "600",
          letterSpacing: 1.5,
          marginBottom:  16,
          fontSize:      11,
          textAlign:     "center",
        }}>
          CHANGE ICON
        </Text>

        <IconCarousel
          selectedIndex={iconIndex}
          onIndexChange={setIconIndex}
          selectedColor={selectedColor}
        />

        {/* Color picker */}
        <Text variant="labelLarge" style={{
          color: theme.colors.onSurfaceVariant, fontWeight: "600",
          letterSpacing: 1.5, marginBottom: 12, fontSize: 11, textAlign: "center",
          marginTop: 8,
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

        <View style={{ marginTop: 28 }}>
            <View style={{
              backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
              borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 2,
            }}>
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

          <View style={{
              backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
              borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 2,
            }}>
              <TextInput
                label="Description (optional)"
                value={description}
                onChangeText={(t) => { setDescription(t); setDescError(null); }}
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
            flexDirection:     "row",
            alignItems:        "center",
            justifyContent:    "space-between",
            borderRadius:      14,
            paddingHorizontal: 16,
            paddingVertical:   14,
            marginBottom:      32,
            borderWidth:       1,
              backgroundColor:   "rgba(255,255,255,0.07)",
            borderColor:       "rgba(255,255,255,0.12)",
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons
                name={isPrivate ? "lock-closed" : "globe-outline"}
                size={18}
                color={isPrivate ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <View>
                <Text style={{ color: theme.colors.onSurface, fontWeight: "600", fontSize: 14 }}>
                  {isPrivate ? "Private" : "Public"}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
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
              onPress={handleSave}
              loading={loading}
              disabled={loading || !!nameError}
              contentStyle={{ paddingVertical: 8 }}
              labelStyle={{ fontWeight: "400", fontSize: 15 }}
              style={{ borderRadius: 14, marginBottom: 8, }}
            >
              Save Changes
            </Button>

          <Button
            mode="text"
            onPress={() => router.replace(`/circle-profile/${circleId}`)}
            labelStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}
          >
            Cancel
          </Button>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}
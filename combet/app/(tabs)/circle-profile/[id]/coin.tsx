import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Text, TextInput, Button, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import PageHeader from "@/components/PageHeader";
import GradientBackground from "@/components/GradientBackground";
import { API_BASE } from "@/constants/api";
import { Filter } from "bad-words";
const filter = new Filter();

const COIN_COLORS = [
  "#FF0A54", "#FF4D6D", "#FF006E", "#FB5607", "#FFD60A",
  "#2DC653", "#06D6A0", "#00B4D8", "#3A86FF", "#7B2FBE", "#8338EC",
];

const COIN_ICONS = [
  "trophy", "flash", "flame", "skull", "star", "diamond",
  "football", "basketball", "baseball", "american-football",
  "tennisball", "medal", "ribbon", "shield", "rocket",
  "hammer", "beer", "bonfire", "planet", "bandage",
];

type Coin = {
  coin_name: string;
  coin_symbol: string;
  coin_description: string;
  coin_color: string;
  coin_icon: string;
};

export default function CoinScreen() {
  const { theme } = useAppTheme();
  const params    = useLocalSearchParams();
  const circleId  = params.id as string;

  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [coin,         setCoin]         = useState<Coin | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const [name,        setName]        = useState("");
  const [symbol,      setSymbol]      = useState("");
  const [description, setDescription] = useState("");
  const [color,       setColor]       = useState(COIN_COLORS[4]);
  const [icon,        setIcon]        = useState(COIN_ICONS[0]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void loadCoin();
  }, [circleId]));

  const loadCoin = async () => {
    setLoading(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/circles/${circleId}/coin`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.coin_name) {
          setCoin(data);
          setName(data.coin_name);
          setSymbol(data.coin_symbol ?? "");
          setDescription(data.coin_description ?? "");
          setColor(data.coin_color ?? COIN_COLORS[4]);
          setIcon(data.coin_icon ?? COIN_ICONS[0]);
          setAcknowledged(true);
        }
      }
    } catch (err) {
      console.error("Load coin error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !symbol.trim()) {
      Alert.alert("Missing fields", "Please add a name and symbol.");
      return;
    }

    if (
      filter.isProfane(name.trim().replace(/[^a-zA-Z\s]/g, " ")) ||
      filter.isProfane(symbol.trim().replace(/[^a-zA-Z\s]/g, " ")) ||
      (description && filter.isProfane(description.trim().replace(/[^a-zA-Z\s]/g, " ")))
    ) {
      setErrorMsg("Please remove inappropriate language before saving.");
      return;
    }

    setSaving(true);
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/circles/${circleId}/coin`, {
        method: coin ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "x-session-id": sessionId ?? "" },
        body: JSON.stringify({
          coin_name:        name.trim(),
          coin_symbol:      symbol.trim().toUpperCase(),
          coin_description: description.trim(),
          coin_color:       color,
          coin_icon:        icon,
        }),
      });
      const responseData = await res.json();
        console.log("COIN SAVE RESPONSE:", res.status, responseData);
        if (res.ok) {
          setCoin(responseData);
          router.back();
        } else {
          Alert.alert("Error", responseData.error || "Could not save coin");
        }
    } catch {
      Alert.alert("Network Error", "Could not connect to server");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
      const confirmed =
        typeof window !== "undefined"
          ? window.confirm("This will remove the coin from your circle. Member balances will be lost. Are you sure?")
          : await new Promise<boolean>((resolve) =>
              Alert.alert(
                "Delete Coin",
                "This will remove the coin from your circle. Member balances will be lost. Are you sure?",
                [
                  { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                  { text: "Delete", style: "destructive", onPress: () => resolve(true) },
                ]
              )
            );

      if (!confirmed) return;

      try {
        const sessionId = await getSessionId();
        const res = await fetch(`${API_BASE}/circles/${circleId}/coin`, {
          method: "DELETE",
          headers: { "x-session-id": sessionId ?? "" },
        });
        const deleteData = await res.json().catch(() => ({}));
        console.log("COIN DELETE RESPONSE:", res.status, deleteData);
        if (res.ok) {
          setCoin(null);
          setName(""); setSymbol(""); setDescription("");
          setColor(COIN_COLORS[4]); setIcon(COIN_ICONS[0]);
          setAcknowledged(false);
          router.back();
        } else {
          Alert.alert("Error", deleteData.error || "Could not delete coin");
        }
      } catch {
        Alert.alert("Network Error", "Could not connect to server");
      }
    };

  if (loading) {
    return (
      <GradientBackground style={{ paddingHorizontal: 20 }}>
        <PageHeader title="Circle Coin" />
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      </GradientBackground>
    );
  }

  const coinBg     = color + "1a";
  const coinBorder = color + "44";
  const canSave    = name.trim().length > 0 && symbol.trim().length > 0 && acknowledged;

  return (
    <GradientBackground style={{ paddingHorizontal: 20 }}>
      <PageHeader title="Circle Coin" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >

        {/* ── PREVIEW ── */}
        <View style={{
          alignItems: "center", marginBottom: 24,
          backgroundColor: "rgba(255,255,255,0.09)",
          borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
          borderRadius: 20, padding: 24,
        }}>
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: coinBg,
            borderWidth: 2, borderColor: coinBorder,
            alignItems: "center", justifyContent: "center",
            marginBottom: 12,
          }}>
            <Ionicons name={icon as any} size={38} color={color} />
          </View>

          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={20}
            mode="flat"
            placeholder="Coin Name"
            style={{
              backgroundColor: "transparent",
              fontSize: 18,
              fontWeight: "600",
              textAlign: "center",
              minWidth: 120,
            }}
            underlineColor="transparent"
            activeUnderlineColor={color}
            selectionColor={color}
            theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: color } }}
            textColor={theme.colors.onSurface}
          />

          <Text style={{
            fontFamily: "monospace", fontSize: 12,
            color: color, letterSpacing: 2,
            marginTop: 2, textTransform: "uppercase",
          }}>
            {symbol.trim() || "SYM"}
          </Text>

          {description.trim() ? (
            <Text style={{
              fontSize: 12, color: theme.colors.onSurfaceVariant,
              textAlign: "center", marginTop: 8, lineHeight: 18,
              paddingHorizontal: 12,
            }}>
              {description}
            </Text>
          ) : null}
        </View>

        {/* ── DISCLAIMER ── */}
        {!acknowledged ? (
          <TouchableOpacity
            onPress={() => setAcknowledged(true)}
            activeOpacity={0.8}
            style={{
              flexDirection: "row", alignItems: "flex-start", gap: 12,
              backgroundColor: "rgba(55,134,255,0.08)",
              borderWidth: 1, borderColor: "rgba(55,134,255,0.25)",
              borderRadius: 14, padding: 14, marginBottom: 20,
            }}
          >
            <View style={{
              width: 20, height: 20, borderRadius: 4,
              borderWidth: 1.5, borderColor: "rgba(55,134,255,0.5)",
              alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: 1,
            }} />
            <Text style={{ flex: 1, fontSize: 12, color: "rgba(55,134,255,0.9)", lineHeight: 18 }}>
              Coins are managed entirely by you as circle creator — Combet doesn't handle any real-world value they may represent. Only bet with people you trust. Tap to acknowledge.
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{
            flexDirection: "row", alignItems: "flex-start", gap: 10,
            backgroundColor: "rgba(55,134,255,0.06)",
            borderWidth: 1, borderColor: "rgba(55,134,255,0.15)",
            borderRadius: 14, padding: 12, marginBottom: 20,
          }}>
            <Ionicons name="checkmark-circle" size={16} color="#3A86FF" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, color: "rgba(55,134,255,0.7)", lineHeight: 18 }}>
              Coins are managed by you. Combet tracks balances only — real-world value is between you and your circle.
            </Text>
          </View>
        )}

        {/* ── FORM ── */}
        <View style={{
          backgroundColor: "rgba(255,255,255,0.09)",
          borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
          borderRadius: 20, padding: 20, marginBottom: 16,
        }}>
          <Text style={{
            fontSize: 11, fontWeight: "500", letterSpacing: 0.8,
            textTransform: "uppercase", color: theme.colors.onSurfaceVariant,
            marginBottom: 14,
          }}>
            Coin Details
          </Text>

          <View style={{
            backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
            borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 10,
          }}>
            <TextInput
              label="Symbol"
              value={symbol}
              onChangeText={(t) => setSymbol(t.toUpperCase())}
              maxLength={5}
              mode="flat"
              style={{ backgroundColor: "transparent" }}
              underlineColor="transparent"
              activeUnderlineColor={theme.colors.primary}
              theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
              placeholder="e.g. FRI"
              autoCapitalize="characters"
            />
          </View>

          <View style={{
            backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
            borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
          }}>
            <TextInput
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              maxLength={160}
              mode="flat"
              multiline
              numberOfLines={3}
              style={{ backgroundColor: "transparent" }}
              underlineColor="transparent"
              activeUnderlineColor={theme.colors.primary}
              theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
              placeholder="e.g. 1 chip = $1. Venmo @you to buy in."
            />
          </View>
          <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
            Visible to all circle members. Use this to explain what the coin represents.
          </Text>
        </View>

        {/* ── COLOR ── */}
        <View style={{
          backgroundColor: "rgba(255,255,255,0.09)",
          borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
          borderRadius: 20, padding: 20, marginBottom: 16,
        }}>
          <Text style={{
            fontSize: 11, fontWeight: "500", letterSpacing: 0.8,
            textTransform: "uppercase", color: theme.colors.onSurfaceVariant,
            marginBottom: 14,
          }}>
            Color
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {COIN_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                activeOpacity={0.8}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: c,
                  borderWidth: color === c ? 2.5 : 0,
                  borderColor: "#fff",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                {color === c && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── ICON ── */}
        <View style={{
          backgroundColor: "rgba(255,255,255,0.09)",
          borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
          borderRadius: 20, padding: 20, marginBottom: 24,
        }}>
          <Text style={{
            fontSize: 11, fontWeight: "500", letterSpacing: 0.8,
            textTransform: "uppercase", color: theme.colors.onSurfaceVariant,
            marginBottom: 14,
          }}>
            Icon
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {COIN_ICONS.map((ic) => (
              <TouchableOpacity
                key={ic}
                onPress={() => setIcon(ic)}
                activeOpacity={0.8}
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: icon === ic ? coinBg : "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: icon === ic ? coinBorder : "rgba(255,255,255,0.1)",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Ionicons name={ic as any} size={20} color={icon === ic ? color : theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

          {errorMsg && (
              <Text style={{ color: "#e87060", marginBottom: 8, textAlign: "center", fontSize: 13 }}>
                {errorMsg}
              </Text>
            )}


        {/* ── ACTIONS ── */}
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={!canSave || saving}
          style={{ borderRadius: 14, marginBottom: 10 }}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: "600", fontSize: 15 }}
        >
          {coin ? "Save Changes" : "Create Coin"}
        </Button>

        {coin && (
          <Button
            mode="outlined"
            onPress={handleDelete}
            style={{ borderRadius: 14, borderColor: "rgba(232,112,96,0.4)" }}
            labelStyle={{ color: "#e87060", fontWeight: "400" }}
          >
            Delete Coin
          </Button>
        )}

      </ScrollView>
    </GradientBackground>
  );
}
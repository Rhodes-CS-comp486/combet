import React, { useEffect, useRef, useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Pressable, Alert,
} from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

// ── Palette (mirrors ConfirmModal.tsx) ───────────────────────────────────────
const TEAL          = "#9dd4be";
const TEAL_DIM      = "rgba(157,212,190,0.25)";
const DARK_BG       = "#3c4c5b";
const SURFACE       = "rgba(255,255,255,0.06)";
const BORDER        = "rgba(255,255,255,0.10)";
const TEXT          = "#ffffff";
const TEXT_MUTED    = "rgba(255,255,255,0.45)";
const DANGER        = "#e87060";
const DANGER_DIM    = "rgba(232,112,96,0.18)";
const DANGER_BORDER = "rgba(232,112,96,0.35)";

const STEPS = [1, 5, 10, 50];

type Props = {
  visible:    boolean;
  onDismiss:  () => void;
  onSave:     (newBalance: number) => Promise<void>;
  member:     { username: string; coin_balance?: number } | null;
  coinName:   string;
  coinColor:  string;
  coinIcon:   string;
  coinSymbol: string;
};

export default function CoinEditModal({
  visible, onDismiss, onSave,
  member, coinName, coinColor, coinIcon, coinSymbol,
}: Props) {
  const [balance, setBalance] = useState(0);
  const [saving,  setSaving]  = useState(false);

  const scale   = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (member) setBalance(member.coin_balance ?? 0);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1, duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1, damping: 18, stiffness: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0, duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
      scale.setValue(0.92);
    }
  }, [visible]);

  const adjust = (delta: number) => setBalance((prev) => Math.max(0, prev + delta));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(balance);
      onDismiss();
    } catch {
      Alert.alert("Error", "Could not update balance");
    } finally {
      setSaving(false);
    }
  };

  const coinBg     = coinColor + "1a";
  const coinBorder = coinColor + "44";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <View style={styles.backdropFill} />
        </Animated.View>
      </Pressable>

      {/* Sheet */}
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { opacity, transform: [{ scale }] }]}>

          {/* Icon badge */}
          <View style={[styles.iconBadge, { backgroundColor: coinBg, borderColor: coinBorder }]}>
            <Ionicons name={coinIcon as any} size={28} color={coinColor} />
          </View>

          <Text style={styles.title}>Edit Balance</Text>
          {member && <Text style={styles.message}>@{member.username}</Text>}

          {/* Balance display */}
          <View style={[styles.balanceBox, { backgroundColor: coinBg, borderColor: coinBorder }]}>
            <Text style={[styles.balanceNum, { color: coinColor }]}>{balance}</Text>
            <Text style={[styles.balanceLabel, { color: coinColor + "99" }]}>
              {coinSymbol || coinName}
            </Text>
          </View>

          {/* Subtract row */}
          <View style={styles.stepRow}>
            {STEPS.map((step) => (
              <TouchableOpacity
                key={`-${step}`}
                onPress={() => adjust(-step)}
                style={[styles.stepBtn, { backgroundColor: DANGER_DIM, borderColor: DANGER_BORDER }]}
                activeOpacity={0.6}
              >
                <Text style={{ color: DANGER, fontSize: 12, fontWeight: "600" }}>−{step}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Add row */}
          <View style={[styles.stepRow, { marginTop: 8 }]}>
            {STEPS.map((step) => (
              <TouchableOpacity
                key={`+${step}`}
                onPress={() => adjust(step)}
                style={[styles.stepBtn, { backgroundColor: coinBg, borderColor: coinBorder }]}
                activeOpacity={0.6}
              >
                <Text style={{ color: coinColor, fontSize: 12, fontWeight: "600" }}>+{step}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onDismiss}
              activeOpacity={0.6}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: coinBg, borderColor: coinBorder },
                saving && { opacity: 0.6 },
              ]}
              onPress={saving ? undefined : handleSave}
              activeOpacity={0.6}
            >
              {saving
                ? <ActivityIndicator size={16} color={coinColor} />
                : <Text style={[styles.confirmText, { color: coinColor }]}>Save</Text>
              }
            </TouchableOpacity>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:     { ...StyleSheet.absoluteFillObject },
  backdropFill: { flex: 1, backgroundColor: "rgba(4,12,20,0.5)" },
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    width: "100%", maxWidth: 380,
    backgroundColor: DARK_BG,
    borderRadius: 20, borderWidth: 1, borderColor: TEAL_DIM,
    overflow: "hidden", alignItems: "center",
    paddingTop: 28, paddingBottom: 24, paddingHorizontal: 24,
  },
  iconBadge: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  title: {
    color: TEXT, fontSize: 17, fontWeight: "700",
    textAlign: "center", marginBottom: 4, letterSpacing: 0.1,
  },
  message: {
    color: TEXT_MUTED, fontSize: 13, textAlign: "center", marginBottom: 16,
  },
  balanceBox: {
    flexDirection: "row", alignItems: "baseline", gap: 6,
    borderRadius: 14, borderWidth: 1,
    paddingVertical: 12, paddingHorizontal: 24, marginBottom: 16,
  },
  balanceNum:   { fontSize: 32, fontWeight: "700" },
  balanceLabel: { fontSize: 14, fontWeight: "500" },
  stepRow:  { flexDirection: "row", gap: 8, width: "100%" },
  stepBtn: {
    flex: 1, alignItems: "center", paddingVertical: 9,
    borderRadius: 10, borderWidth: 1,
  },
  divider: {
    width: "100%", height: 1, backgroundColor: BORDER,
    marginTop: 24, marginBottom: 16,
  },
  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  btn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  cancelBtn:   { backgroundColor: SURFACE, borderColor: BORDER },
  cancelText:  { color: TEXT_MUTED, fontSize: 14, fontWeight: "600" },
  confirmText: { fontSize: 14, fontWeight: "700" },
});
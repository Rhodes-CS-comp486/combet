import React, { useEffect, useRef } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ── Palette (mirrors Scratchcard.tsx) ────────────────────────────────────────
const TEAL        = "#9dd4be";
const TEAL_DIM    = "rgba(157,212,190,0.25)";
const TEAL_GLOW   = "rgba(157,212,190,0.07)";
const DARK_BG = "#3c4c5b";
const DANGER      = "#e87060";
const DANGER_DIM  = "rgba(232,112,96,0.18)";
const DANGER_BORDER = "rgba(232,112,96,0.35)";
const SURFACE     = "rgba(255,255,255,0.06)";
const BORDER      = "rgba(255,255,255,0.10)";
const TEXT        = "#ffffff";
const TEXT_MUTED  = "rgba(255,255,255,0.45)";

export type ConfirmIcon =
  | "ban-outline"          // block
  | "exit-outline"         // leave circle
  | "people-outline"       // join circle
  | "add-circle-outline"   // create circle
  | "receipt-outline"      // add bet
  | "trash-outline"        // delete
  | "lock-closed-outline"  // privacy
  | "checkmark-circle-outline" // generic confirm
  | "alert-circle-outline";    // warning

interface Props {
  visible:      boolean;
  title:        string;
  message?:     string;
  confirmLabel?: string;
  cancelLabel?:  string;
  destructive?:  boolean;
  loading?:      boolean;
  icon?:         ConfirmIcon;
  onConfirm:    () => void;
  onCancel:     () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  destructive  = false,
  loading      = false,
  icon,
  onConfirm,
  onCancel,
}: Props) {
  const scale   = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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

  const accentColor  = destructive ? DANGER     : TEAL;
  const accentDim    = destructive ? DANGER_DIM  : TEAL_GLOW;
  const accentBorder = destructive ? DANGER_BORDER : TEAL_DIM;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <View style={styles.backdropFill} />
        </Animated.View>
      </Pressable>

      {/* Sheet */}
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, { opacity, transform: [{ scale }] }]}
        >
          {/* Icon badge */}
          {icon && (
            <View style={[styles.iconBadge, { backgroundColor: accentDim, borderColor: accentBorder }]}>
              <Ionicons name={icon} size={28} color={accentColor} />
            </View>
          )}

          {/* Text */}
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              activeOpacity={0.6}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.confirmBtn,
                { backgroundColor: accentDim, borderColor: accentBorder },
                loading && { opacity: 0.6 },
              ]}
              onPress={loading ? undefined : onConfirm}
              activeOpacity={0.6}
            >
              <Text style={[styles.confirmText, { color: accentColor }]}>
                {loading ? "…" : confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropFill: {
    flex: 1,
    backgroundColor: "rgba(4,12,20,0.5)",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: DARK_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TEAL_DIM,
    overflow: "hidden",
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },

  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  message: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: BORDER,
    marginTop: 24,
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cancelBtn: {
    backgroundColor: SURFACE,
    borderColor: BORDER,
  },
  cancelText: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: "600",
  },
  confirmBtn: {
    // background + border set inline (varies by destructive)
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
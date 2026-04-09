import React, { useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Easing, Platform, PanResponder,
} from "react-native";

interface Props {
  prize: number | null;
  onRevealComplete: () => void;
}

const TEAL = "#9dd4be";
const DARK_TEAL = "#0d2a22";
const CARD_HEIGHT = 180;

export default function ScratchCard({ prize, onRevealComplete }: Props) {
  const [revealed, setRevealed] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const hasRevealed = useRef(false);

  function reveal() {
    if (hasRevealed.current) return;
    hasRevealed.current = true;

    Animated.timing(opacity, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      setRevealed(true);
      onRevealComplete();
    });
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !hasRevealed.current,
      onMoveShouldSetPanResponder: () => !hasRevealed.current,
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) > 50 && !hasRevealed.current) reveal();
      },
    })
  ).current;

  const prizeColor = prize === 100 ? "#e87060"
    : prize === 50 ? "#f0c070"
    : prize === 20 ? "#c97ab2"
    : prize === 10 ? "#7b8fc4"
    : TEAL;

  return (
    <View style={styles.container}>

      <TouchableOpacity
        activeOpacity={1}
        onPress={Platform.OS === "web" ? reveal : undefined}
        style={styles.card}
      >
        <View style={{ flex: 1 }} {...panResponder.panHandlers}>

          {/* Back — prize always rendered underneath */}
          <View style={[styles.face, styles.back]}>
            <Text style={styles.youWon}>you won</Text>
            <Text style={[styles.prizeAmount, { color: prizeColor }]}>+{prize}</Text>
            <Text style={styles.coinsLabel}>coins</Text>
          </View>

          {/* Front — dark overlay that fades out */}
            <Animated.View style={[styles.face, styles.front, { opacity }]}>
  <View style={{
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(157,212,190,0.1)",
    borderWidth: 2, borderColor: "rgba(157,212,190,0.3)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  }}>
    <Text style={{ color: "#9dd4be", fontSize: 36, fontWeight: "700" }}>?</Text>
  </View>
  <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>
    {Platform.OS === "web" ? "click to reveal" : "swipe to reveal"}
  </Text>
</Animated.View>


        </View>
      </TouchableOpacity>

      {/* Web: button fallback */}
      {Platform.OS === "web" && !revealed && (
        <TouchableOpacity style={styles.btn} onPress={reveal}>
          <Text style={styles.btnText}>Reveal</Text>
        </TouchableOpacity>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 16, width: "100%" },
  card: {
    width: "100%",
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(157,212,190,0.25)",
    backgroundColor: "rgba(157,212,190,0.07)",
  },
  face: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },
  front: {
    backgroundColor: "rgba(14,26,38,0.97)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  back: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  hatchLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(157,212,190,0.07)",
  },
  scratchHint: { alignItems: "center", gap: 6, marginBottom: 16 },
  scratchIcon: { color: "rgba(157,212,190,0.5)", fontSize: 13, letterSpacing: 1 },
  scratchLabel: { color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  possibleRow: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    gap: 4,
  },
  dot: { color: "rgba(255,255,255,0.15)", fontSize: 11, marginHorizontal: 2 },
  possibleVal: { fontSize: 12, fontWeight: "600" },
  youWon: { color: "rgba(255,255,255,0.38)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  prizeAmount: { fontSize: 52, fontWeight: "700", letterSpacing: -1 },
  coinsLabel: { color: "rgba(255,255,255,0.38)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  btn: {
    width: "100%", paddingVertical: 14, borderRadius: 12,
    backgroundColor: TEAL, alignItems: "center",
  },
  btnText: { color: DARK_TEAL, fontWeight: "700", fontSize: 16 },
});
import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/context/ThemeContext";

export const ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "people",
  "flame",
  "football",
  "book",
  "fitness",
  "trophy",
  "cash",
  "game-controller",
];

interface Props {
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  selectedColor?: string;
}

export default function IconCarousel({ selectedIndex, onIndexChange , selectedColor}: Props) {
  const { theme, isDark } = useAppTheme();

  const canGoLeft  = selectedIndex > 0;
  const canGoRight = selectedIndex < ICONS.length - 1;

  const prevIcon = canGoLeft  ? ICONS[selectedIndex - 1] : null;
  const currIcon = ICONS[selectedIndex];
  const nextIcon = canGoRight ? ICONS[selectedIndex + 1] : null;

  const arrowBg     = isDark ? "rgba(46,108,246,0.18)" : "rgba(46,108,246,0.12)";
  const arrowColor  = theme.colors.primary;
  const disabledBg  = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const disabledClr = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";

  return (
    <View>
      {/* ── Three-icon row ── */}
      <View style={{
        flexDirection:  "row",
        alignItems:     "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        marginBottom:   6,
      }}>

        {/* ← arrow + prev icon */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={() => canGoLeft && onIndexChange(selectedIndex - 1)}
            activeOpacity={0.7}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: canGoLeft ? arrowBg : disabledBg,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-back" size={20}
              color={canGoLeft ? arrowColor : disabledClr} />
          </TouchableOpacity>

          {/* Previous icon peeking */}
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: selectedColor ?? theme.colors.primary,
            alignItems: "center", justifyContent: "center",
            opacity: prevIcon ? 0.3 : 0,
          }}>
            {prevIcon && <Ionicons name={prevIcon} size={30} color="white" />}
          </View>
        </View>

        {/* Center — current icon (large) */}
        <View style={{
          width:           130,
          height:          130,
          borderRadius:    65,
          backgroundColor: selectedColor ?? theme.colors.primary,
          alignItems:      "center",
          justifyContent:  "center",
          marginHorizontal: 12,
          shadowColor: selectedColor ?? theme.colors.primary,
          shadowOpacity:   0.55,
          shadowRadius:    22,
          shadowOffset:    { width: 0, height: 8 },
          elevation:       14,
        }}>
          <Ionicons name={currIcon} size={54} color="white" />
        </View>

        {/* Next icon peeking + → arrow */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* Next icon peeking */}
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: selectedColor ?? theme.colors.primary,
            alignItems: "center", justifyContent: "center",
            opacity: nextIcon ? 0.3 : 0,
          }}>
            {nextIcon && <Ionicons name={nextIcon} size={30} color="white" />}
          </View>

          <TouchableOpacity
            onPress={() => canGoRight && onIndexChange(selectedIndex + 1)}
            activeOpacity={0.7}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: canGoRight ? arrowBg : disabledBg,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-forward" size={20}
              color={canGoRight ? arrowColor : disabledClr} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Dot indicators ── */}
      <View style={{
        flexDirection: "row", justifyContent: "center",
        gap: 6, marginTop: 16, marginBottom: 28,
      }}>
        {ICONS.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onIndexChange(i)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <View style={{
              width:           i === selectedIndex ? 20 : 6,
              height:          6,
              borderRadius:    3,
              backgroundColor: i === selectedIndex
                ? theme.colors.primary
                : (isDark ? "#2a3f58" : "#b0bdd0"),
            }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
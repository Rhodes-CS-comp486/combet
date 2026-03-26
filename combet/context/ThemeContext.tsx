import React, { createContext, useContext, useState, useEffect } from "react";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Brand colours ────────────────────────────────────────────────────────────

const TEAL = "#9dd4be";
const TEAL_DARK = "#7bbfaa";

// ─── Custom dark theme ────────────────────────────────────────────────────────
export const CombetDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary:          TEAL,
    onPrimary:        "#0d2a22",
    primaryContainer: "rgba(157, 212, 190, 0.15)",
    background:       "#18293a",
        surface:          "rgba(255,255,255,0.09)",
        onSurface:        "rgba(255,255,255,0.92)",
        surfaceVariant:   "rgba(255,255,255,0.06)",
        onSurfaceVariant: "rgba(255,255,255,0.38)",
        outline:          "rgba(255,255,255,0.11)",
        error: "#ef4444",
        elevation: {
          level0: "transparent",
          level1: "rgba(255,255,255,0.09)",
          level2: "rgba(255,255,255,0.09)",
          level3: "rgba(255,255,255,0.11)",
          level4: "rgba(255,255,255,0.12)",
          level5: "rgba(255,255,255,0.14)",
        },

  },
};

// ─── Custom light theme ───────────────────────────────────────────────────────
export const CombetLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary:          TEAL_DARK,
    onPrimary:        "#ffffff",
    primaryContainer: "#dce8ff",
    background:       "#f0f6f4",
    surface:          "#ffffff",
    surfaceVariant:   "#e8edf5",
    onSurface:        "#0a1929",
    onSurfaceVariant: "#4a5568",
    outline:          "#c5d0e0",
    error:            "#E53935",
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────
type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  theme: MD3Theme;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark:      true,
  toggleTheme: () => {},
  theme:       CombetDarkTheme,
});

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  // Persist preference across app restarts

    useEffect(() => {
  AsyncStorage.getItem("combet_theme_v2").then((val) => {
    if (val !== null) setIsDark(val === "dark");
  });
}, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem("combet_theme_v2", next ? "dark" : "light");
      return next;
    });
  };

  const theme = isDark ? CombetDarkTheme : CombetLightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const DesignTokens = {
  gold:    "#f0c070",
  optionColors: [
    { bar: "#9dd4be", btnText: "#aaddc8", btnBorder: "rgba(157,212,190,0.18)", btn: "rgba(157,212,190,0.12)" },
    { bar: "#7b8fc4", btnText: "#a0b0d8", btnBorder: "rgba(123,143,196,0.20)", btn: "rgba(123,143,196,0.12)" },
    { bar: "#f0c070", btnText: "#f5d28a", btnBorder: "rgba(240,192,112,0.20)", btn: "rgba(240,192,112,0.12)" },
    { bar: "#c97ab2", btnText: "#daa0cc", btnBorder: "rgba(201,122,178,0.20)", btn: "rgba(201,122,178,0.12)" },
  ],
  card: {
    background:   "rgba(255,255,255,0.09)",
    border:       "rgba(255,255,255,0.13)",
    borderRadius: 20,
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAppTheme() {
  return useContext(ThemeContext);
}
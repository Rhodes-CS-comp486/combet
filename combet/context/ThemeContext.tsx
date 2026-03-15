import React, { createContext, useContext, useState, useEffect } from "react";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Brand colours ────────────────────────────────────────────────────────────
const BLUE = "#2563eb";
const BLUE_DARK = "#1d4ed8"; // slightly deeper for dark mode surfaces

// ─── Custom dark theme ────────────────────────────────────────────────────────
export const CombetDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary:          BLUE,
    onPrimary:        "#ffffff",
    primaryContainer: BLUE_DARK,
    background:       "#0a0e17",
        surface:          "#111827",
        surfaceVariant:   "#1a2035",
        elevation: {
          level0: "transparent",
          level1: "#111827",
          level2: "#141d2e",
          level3: "#172235",
          level4: "#1a263c",
          level5: "#1e2d45",
        },
        onSurface:        "#e8edf8",
        onSurfaceVariant: "#6b7a99",
        outline:          "#1e2535",
        error:            "#ef4444",
  },
};

// ─── Custom light theme ───────────────────────────────────────────────────────
export const CombetLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary:          BLUE,
    onPrimary:        "#ffffff",
    primaryContainer: "#dce8ff",
    background:       "#f0f4ff",
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
    AsyncStorage.getItem("combet_theme").then((val) => {
      if (val !== null) setIsDark(val === "dark");
    });
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem("combet_theme", next ? "dark" : "light");
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

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAppTheme() {
  return useContext(ThemeContext);
}
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { View } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { JSX } from "react";
import { LinearGradient } from "expo-linear-gradient";

import CombetHeader from "@/components/CombetHeader";
import { ThemeContextProvider, useAppTheme } from "@/context/ThemeContext";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Inner layout reads from ThemeContext
function AppLayout(): JSX.Element {
  const { theme, isDark } = useAppTheme();
  const pathname = usePathname();

  const isAuthScreen =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  return (
    <PaperProvider theme={theme}>
        <LinearGradient
        colors={["#2c5364", "#1a3040", "#141f2d"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}
      >
        {!isAuthScreen && <CombetHeader />}

        <View style={{ flex: 1, backgroundColor: "transparent"}}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
                animation: "none"
            }}
          >
            <Stack.Screen
                name="(tabs)"
                options={{
                    contentStyle: {backgroundColor: "transparent"}
                }}
            />

            <Stack.Screen
              name="create-circle"
              options={{
                presentation: "transparentModal",
                animation: "fade",
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
              }}
            />


          </Stack>
        </View>
        </LinearGradient>

      <StatusBar style={isDark ? "light" : "dark"} />
    </PaperProvider>
  );
}

// Outer layout provides the theme context
export default function RootLayout(): JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeContextProvider>
        <AppLayout />
      </ThemeContextProvider>
    </SafeAreaProvider>
  );
}
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { View } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { JSX } from "react";

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
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {!isAuthScreen && <CombetHeader />}

        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" />

            <Stack.Screen
              name="create-circle"
              options={{
                presentation: "transparentModal",
                animation: "fade",
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
              }}
            />

            <Stack.Screen
              name="add-bet"
              options={{
                headerShown: true,
                title: "Create Bet",
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.onSurface,
                headerTitleStyle: { fontWeight: "600" },
              }}
            />
          </Stack>
        </View>
      </View>

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
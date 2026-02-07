import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import CombetHeader from '@/components/CombetHeader';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        {/* Global App Header */}
        <CombetHeader />

        {/* App Navigation */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />

          {/* Example modal route (keep, don’t overuse yet) */}
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal' }}
          />

        </Stack>
      </View>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}


/*
// changed for header
    return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}*/


import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import CombetHeader from '@/components/CombetHeader';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {JSX} from "react";


export const unstable_settings = {
  anchor: '(tabs)',
};


export default function RootLayout(): JSX.Element {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>

       <View style={{ flex: 1, backgroundColor: '#091C32' }}>

  <CombetHeader />
  <View style={{ flex: 1, marginTop: 0 }}>
    <Stack
        screenOptions={{
            headerShown: false,
            contentStyle: {
                backgroundColor: '#091C32',
            },
        }}
    >

      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  </View>
</View>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
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


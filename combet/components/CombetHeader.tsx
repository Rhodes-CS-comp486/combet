// combet header with inbox and coin display

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {JSX} from "react";


export default function CombetHeader(): JSX.Element {
  const coinBalance = 120; // later implement coin function here
  const insets = useSafeAreaInsets();

  return (
    // OUTER container paints the safe area
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      {/* navbar */}
      <View style={styles.container}>
        {/* Left */}
        <TouchableOpacity
          style={styles.left}
          onPress={() => router.push('/inbox')}
        >
          <Ionicons name="menu" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Center */}
        <Text style={styles.title}>COMBET</Text>

        {/* Right */}
        <View style={styles.right}>
          <Ionicons name="ellipse-outline" size={20} color="#FFFFFF" />
          <Text style={styles.balance}>{coinBalance}</Text>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  // Paints behind the notch / status bar
  safeArea: {
    backgroundColor: '#0f223a',
  },

  // Actual header height (do NOT include safe area here)
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#0f223a',
    borderBottomWidth: 1,
    borderColor: '#0f223a',
  },

  left: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  right: {
    minWidth: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },

  title: {

    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
      color: '#FFFFFF',
  },

  balance: {
    fontSize: 14,
    fontWeight: '600',
      color: '#FFFFFF',
  },
});


// combet header with inbox and coin display

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function CombetHeader() {
  // Temporary static balance
  const coinBalance = 120;

  return (
    <View style={styles.container}>
      {/* Left: Inbox */}
      <TouchableOpacity
        style={styles.left}
        onPress={() => router.push('/inbox')}
      >
        <Ionicons name="menu" size={26} color="#000" />
      </TouchableOpacity>

      {/* Center: App Title */}
      <Text style={styles.title}>COMBET</Text>

      {/* Right: Coin Balance (status, not button) */}
      <View style={styles.right}>
        <Ionicons name="ellipse-outline" size={20} color="#000" />
        <Text style={styles.balance}>{coinBalance}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e5e5e5',
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
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  balance: {
    fontSize: 14,
    fontWeight: '600',
  },
});

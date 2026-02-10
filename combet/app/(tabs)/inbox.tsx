import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function InboxScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>Close</Text>
        </TouchableOpacity>
      </View>

      {/* Empty state */}
      <View style={styles.body}>
        <Text style={styles.emptyText}>
          You have no notifications yet.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#051120',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
      backgroundColor: '#051120',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
      color: '#FFFFFF'
  },
  close: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});
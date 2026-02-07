/*import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';
import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
*/

import { View, Text, FlatList, Pressable } from 'react-native';
import React, { useMemo, useState } from "react";
import SearchBar from "../../components/searchbar";


//export default function HomeScreen() {
//  return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
//}

/*export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Link href="/modal">
          <Link.Trigger>
            <ThemedText type="subtitle">Step 2: Explore</ThemedText>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
            <Link.MenuAction
              title="Share"
              icon="square.and.arrow.up"
              onPress={() => alert('Share pressed')}
            />
            <Link.Menu title="More" icon="ellipsis">
              <Link.MenuAction
                title="Delete"
                icon="trash"
                destructive
                onPress={() => alert('Delete pressed')}
              />
            </Link.Menu>
          </Link.Menu>
        </Link>

        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});

 */

type Result =
  | { type: "friend"; id: string; label: string }
  | { type: "circle"; id: string; label: string }
  | { type: "community"; id: string; label: string };

// placeholder data
const MOCK: Result[] = [
  { type: "friend", id: "u1", label: "Karen Zheng" },
  { type: "friend", id: "u2", label: "Sophia Zamora" },
  { type: "friend", id: "u3", label: "Abril Unda" },
  { type: "circle", id: "c1", label: "Run Friends" },
  { type: "circle", id: "c2", label: "Rhodes CS Squad" },
  { type: "community", id: "m1", label: "Memphis Runners" },
  { type: "community", id: "m2", label: "COMP486 Community" },
];

export default function HomeScreen() {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return MOCK.filter((r) => r.label.toLowerCase().includes(query));
  }, [q]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 16, gap: 12 }}>
      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder="Search friends, circles, communities..."
      />

      {!q.trim() ? (
        <Text style={{ color: "#666" }}>Start typing to search (mock data for now).</Text>
      ) : results.length === 0 ? (
        <Text style={{ color: "#666" }}>No matches.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}:${item.id}`}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                // later: navigate to friend/circle/community detail screens
              }}
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: "#eee",
                borderRadius: 12,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontWeight: "600" }}>{item.label}</Text>
              <Text style={{ color: "#666" }}>{item.type}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

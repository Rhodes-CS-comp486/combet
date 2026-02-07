// Community screen
import { View, Text, FlatList } from 'react-native';
import React, { useMemo, useState } from "react";
import SearchBar from "../../components/searchbar";


//export default function CommunityScreen() {
//  return <View />;
//}

// placeholder data
const COMMUNITIES = [
  { id: "m1", name: "Memphis Runners" },
  { id: "m2", name: "COMP486 Community" },
];

export default function CommunityScreen() {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return COMMUNITIES;
    return COMMUNITIES.filter((c) => c.name.toLowerCase().includes(query));
  }, [q]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 16, gap: 12 }}>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search communities..." />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
            <Text style={{ fontWeight: "600" }}>{item.name}</Text>
          </View>
        )}
      />
    </View>
  );
}
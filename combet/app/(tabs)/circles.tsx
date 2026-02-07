// Circles Screen
import { View, Text, FlatList  } from 'react-native';
import React, { useMemo, useState } from "react";
import SearchBar from "../../components/searchbar";

//export default function CirclesScreen() {
  //return <View style={{ flex: 1 }} />;
//}

// placeholder data
const CIRCLES = [
  { id: "c1", name: "Run Friends" },
  { id: "c2", name: "Study Group" },
];

export default function CirclesScreen() {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return CIRCLES;
    return CIRCLES.filter((c) =>
      c.name.toLowerCase().includes(query)
    );
  }, [q]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 16, gap: 12 }}>
      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder="Search circles..."
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
          >
            <Text style={{ fontWeight: "600" }}>{item.name}</Text>
          </View>
        )}
      />
    </View>
  );
}
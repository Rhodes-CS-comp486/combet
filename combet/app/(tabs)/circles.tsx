// Circles Screen

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import SearchBar from "../../components/searchbar";

type Circle = {
  circle_id: string;
  name: string;
  icon?: string;
};

export default function CirclesScreen() {
  const router = useRouter();

  const [circles, setCircles] = useState<Circle[]>([]);
  const [q, setQ] = useState("");

  // Fetch circles
  useEffect(() => {
    fetch("http://localhost:3001/circles")
      .then((res) => res.json())
      .then((data) => setCircles(data))
      .catch((err) => console.error("Failed to load circles", err));
  }, []);

  // Search filtering
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return circles;

    return circles.filter((c) =>
      c.name.toLowerCase().includes(query)
    );
  }, [q, circles]);

  const renderItem = ({ item }: { item: Circle }) => (
    <TouchableOpacity style={styles.circleContainer}>
      <View style={styles.iconWrapper}>
        <Ionicons
          name={(item.icon as any) || "people"}
          size={28}
          color="white"
        />
      </View>
      <Text style={styles.circleName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/create-circle")}
      >
        <Ionicons name="add" size={26} color="white" />
      </TouchableOpacity>

      {/* Search Bar */}
      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder="Search circles..."
      />

      {/* Circles Grid */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.circle_id}
        renderItem={renderItem}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#051120",
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  addButton: {
    position: "absolute",
    top: 12,
    right: 16,
    backgroundColor: "#2E6CF6",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  listContent: {
    paddingTop: 60,
    paddingHorizontal: 8,
  },

  row: {
    justifyContent: "space-between",
  },

  circleContainer: {
    width: "33.33%",
    alignItems: "center",
    marginBottom: 28,
  },

  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0F223A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  circleName: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
  },
});

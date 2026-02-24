// " See Members" Screen in circles profile
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { getSessionId } from "@/components/sessionStore";

export default function MembersScreen() {
  const { id } = useLocalSearchParams();
  const circleId = id as string;

  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const sessionId = await getSessionId();

      const res = await fetch(
        `http://localhost:3001/circles/${circleId}/members`,
        {
          headers: {
            "user-id": sessionId || "",
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch members");

      const data = await res.json();
      setMembers(data);
    } catch (err) {
      console.error("Error loading members:", err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Row */}
      <TouchableOpacity
        onPress={() =>
          router.replace(`/circle-profile/${circleId}`)
        }
      >
        <Text style={styles.back}>← See Circle Profile</Text>
      </TouchableOpacity>

      {/* Header */}
      <Text style={styles.header}>Members</Text>

      {/* Members List */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <Text style={styles.memberName}>
              {item.username}
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#051120",
    padding: 20,
  },
  back: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
  },
  header: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  memberCard: {
    backgroundColor: "#1b2a40",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  memberName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
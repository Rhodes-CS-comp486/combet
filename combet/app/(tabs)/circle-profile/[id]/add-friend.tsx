// "Add Friend" to circle screen in circle profile
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { getSessionId } from "@/components/sessionStore";

type FriendResult = {
  id: string;
  username: string;
  status: "pending" | "accepted" | null;
  invitedByMe?: boolean;
};

export default function AddFriendToCircle() {
  const { id } = useLocalSearchParams();
  const circleId = id as string;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendResult[]>([]);

  useEffect(() => {
    if (query.length > 0) {
      searchFriends();
    } else {
      setResults([]);
    }
  }, [query]);

  const searchFriends = async () => {
    try {
      const sessionId = await getSessionId();

      const res = await fetch(
        `http://localhost:3001/circles/${circleId}/search-friends?q=${query}`,
        {
          headers: {
            "session-id": sessionId || "",
          },
        }
      );
      console.log("Inbox status:", res.status);

      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const requestFriend = async (userId: string) => {
    try {
      const sessionId = await getSessionId();

      await fetch(
        `http://localhost:3001/circles/${circleId}/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "session-id": sessionId || "",
          },
          body: JSON.stringify({ inviteeId: userId }),
        }
      );

      updateLocalStatus(userId, "pending");
    } catch (err) {
      console.error("Request error:", err);
    }
  };

  const retractRequest = async (userId: string) => {
    try {
      const sessionId = await getSessionId();

      await fetch(
        `http://localhost:3001/circles/${circleId}/retract/${userId}`,
        {
          method: "DELETE",
          headers: {
            "session-id": sessionId || "",
          },
        }
      );

      updateLocalStatus(userId, null);
    } catch (err) {
      console.error("Retract error:", err);
    }
  };

  const updateLocalStatus = (
    userId: string,
    newStatus: "pending" | "accepted" | null
  ) => {
    setResults((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, status: newStatus } : user
      )
    );
  };

  const renderButton = (item: FriendResult) => {
    if (!item.status) {
      return (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => requestFriend(item.id)}
        >
          <Text style={styles.buttonText}>Add to Circle</Text>
        </TouchableOpacity>
      );
    }

    if (item.status === "pending") {
        if (item.invitedByMe) {
    return (
      <TouchableOpacity
        style={styles.requestedButton}
        onPress={() => retractRequest(item.id)}
      >
        <Text style={styles.buttonText}>Requested</Text>
      </TouchableOpacity>
    );
  }

  // someone else invited them
  return (
    <View style={styles.addedButton}>
      <Text style={styles.buttonText}>Requested</Text>
    </View>
  );
}

    if (item.status === "accepted") {
      return (
        <View style={styles.addedButton}>
          <Text style={styles.buttonText}>Added</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Back */}
      <TouchableOpacity
        onPress={() =>
          router.replace(`/circle-profile/${circleId}`)
        }
      >
        <Text style={styles.back}>← Circle Profile</Text>
      </TouchableOpacity>

      {/* Header */}
      <Text style={styles.header}>
        Add Friends to Your Circle
      </Text>

      {/* Search */}
      <TextInput
        style={styles.search}
        placeholder="Search your friends..."
        placeholderTextColor="#999"
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.name}>
                {item.username}
              </Text>
              <Text style={styles.handle}>
                @{item.username}
              </Text>
            </View>

            {renderButton(item)}
          </View>
        )}
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
    marginBottom: 20,
  },
  search: {
    backgroundColor: "#1b2a40",
    padding: 14,
    borderRadius: 12,
    color: "#fff",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#1b2a40",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  handle: {
    color: "#999",
    fontSize: 14,
  },
  addButton: {
    backgroundColor: "#2e6cff",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  requestedButton: {
    backgroundColor: "#999",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addedButton: {
    backgroundColor: "#444",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
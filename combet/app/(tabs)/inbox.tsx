// Inbox Screen
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { getSessionId } from "@/components/sessionStore";

const BASE_URL = "http://localhost:3001";

type Notification = {
  notification_id: string;
  type: string;
  entity_id: string;
  actor_username: string | null;
  circle_name: string | null;
  invite_id: string | null;
  status: string | null;
  is_read: boolean;
  created_at: string;
};

export default function InboxScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInbox();
  }, []);

  const fetchInbox = async () => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;

      const res = await fetch(`${BASE_URL}/inbox`, {
        headers: {
          "session-id": sessionId,
        },
      });

      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error("Inbox error:", err);
    } finally {
      setLoading(false);
    }
  };
// if accepted invite to a circle
const handleAccept = async (inviteId: string) => {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) return;

    await fetch(`${BASE_URL}/invites/${inviteId}/accept`, {
      method: "POST",
      headers: {
        "session-id": sessionId,
      },
    });
    setNotifications(prev =>
        prev.map(n =>
        n.invite_id === inviteId
        ? { ...n, status: "accepted" }
        : n
  )
);


  } catch (err) {
    console.error("Accept error:", err);
  }
};
// if declined invite to a circle
const handleDecline = async (inviteId: string) => {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) return;

    await fetch(`${BASE_URL}/invites/${inviteId}/decline`, {
      method: "POST",
      headers: {
        "session-id": sessionId,
      },
    });

    // Remove from UI immediately
    setNotifications(prev =>
      prev.filter(n => n.invite_id !== inviteId)
    );

  } catch (err) {
    console.error("Decline error:", err);
  }
};

  const renderNotification = ({ item }: { item: Notification }) => {
    if (item.type === "circle_invite") {
      return (
        <View style={styles.card}>
          <Text style={styles.text}>
            @{item.actor_username} invited you to join "
            {item.circle_name}"
          </Text>

          {item.status === "pending" && item.invite_id && (
  <View style={styles.actions}>
    <TouchableOpacity
      style={styles.acceptButton}
      onPress={() => handleAccept(item.invite_id!)}
    >
      <Text style={styles.acceptText}>Accept</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.declineButton}
      onPress={() => handleDecline(item.invite_id!)}
    >
      <Text style={styles.declineText}>Decline</Text>
    </TouchableOpacity>
  </View>
)}

{item.status === "accepted" && (
  <View style={styles.actions}>
    <Text style={{ color: "#4ade80", fontWeight: "600" }}>
      Accepted
    </Text>
  </View>
)}
        </View>
      );
    }

    // fallback for future notification types
    return (
      <View style={styles.card}>
        <Text style={styles.text}>
          You have a new notification.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>Close</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#FFFFFF" style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.body}>
          <Text style={styles.emptyText}>
            You have no notifications yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notification_id}
          renderItem={renderNotification}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#051120",
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#222",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  close: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#999",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#0d1b2a",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  text: {
    color: "#FFFFFF",
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  acceptButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  acceptText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  declineButton: {
    backgroundColor: "#374151",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  declineText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
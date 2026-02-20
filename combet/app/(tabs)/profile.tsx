import React from "react";
import { View, Text, Pressable, StyleSheet, Alert, Platform } from "react-native";
import { router } from "expo-router";
import { deleteSessionId, getSessionId } from "@/components/sessionStore";

const API_URL = "http://localhost:3001"; // changed from localhost

export default function ProfileScreen() {
  const doLogout = async () => {
    console.log("Logout pressed");

    try {
      const sessionId = await getSessionId();
      console.log("sessionId:", sessionId);

      if (sessionId) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "x-session-id": sessionId,
          },
        });
      }

      await deleteSessionId();
      router.replace("/login");
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  const onLogout = () => {
    // Web: use confirm
    if (Platform.OS === "web") {
      const ok = window.confirm("Are you sure you want to logout?");
      if (ok) void doLogout();
      return;
    }

    // Native: use Alert
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => void doLogout() },
    ]);
  };

  return (
    <View style={styles.container}>

      <Pressable
        onPress={onLogout}
        style={({ pressed }) => [
          styles.logoutBtn,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#051120",
    padding: 20,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 40,
  },
  logoutBtn: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#E53935",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 30,
  },
  logoutText: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
  },
});

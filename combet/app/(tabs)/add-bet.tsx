import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";

export default function AddBet() {
  const [postTo, setPostTo] = useState<"circles" | "friends">("circles");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [stake, setStake] = useState("");
  const [closeAt, setCloseAt] = useState("");

  const inputStyle = (value: string) => [
    styles.input,
    value.length > 0 && styles.inputFilled,
  ];

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, ""]);
    }
  };

  const updateOption = (index: number, text: string) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const handleCreateBet = async () => {
    try {
      const sessionId = await getSessionId();

      if (!sessionId) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      const cleanedOptions = options.filter((opt) => opt.trim() !== "");

      if (!title || !description || !stake || cleanedOptions.length < 2) {
        Alert.alert("Missing Fields", "Please complete all required fields.");
        return;
      }

      const response = await fetch("http://localhost:3001/bets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          title,
          description,
          stake: Number(stake),
          closesAt: closeAt || null,
          options: cleanedOptions,
          targetType: postTo === "circles" ? "circle" : "user",
          targetId: "TEMP_TARGET_ID",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.error || "Failed to create bet");
        return;
      }

      setTitle("");
      setDescription("");
      setOptions(["", ""]);
      setStake("");
      setCloseAt("");
      setPostTo("circles");

      router.back();
    } catch (error) {
      console.error("Create bet error:", error);
      Alert.alert("Network Error", "Could not connect to server");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* BET DETAILS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Bet on It!</Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter bet title"
          placeholderTextColor="#94a3b8"
          style={inputStyle(title)}
        />

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What is this bet about?"
          placeholderTextColor="#94a3b8"
          style={[inputStyle(description), styles.multiline]}
          multiline
        />
      </View>

      {/* PICKS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Picks</Text>

        {options.map((opt, index) => (
          <View key={index} style={styles.optionRow}>
            <View style={styles.optionBadge}>
              <Text style={styles.badgeText}>
                {String.fromCharCode(65 + index)}
              </Text>
            </View>

            <TextInput
              value={opt}
              onChangeText={(text) => updateOption(index, text)}
              placeholder={`Option ${String.fromCharCode(65 + index)}`}
              placeholderTextColor="#94a3b8"
              style={[
                styles.optionInput,
                opt.length > 0 && styles.inputFilled,
              ]}
            />
          </View>
        ))}

        {options.length < 4 && (
          <TouchableOpacity onPress={addOption}>
            <Text style={styles.addOption}>+ Add Option</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* WHO + STAKE ROW */}
      <View style={styles.row}>
        {/* WHO CARD */}
        <View style={[styles.card, styles.halfCardLeft]}>
          <Text style={styles.sectionTitle}>Who’s In?</Text>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              postTo === "circles" && styles.toggleActive,
            ]}
            onPress={() => setPostTo("circles")}
          >
            <Text style={styles.toggleText}>Circles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              postTo === "friends" && styles.toggleActive,
            ]}
            onPress={() => setPostTo("friends")}
          >
            <Text style={styles.toggleText}>Friends</Text>
          </TouchableOpacity>
        </View>

        {/* STAKE CARD */}
        <View style={[styles.card, styles.halfCardRight]}>
          <Text style={styles.sectionTitle}>Stake & Close</Text>

          <View style={styles.iconInputRow}>
            <Ionicons name="cash-outline" size={18} color="#38bdf8" />
            <TextInput
              value={stake}
              onChangeText={setStake}
              placeholder="Stake"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              style={styles.iconInput}
            />
          </View>

          <View style={styles.iconInputRow}>
            <Ionicons name="calendar-outline" size={18} color="#38bdf8" />
            <TextInput
              value={closeAt}
              onChangeText={setCloseAt}
              placeholder="Closes"
              placeholderTextColor="#94a3b8"
              style={styles.iconInput}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.createButton} onPress={handleCreateBet}>
        <Text style={styles.createButtonText}>Create Bet</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.cancelButton}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    backgroundColor: "#0f172a",
  },

  card: {
    backgroundColor: "#172033",
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  halfCardLeft: {
    flex: 1,
    marginRight: 10,
  },

  halfCardRight: {
    flex: 1,
    marginLeft: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 12,
    color: "#ffffff",
    marginBottom: 12,
  },

  inputFilled: {
    borderWidth: 1,
    borderColor: "#38bdf8",
  },

  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  optionBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#38bdf8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  badgeText: {
    color: "#fff",
    fontWeight: "600",
  },

  optionInput: {
    flex: 1,
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    color: "#ffffff",
  },

  addOption: {
    color: "#38bdf8",
    marginTop: 6,
    fontWeight: "500",
  },

  toggleButton: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    marginBottom: 10,
  },

  toggleActive: {
    backgroundColor: "#38bdf8",
  },

  toggleText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "500",
  },

  iconInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  iconInput: {
    flex: 1,
    marginLeft: 10,
    color: "#ffffff",
  },

  createButton: {
    backgroundColor: "#38bdf8",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },

  createButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },

  cancelButton: {
    alignItems: "center",
    marginTop: 18,
  },

  cancelText: {
    color: "#94a3b8",
  },
});
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >



      {/* BET DETAILS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bet on It!</Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter bet title"
          placeholderTextColor="#7a8ca3"
          style={inputStyle(title)}
        />

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What is this bet about?"
          placeholderTextColor="#7a8ca3"
          style={[inputStyle(description), styles.multiline]}
          multiline
        />
      </View>

      {/* YOUR BET */}
      <View style={styles.section}>
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
              placeholderTextColor="#7a8ca3"
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
        {/* Who’s In */}
        <View style={[styles.section, styles.halfSection]}>
          <Text style={styles.sectionTitle}>Who’s In?</Text>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              postTo === "circles" && styles.toggleActive,
            ]}
            onPress={() => setPostTo("circles")}
          >
            <Text
              style={[
                styles.toggleText,
                postTo === "circles" && styles.toggleTextActive,
              ]}
            >
              Circles
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              postTo === "friends" && styles.toggleActive,
            ]}
            onPress={() => setPostTo("friends")}
          >
            <Text
              style={[
                styles.toggleText,
                postTo === "friends" && styles.toggleTextActive,
              ]}
            >
              Friends
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stake & Close */}
        <View style={[styles.section, styles.halfSection]}>
          <Text style={styles.sectionTitle}>Stake & Close</Text>

          <View style={styles.iconInputRow}>
            <Ionicons name="cash-outline" size={18} color="#1DA1F2" />
            <TextInput
              value={stake}
              onChangeText={setStake}
              placeholder="Stake"
              placeholderTextColor="#7a8ca3"
              style={[
                styles.iconInput,
                stake.length > 0 && styles.inputFilledTransparent,
              ]}
            />
          </View>

          <View style={styles.iconInputRow}>
            <Ionicons name="calendar-outline" size={18} color="#1DA1F2" />
            <TextInput
              value={closeAt}
              onChangeText={setCloseAt}
              placeholder="Closes"
              placeholderTextColor="#7a8ca3"
              style={[
                styles.iconInput,
                closeAt.length > 0 && styles.inputFilledTransparent,
              ]}
            />
          </View>
        </View>
      </View>

      {/* CREATE BUTTON */}
      <TouchableOpacity style={styles.createButton}>
        <Text style={styles.createButtonText}>Create Bet</Text>
      </TouchableOpacity>

      {/* CANCEL */}
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
    padding: 20,
    paddingBottom: 20,
    backgroundColor: "#041120",
  },

  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "white",
  },

  subtitle: {
    color: "#7a8ca3",
    marginBottom: 25,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  section: {
    backgroundColor: "#142b47",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  halfSection: {
    width: "48%",
  },

  sectionTitle: {
    color: "#1DA1F2",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#1b3555",
    borderRadius: 12,
    padding: 12,
    color: "white",
    marginBottom: 12,
  },

  inputFilled: {
    backgroundColor: "#1e4068",
    borderWidth: 1,
    borderColor: "#1DA1F2",
  },

  inputFilledTransparent: {
    borderBottomWidth: 1,
    borderColor: "#1DA1F2",
  },

  multiline: {
    height: 80,
    textAlignVertical: "top",
  },

  toggleButton: {
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#1b3555",
    alignItems: "center",
    marginBottom: 10,
  },

  toggleActive: {
    backgroundColor: "#1DA1F2",
  },

  toggleText: {
    color: "#7a8ca3",
  },

  toggleTextActive: {
    color: "white",
    fontWeight: "600",
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
    backgroundColor: "#1DA1F2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  badgeText: {
    color: "white",
    fontWeight: "600",
  },

  optionInput: {
    flex: 1,
    backgroundColor: "#1b3555",
    borderRadius: 12,
    padding: 12,
    color: "white",
  },

  addOption: {
    color: "#1DA1F2",
    marginTop: 5,
    fontWeight: "600",
  },

  iconInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1b3555",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },

  iconInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 8,
    color: "white",
  },

  createButton: {
    backgroundColor: "#1DA1F2",
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },

  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  cancelButton: {
    marginTop: 15,
    alignItems: "center",
      marginBottom: 10,
  },

  cancelText: {
    color: "#7a8ca3",
    fontSize: 14,
  },
});
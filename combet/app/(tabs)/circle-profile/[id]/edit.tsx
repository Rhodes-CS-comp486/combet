import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const ICON_OPTIONS: (keyof typeof Ionicons.glyphMap)[] = [
  "people",
  "flame",
  "football",
  "book",
  "fitness",
  "trophy",
  "cash",
  "game-controller",
];

export default function EditCircle() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const circleId = Array.isArray(id) ? id[0] : id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] =
    useState<keyof typeof Ionicons.glyphMap>("people");

  useEffect(() => {
    if (!circleId) return;

    fetch(`http://localhost:3001/circles/${circleId}`)
      .then((res) => res.json())
      .then((data) => {
        setName(data.name);
        setDescription(data.description || "");
        setSelectedIcon(data.icon || "people");
      })
      .catch((err) => console.error(err));
  }, [circleId]);

  const handleSave = async () => {
    if (name.length < 5 || name.length > 15) {
      Alert.alert("Circle name must be 5–15 characters");
      return;
    }

    if (description.length > 100) {
      Alert.alert("Description must be under 100 characters");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/circles/${circleId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            icon: selectedIcon,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to update");

      router.replace(`/circle-profile/${circleId}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error saving changes");
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Top Navigation Row */}
        <View style={styles.navRow}>
        <TouchableOpacity
            style={styles.backRow}
            onPress={() => router.replace('/circle-profile/{id}')}
        >
        <Ionicons name="arrow-back" size={22} color="white" />
        <Text style={styles.backText}>Circle Profile</Text>
        </TouchableOpacity>
    </View>

{/* Page Title */}
<Text style={styles.pageTitle}>Edit Circle Profile</Text>



      {/* CURRENT / SELECTED ICON */}
      <View style={styles.currentIcon}>
        <Ionicons
          name={selectedIcon}
          size={48}
          color="white"
        />
      </View>

      {/* ICON PICKER */}
      <View style={styles.iconGrid}>
        {ICON_OPTIONS.map((icon) => (
          <TouchableOpacity
            key={icon}
            style={[
              styles.iconOption,
              selectedIcon === icon && styles.selectedIcon,
            ]}
            onPress={() => setSelectedIcon(icon)}
          >
            <Ionicons
              name={icon}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* NAME */}
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={(text) => {
          if (text.length <= 15) setName(text);
        }}
        maxLength={15}
      />
      <Text style={styles.counter}>
        {name.length}/15
      </Text>

      {/* DESCRIPTION */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={(text) => {
          if (text.length <= 100) setDescription(text);
        }}
        multiline
        maxLength={100}
      />
      <Text style={styles.counter}>
        {description.length}/100
      </Text>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
      >
        <Text style={styles.saveText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#051120",
    padding: 20,
  },
  header: {
    color: "white",
    fontSize: 22,
    marginBottom: 20,
  },
  currentIcon: {
    alignSelf: "center",
    backgroundColor: "#2E6CF6",
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  iconOption: {
    width: 50,
    height: 50,
    backgroundColor: "#1F2C44",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedIcon: {
    backgroundColor: "#2E6CF6",
  },
  label: {
    color: "white",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#1F2C44",
    color: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  counter: {
    color: "#aaa",
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: "#2E6CF6",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveText: {
    color: "white",
    fontWeight: "600",
  },
    navRow: {
  paddingTop: 12,
  paddingHorizontal: 16,
},

backRow: {
  flexDirection: "row",
  alignItems: "center",
},

backText: {
  color: "white",
  fontSize: 16,
  marginLeft: 8,
},

pageTitle: {
  color: "white",
  fontSize: 20,
  fontWeight: "600",
  marginTop: 10,
  marginBottom: 20,
  alignSelf: "center",
},
});
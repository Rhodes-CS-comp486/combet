import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {getSessionId} from "@/components/sessionStore";

const BASE_URL = "http://localhost:3001"; // changed from local host

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: (circle: any) => void;
};

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

export default function CreateCircle({
  visible,
  onClose,
  onCreated,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] =
    useState<keyof typeof Ionicons.glyphMap>("people");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (name.length < 5 || name.length > 15) {
      Alert.alert("Name must be 5–15 characters");
      return;
    }

    if (description.length > 100) {
      Alert.alert("Description max 100 characters");
      return;
    }

    try {
      setLoading(true);

      const sessionId = await getSessionId();

        if (!sessionId) {
            Alert.alert("Not authenticated");
            return;
}

    const res = await fetch(`${BASE_URL}/circles`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "session-id": sessionId || "",
        },
        body: JSON.stringify({
            name,
            description,
            icon,
        }),
        });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert(data.error || "Error creating circle");
        return;
      }

      router.replace("/circles");

      setName("");
      setDescription("");
      setIcon("people");
      onClose();
    } catch {
      Alert.alert("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>

          <Text style={styles.title}>Create Circle</Text>

          {/* Preview Circle */}
          <View style={styles.previewWrapper}>
            <View style={styles.previewCircle}>
              <Ionicons name={icon} size={32} color="white" />
            </View>
          </View>

          {/* Icon Options */}
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map((i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.iconOption,
                  icon === i && styles.iconSelected,
                ]}
                onPress={() => setIcon(i)}
              >
                <Ionicons
                  name={i}
                  size={20}
                  color={icon === i ? "#fff" : "#9CA3AF"}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Name */}
          <Text style={styles.label}>
            Name your circle (5–15 characters)
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            maxLength={15}
            placeholder="Enter circle name"
            placeholderTextColor="#6B7280"
          />

          <Text style={styles.charCount}>
            {name.length}/15
          </Text>

          {/* Description */}
          <Text style={styles.label}>
            Add circle description
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textArea]}
            multiline
            maxLength={100}
            placeholder="What is this circle about?"
            placeholderTextColor="#6B7280"
          />

          <Text style={styles.charCount}>
            {description.length}/100
          </Text>

          {/* Friend Placeholder */}
          <Text style={styles.label}>
            Add friends to your circle
          </Text>

          <View style={styles.friendSearchWrapper}>
            <Ionicons name="search" size={16} color="#6B7280" />
            <TextInput
              style={styles.friendSearchInput}
              placeholder="Search friends..."
              placeholderTextColor="#6B7280"
              editable={false}
            />
          </View>

          <Text style={styles.friendHelper}>
            (Friend search coming soon)
          </Text>

          {/* Create Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={styles.createText}>
              {loading ? "Creating..." : "Create"}
            </Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(3,10,20,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },

  modal: {
    width: "70%",
    maxWidth: 620, //520
    backgroundColor: "#0F223A",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 32,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
  },

  previewWrapper: {
    alignItems: "center",
    marginBottom: 16,
  },

  previewCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },

  iconGrid: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },

  iconOption: {
    backgroundColor: "#1A2F4F",
    padding: 14,
    borderRadius: 14,
  },

  iconSelected: {
    backgroundColor: "#2563EB",
  },

  label: {
    color: "#D1D5DB",
    fontSize: 14,
    marginTop: 16,
  },

  input: {
    backgroundColor: "#152C49",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 14,
    marginTop: 8,
  },

  textArea: {
    height: 100,
    textAlignVertical: "top",
  },

  charCount: {
    textAlign: "right",
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
  },

  friendSearchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#152C49",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
    opacity: 0.6,
  },

  friendSearchInput: {
    marginLeft: 8,
    color: "#fff",
    flex: 1,
    fontSize: 14,
  },

  friendHelper: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
  },

  createButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 24,
  },

  createText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  cancelText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 14,
    fontSize: 14,
  },
});

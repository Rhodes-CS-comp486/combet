import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type Props = {
  onBack?: () => void;
};

export default function BackButton({ onBack }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onBack ?? (() => router.back())}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.75)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
});
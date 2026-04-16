import React from "react";
import { Modal, View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/context/ThemeContext";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const { theme } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
        paddingHorizontal: 32,
      }}>
        <View style={{
          width: "100%",
          backgroundColor: "#1a2e3d",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
          padding: 24,
          alignItems: "center",
        }}>

          {/* Icon */}
          <View style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: destructive ? "rgba(232,112,96,0.15)" : "rgba(0,180,216,0.15)",
            borderWidth: 1,
            borderColor: destructive ? "rgba(232,112,96,0.3)" : "rgba(0,180,216,0.3)",
            alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            <Ionicons
              name={destructive ? "trash-outline" : "help-circle-outline"}
              size={26}
              color={destructive ? "#e87060" : "#00B4D8"}
            />
          </View>

          {/* Title */}
          <Text style={{
            fontSize: 17, fontWeight: "600",
            color: theme.colors.onSurface,
            marginBottom: 8, textAlign: "center",
          }}>
            {title}
          </Text>

          {/* Message */}
          <Text style={{
            fontSize: 13, color: theme.colors.onSurfaceVariant,
            textAlign: "center", lineHeight: 20, marginBottom: 24,
          }}>
            {message}
          </Text>

          {/* Buttons */}
          <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.8}
              style={{
                flex: 1, paddingVertical: 13,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "500", color: theme.colors.onSurface }}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.8}
              style={{
                flex: 1, paddingVertical: 13,
                borderRadius: 12,
                backgroundColor: destructive ? "rgba(232,112,96,0.2)" : "rgba(0,180,216,0.2)",
                borderWidth: 1,
                borderColor: destructive ? "rgba(232,112,96,0.4)" : "rgba(0,180,216,0.4)",
                alignItems: "center",
              }}
            >
              <Text style={{
                fontSize: 15, fontWeight: "600",
                color: destructive ? "#e87060" : "#00B4D8",
              }}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}
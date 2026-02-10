import React from "react";
import { View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export default function SearchBar({ value, onChangeText, placeholder }: Props) {
  return (
    <View
      style={{
        position: "relative",
        height: 48,          // overall height of the control
        justifyContent: "center",
      }}
    >
      {/* White input pill */}
      <View
        style={{
          height: 40,
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          paddingLeft: 56,   // space for the overlapping circle
          paddingRight: 14,
          justifyContent: "center",
            marginLeft: 8,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? "Search..."}
          placeholderTextColor="#9aa3ad"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            fontSize: 16,
            color: "#0F223A",
          }}
        />
      </View>

      {/* Blue overlapping circle */}
      <View
        style={{
          position: "absolute",
          left: 0,
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "#203a5b",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="search-outline" size={20} color="#FFFFFF" />
      </View>
    </View>
  );
}

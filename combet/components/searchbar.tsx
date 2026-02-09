import React from "react";
import { View, TextInput } from "react-native";
import { IconSymbol } from "./ui/icon-symbol";


type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export default function SearchBar({ value, onChangeText, placeholder }: Props) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#fff",
      }}
    >

      <IconSymbol
        name="search"
        size={18}
        color="#999"
        style={{ marginRight: 8 }}
      />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "Search..."}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ fontSize: 16 }}
      />
    </View>
  );
}

import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme } from "@/context/ThemeContext";
import BackButton from "@/components/BackButton";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
};

export default function PageHeader({ title, subtitle, onBack }: Props) {
  const { theme } = useAppTheme();

  return (
    <View style={{ paddingTop: 12, marginBottom: 20 }}>
      <BackButton onBack={onBack} />
      <Text style={{
        color: theme.colors.onSurface, fontSize: 24, fontWeight: "300",
        letterSpacing: 2, marginBottom: 4, marginTop: 16,
      }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
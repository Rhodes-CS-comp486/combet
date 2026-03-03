import React from "react";
import { View } from "react-native";
import { Button } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";

type Props = {
  label: string;
  href: string;
};

export default function BackHeader({ label, href }: Props) {
  const router = useRouter();
  const { theme } = useAppTheme();

  return (
    <View style={{ paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 }}>
      <Button
        icon="arrow-left"
        mode="text"
        compact
        onPress={() => router.replace(href as any)}
        style={{ alignSelf: "flex-start" }}
        labelStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}
      >
        {label}
      </Button>
    </View>
  );
}
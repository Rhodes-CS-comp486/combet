import * as React from "react";
import { Appbar, Text } from "react-native-paper";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CombetHeader() {
  const coinBalance = 120;
  const insets = useSafeAreaInsets();

  return (
    <Appbar.Header
      style={{ backgroundColor: "#0f223a" }}
      statusBarHeight={insets.top}
      elevated
    >
      {/* Left */}
      <Appbar.Action
        icon="menu"
        color="#FFFFFF"
        onPress={() => router.push("/inbox")}
      />

      {/* Center */}
      <Appbar.Content
        title="COMBET"
        titleStyle={{
          color: "#FFFFFF",
          fontWeight: "700",
          letterSpacing: 1,
        }}
      />

      {/* Right */}
      <Appbar.Action
        icon="circle-outline"
        color="#FFFFFF"
        disabled
      />
      <Text
        variant="labelLarge"
        style={{ color: "#FFFFFF", fontWeight: "600" }}
      >
        {coinBalance}
      </Text>
    </Appbar.Header>
  );
}
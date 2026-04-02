import React, { useEffect, useState, useCallback } from "react";
import { Appbar, Text } from "react-native-paper";
import {AppState, DeviceEventEmitter, View} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSessionId } from "@/components/sessionStore";

import { API_BASE } from "@/constants/api";

export default function CombetHeader() {
  const [coinBalance, setCoinBalance] = useState<number>(120);
  const insets = useSafeAreaInsets();

  const fetchCoins = useCallback(async () => {
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCoinBalance(data.coins ?? 120);
    } catch (err) {
      console.error("Header coins error:", err);
    }
  }, []);

  useEffect(() => {
  fetchCoins();
  const interval = setInterval(fetchCoins, 10000); // refresh every 10s
  const appStateSub = AppState.addEventListener("change", (state) => {
    if (state === "active") fetchCoins();
  });
  const eventSub = DeviceEventEmitter.addListener("coinsUpdated", fetchCoins);
  return () => {
    clearInterval(interval);
    appStateSub.remove();
    eventSub.remove();
  };
}, [fetchCoins]);

  return (
    <Appbar.Header
      style={{
          backgroundColor: "transparent",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.1)",
          elevation: 0,

      }}
      statusBarHeight={insets.top}
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
          fontWeight: "300",
          letterSpacing: 3.2,
            textAlign: "center",
        }}
      />

      {/* Right */}
        <View style={{ flexDirection: "row", alignItems: "center", width: 48, justifyContent: "flex-end", marginRight: 16 }}>
          <Appbar.Action
            icon="circle"
            iconColor="#D4AF37"
            style={{ margin: 0 }}
          />
          <Text
            variant="labelLarge"
            style={{ color: "#FFFFFF", fontWeight: "600" }}
          >
            {coinBalance}
          </Text>
        </View>
    </Appbar.Header>
  );
}
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Appbar, Text } from "react-native-paper";
import {AppState, DeviceEventEmitter, View} from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSessionId } from "@/components/sessionStore";
import { useUser } from "@/context/UserContext";

import { API_BASE } from "@/constants/api";

export default function CombetHeader() {
  const [coinBalance, setCoinBalance] = useState<number>(120);
  const { unreadCount, setUnreadCount } = useUser();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const prevPathname = useRef<string>(pathname);
  const lastNonInboxPath = useRef<string>("/(tabs)/index");

  // Track the last non-inbox path so we can return to it
  useEffect(() => {
    if (!pathname.includes("/inbox")) {
      lastNonInboxPath.current = pathname;
    }
    prevPathname.current = pathname;
  }, [pathname]);

  const isOnInbox = pathname === "/inbox" || pathname.includes("/(tabs)/inbox");

  const handleInboxPress = () => {
    if (isOnInbox) {
      router.replace(lastNonInboxPath.current as any);
    } else {
      router.push("/(tabs)/inbox");
    }
  };

  const fetchUnread = useCallback(async () => {
    if (isOnInbox) return; // don't overwrite 0 while user is reading inbox
    try {
      const sessionId = await getSessionId();
      const res = await fetch(`${API_BASE}/inbox`, {
        headers: { "x-session-id": sessionId ?? "" },
      });
      if (!res.ok) return;
      const data = await res.json();
      const count = Array.isArray(data) ? data.filter((n: any) => !n.is_read).length : 0;
      setUnreadCount(count);
    } catch (err) {
      console.error("Header unread error:", err);
    }
  }, [isOnInbox]);

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
  fetchUnread();
  const interval = setInterval(() => {
    fetchCoins();
    fetchUnread();
  }, 10000); // refresh every 10s
  const appStateSub = AppState.addEventListener("change", (state) => {
    if (state === "active") { fetchCoins(); fetchUnread(); }
  });
  const eventSub = DeviceEventEmitter.addListener("coinsUpdated", fetchCoins);
  return () => {
    clearInterval(interval);
    appStateSub.remove();
    eventSub.remove();
  };
}, [fetchCoins, fetchUnread, isOnInbox]);

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
      <View style={{ position: "relative", marginLeft: 4 }}>
        <Appbar.Action
          icon={isOnInbox ? "arrow-left" : "email-outline"}
          color="#FFFFFF"
          onPress={handleInboxPress}
        />
        {!isOnInbox && unreadCount > 0 && (
          <View style={{
            position: "absolute", top: 8, right: 6,
            width: 9, height: 9, borderRadius: 4.5,
            backgroundColor: "#e87060",
            borderWidth: 1.5, borderColor: "#1a3040",
          }} />
        )}
      </View>

      {/* Center */}
      <Appbar.Content
        title="COMBET"
        titleStyle={{
          color: "#FFFFFF",
          fontWeight: "300",
          letterSpacing: 3.2,
          textAlign: "center",
        }}
        onPress={() => router.replace("/(tabs)")}
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
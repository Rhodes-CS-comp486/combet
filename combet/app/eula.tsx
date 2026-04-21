import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { Text, Button } from "react-native-paper";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";

const EULA_KEY = "combet_eula_accepted";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By creating an account or using Combet, you agree to these Terms of Use. If you do not agree, do not use the app.",
  },
  {
    title: "2. User-Generated Content",
    body: "Combet allows users to create bets, post in circles, and interact with other users. You are solely responsible for any content you submit. By posting content, you represent that you have the right to do so and that it does not violate any applicable law.",
  },
  {
    title: "3. Zero Tolerance Policy",
    body: "We have a strict zero-tolerance policy for objectionable content and abusive behavior. This includes but is not limited to: hate speech, harassment, threats, explicit or adult content, content promoting violence or illegal activity, and impersonation of others. Violations may result in immediate account termination.",
  },
  {
    title: "4. Reporting & Moderation",
    body: "You may report objectionable content or abusive users using the flag and block features within the app. We review all reports and reserve the right to remove content or suspend accounts at our discretion.",
  },
  {
    title: "5. Blocking Users",
    body: "You may block any user at any time. Blocked users will not be able to interact with you or see your content. We encourage you to use these tools to protect your experience.",
  },
  {
    title: "6. Account Termination",
    body: "We reserve the right to suspend or permanently delete accounts that violate these terms, without prior notice. You may delete your own account at any time from the Settings screen.",
  },
  {
    title: "7. Disclaimer",
    body: "Combet is intended for entertainment purposes only. Any bets made within the app are social in nature and do not hold real view value.",
  },
  {
    title: "8. Changes to Terms",
    body: "We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the updated terms.",
  },
];

export async function hasAcceptedEula(): Promise<boolean> {
  const val = await AsyncStorage.getItem(EULA_KEY);
  return val === "true";
}

export async function acceptEula(): Promise<void> {
  await AsyncStorage.setItem(EULA_KEY, "true");
}

export default function EulaScreen() {
  const { theme } = useAppTheme();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (isBottom) setScrolledToBottom(true);
  };

  const handleAccept = async () => {
    setAccepting(true);
    await acceptEula();
    router.replace("/register");
  };

  return (
    <GradientBackground style={{ paddingHorizontal: 24 }}>
      <View style={{ flex: 1, paddingTop: 60 }}>
        <Text style={{
          textAlign: "center", color: "#ffffff",
          fontWeight: "300", letterSpacing: 6,
          fontSize: 28, marginBottom: 4,
        }}>
          COMBET
        </Text>
        <Text style={{
          textAlign: "center", color: theme.colors.onSurfaceVariant,
          fontSize: 13, marginBottom: 24,
        }}>
          Terms of Use & Community Guidelines
        </Text>

        {!scrolledToBottom && (
          <Text style={{
            textAlign: "center", color: "rgba(157,212,190,0.6)",
            fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
            marginBottom: 8,
          }}>
            Scroll to read all terms
          </Text>
        )}

        <View style={{
          flex: 1, borderRadius: 16, borderWidth: 1,
          borderColor: "rgba(157,212,190,0.2)",
          backgroundColor: "rgba(255,255,255,0.04)",
          overflow: "hidden", marginBottom: 16,
        }}>
          <ScrollView
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {SECTIONS.map((section, i) => (
              <View key={i} style={{ marginBottom: 20 }}>
                <Text style={{
                  color: "#9dd4be", fontSize: 13,
                  fontWeight: "700", marginBottom: 6, letterSpacing: 0.3,
                }}>
                  {section.title}
                </Text>
                <Text style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 13, lineHeight: 20,
                }}>
                  {section.body}
                </Text>
              </View>
            ))}

            <View style={{
              marginTop: 8, padding: 16, borderRadius: 12,
              backgroundColor: "rgba(157,212,190,0.07)",
              borderWidth: 1, borderColor: "rgba(157,212,190,0.2)",
            }}>
              <Text style={{
                color: "rgba(255,255,255,0.8)", fontSize: 13,
                lineHeight: 20, textAlign: "center",
              }}>
                By tapping <Text style={{ color: "#9dd4be", fontWeight: "700" }}>I Agree</Text>, you confirm you have read and agree to these terms, and that you will not post objectionable content or engage in abusive behavior.
              </Text>
            </View>
          </ScrollView>
        </View>

        <Button
          mode="contained"
          onPress={handleAccept}
          loading={accepting}
          disabled={!scrolledToBottom || accepting}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: "600", fontSize: 16 }}
          style={{ borderRadius: 12, marginBottom: 10 }}
        >
          I Agree
        </Button>

        <TouchableOpacity
            onPress={async () => {
              await AsyncStorage.removeItem("combet_eula_accepted");
              router.back();
            }}
          style={{ alignItems: "center", paddingVertical: 10, marginBottom: 24 }}
        >
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}>
            Decline
          </Text>
        </TouchableOpacity>
      </View>
    </GradientBackground>
  );
}
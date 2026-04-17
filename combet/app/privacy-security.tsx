import React from "react";
import { ScrollView, View, StyleSheet, Linking } from "react-native";
import { Text } from "react-native-paper";
import { router } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import PageHeader from "@/components/PageHeader";

const CONTACT_EMAIL = "combet.privacy@gmail.com";

export default function PrivacySecurityScreen() {
  const { theme } = useAppTheme();
  const s = styles(theme);

  return (
    <GradientBackground style={{ paddingHorizontal: 20 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PageHeader title="Privacy & Security" onBack={() => router.back()} />

        <Section title="Privacy Policy" theme={theme}>
          <Body theme={theme}>Last updated: April 2026</Body>
          <Body theme={theme}>
            This Privacy Policy describes how Combet collects, uses, and
            protects information when you use the Combet mobile application.
          </Body>
        </Section>

        <Section title="Information We Collect" theme={theme}>
          <Body theme={theme}>When you use Combet, we collect:</Body>
          <Bullet theme={theme} text="Account information: username, email address, and password (stored encrypted)" />
          <Bullet theme={theme} text="Profile information: display name, bio, and avatar preferences" />
          <Bullet theme={theme} text="App activity: bets created, bet results, circle membership, and coin transactions" />
          <Bullet theme={theme} text="Device information: device type and operating system, for app functionality" />
        </Section>

        <Section title="How We Use Your Information" theme={theme}>
          <Body theme={theme}>We use the information we collect to:</Body>
          <Bullet theme={theme} text="Operate and maintain the Combet app" />
          <Bullet theme={theme} text="Display leaderboards, bet history, and circle activity" />
          <Bullet theme={theme} text="Send notifications about your bets and circles (if enabled)" />
          <Bullet theme={theme} text="Improve the app and fix issues" />
        </Section>

        <Section title="Virtual Currency" theme={theme}>
          <Body theme={theme}>
            Combet uses a virtual coin system for social betting between friends. Coins have no
            real-world monetary value, cannot be exchanged for cash or real goods, and do not
            represent any financial instrument. Combet does not process any real money or payment
            information.
          </Body>
        </Section>

        <Section title="Information Sharing" theme={theme}>
          <Body theme={theme}>
            We do not sell your personal information to third parties. We do not share your data
            with advertisers. Your bet activity and profile are visible to other users within your
            circles based on your account privacy settings.
          </Body>
        </Section>

        <Section title="Data Retention" theme={theme}>
          <Body theme={theme}>
            We retain your data for as long as your account is active. If you request account
            deletion, your personal data will be removed within 30 days. Anonymized statistical
            data may be retained longer.
          </Body>
        </Section>


        <Section title="Security" theme={theme}>
          <Body theme={theme}>We take reasonable measures to protect your information:</Body>
          <Bullet theme={theme} text="Passwords are stored using industry-standard hashing" />
          <Bullet theme={theme} text="All data is transmitted over encrypted HTTPS connections" />
          <Bullet theme={theme} text="Session-based authentication protects your account access" />
          <Bullet theme={theme} text="No payment or financial data is stored on our servers" />
          <Body theme={theme}>
            No method of transmission or storage is 100% secure. We encourage you to use a strong,
            unique password for your account.
          </Body>
        </Section>

        <Section title="Your Rights" theme={theme}>
          <Body theme={theme}>You have the right to:</Body>
          <Bullet theme={theme} text="Access the personal data we hold about you" />
          <Bullet theme={theme} text="Request correction of inaccurate data" />
          <Bullet theme={theme} text="Request deletion of your account and associated data" />
          <Bullet theme={theme} text="Opt out of non-essential communications" />
          <Body theme={theme}>
            To exercise any of these rights, contact us at{" "}
            <Text
              style={{ color: theme.colors.primary }}
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            >
              {CONTACT_EMAIL}
            </Text>
            .
          </Body>
        </Section>

        <Section title="Changes to This Policy" theme={theme}>
          <Body theme={theme}>
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes through the app. Continued use of Combet after changes constitutes acceptance
            of the updated policy.
          </Body>
        </Section>

        <Section title="Contact" theme={theme}>
          <Body theme={theme}>
            If you have any questions about this Privacy Policy or our data practices, contact us
            at{" "}
            <Text
              style={{ color: theme.colors.primary }}
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            >
              {CONTACT_EMAIL}
            </Text>
            .
          </Body>
        </Section>
          <Text
              style={{ color: theme.colors.primary, fontSize: 13, textAlign: "center", marginBottom: 8 }}
              onPress={() => Linking.openURL("https://combet.live/privacy")}
            >
              View this policy at combet.live/privacy
            </Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </GradientBackground>
  );
}

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 14, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", padding: 16, gap: 8 }}>
        {children}
      </View>
    </View>
  );
}

function Body({ children, theme }: { children: React.ReactNode; theme: any }) {
  return (
    <Text style={{ color: theme.colors.onSurface, fontSize: 14, lineHeight: 22 }}>
      {children}
    </Text>
  );
}

function Bullet({ text, theme }: { text: string; theme: any }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Text style={{ color: theme.colors.primary, fontSize: 14, lineHeight: 22 }}>•</Text>
      <Text style={{ color: theme.colors.onSurface, fontSize: 14, lineHeight: 22, flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    scroll: { paddingBottom: 40 },
  });
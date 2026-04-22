import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, Switch, Divider, ActivityIndicator } from "react-native-paper";
import { router } from "expo-router";
import { getSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import GradientBackground from "@/components/GradientBackground";
import PageHeader from "@/components/PageHeader";
import { API_BASE } from "@/constants/api";

type Prefs = {
  notify_new_follower:    boolean;
  notify_follow_request:  boolean;
  notify_follow_accepted: boolean;
  notify_circle_invite:   boolean;
  notify_circle_join_request: boolean;
  notify_bet_deadline:    boolean;
  notify_messages:        boolean;
};

const DEFAULT_PREFS: Prefs = {
  notify_new_follower:        true,
  notify_follow_request:      true,
  notify_follow_accepted:     true,
  notify_circle_invite:       true,
  notify_circle_join_request: true,
  notify_bet_deadline:        true,
  notify_messages:            true,
};

type PrefKey = keyof Prefs;

const SECTIONS: { title: string; items: { key: PrefKey; label: string; description: string }[] }[] = [
  {
    title: "People",
    items: [
      { key: "notify_new_follower",    label: "New Followers",     description: "When someone follows you" },
      { key: "notify_follow_request",  label: "Follow Requests",   description: "When someone requests to follow you" },
      { key: "notify_follow_accepted", label: "Follow Accepted",   description: "When someone accepts your follow request" },
    ],
  },
  {
    title: "Circles",
    items: [
      { key: "notify_circle_invite",       label: "Circle Invites",       description: "When you're invited to join a circle" },
      { key: "notify_circle_join_request", label: "Circle Join Requests", description: "When someone requests to join your circle" },
    ],
  },
  {
    title: "Bets",
    items: [
      { key: "notify_bet_deadline", label: "Bet Deadlines", description: "Reminders 24 hours before a bet closes" },
    ],
  },
  {
    title: "Messages",
    items: [
      { key: "notify_messages", label: "Direct Messages", description: "When you receive a new message" },
    ],
  },
];

export default function NotificationPreferencesScreen() {
  const { theme } = useAppTheme();
  const [prefs, setPrefs]     = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<PrefKey | null>(null);
  const [allSaving, setAllSaving] = useState(false);

  const allOn  = Object.values(prefs).every(Boolean);
  const allOff = Object.values(prefs).every((v) => !v);

  useEffect(() => {
    void fetchPrefs();
  }, []);

  const fetchPrefs = async () => {
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/users/me/notification-preferences`, {
        headers: { "x-session-id": sessionId },
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs({ ...DEFAULT_PREFS, ...data });
      }
    } catch (err) {
      console.error("Fetch notification prefs error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (key: PrefKey, value: boolean) => {
    // Optimistic update
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSaving(key);
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/users/me/notification-preferences`, {
        method: "PATCH",
        headers: { "x-session-id": sessionId, "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) {
        // Revert on failure
        setPrefs((prev) => ({ ...prev, [key]: !value }));
      }
    } catch (err) {
      setPrefs((prev) => ({ ...prev, [key]: !value }));
      console.error("Save notification pref error:", err);
    } finally {
      setSaving(null);
    }
  };

  const toggleAll = async (value: boolean) => {
    const allKeys = Object.keys(DEFAULT_PREFS) as PrefKey[];
    const newPrefs = allKeys.reduce((acc, k) => ({ ...acc, [k]: value }), {} as Prefs);
    setPrefs(newPrefs);
    setAllSaving(true);
    try {
      const sessionId = await getSessionId();
      if (!sessionId) return;
      const res = await fetch(`${API_BASE}/users/me/notification-preferences`, {
        method: "PATCH",
        headers: { "x-session-id": sessionId, "Content-Type": "application/json" },
        body: JSON.stringify(newPrefs),
      });
      if (!res.ok) setPrefs(prefs); // revert
    } catch {
      setPrefs(prefs);
    } finally {
      setAllSaving(false);
    }
  };

  const s = styles(theme);

  return (
    <GradientBackground style={{ paddingHorizontal: 20 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        <PageHeader title="Notifications" onBack={() => router.back()} />

        <Text style={s.subtitle}>
          Choose which notifications you want to receive.
        </Text>

        {/* ── All toggle ── */}
        {!loading && (
          <View style={s.allRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.allLabel}>All Notifications</Text>
              <Text style={[s.allDesc, { color: allOn ? "#9dd4be" : allOff ? "#e87060" : theme.colors.onSurfaceVariant }]}>
                {allOn ? "All enabled" : allOff ? "All disabled" : "Some enabled"}
              </Text>
            </View>
            <Switch
              value={allOn}
              onValueChange={() => !allSaving && toggleAll(!allOn)}
              disabled={allSaving}
              color={allOn ? "#9dd4be" : "#e87060"}
            />
          </View>
        )}

        {loading ? (
          <ActivityIndicator animating color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          SECTIONS.map((section, si) => (
            <View key={section.title}>
              <Text style={s.sectionLabel}>{section.title.toUpperCase()}</Text>
              <View style={s.card}>
                {section.items.map((item, idx) => (
                  <View key={item.key}>
                    {idx > 0 && <Divider style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />}
                    <View style={s.row}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={s.label}>{item.label}</Text>
                        <Text style={s.description}>{item.description}</Text>
                      </View>
                      <Switch
                        value={prefs[item.key]}
                        onValueChange={(val) => toggle(item.key, val)}
                        disabled={saving === item.key}
                        color={theme.colors.primary}
                      />
                    </View>
                  </View>
                ))}
              </View>
              {si < SECTIONS.length - 1 && <View style={{ height: 20 }} />}
            </View>
          ))
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 14,
      marginBottom: 24,
      lineHeight: 20,
    },
    sectionLabel: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1,
      marginBottom: 8,
    },
    card: {
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.07)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.1)",
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    label: {
      color: theme.colors.onSurface,
      fontSize: 15,
      fontWeight: "500",
      marginBottom: 2,
    },
    description: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      lineHeight: 16,
    },
    allRow: {
      flexDirection: "row" as const,
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.07)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.1)",
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 24,
    },
    allLabel: {
      color: theme.colors.onSurface,
      fontSize: 15,
      fontWeight: "600" as const,
      marginBottom: 2,
    },
    allDesc: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
  });
import React, { useState } from "react";
import { View, TouchableOpacity, Modal, Pressable, ActivityIndicator } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { getSessionId } from "@/components/sessionStore";
import { API_BASE } from "@/constants/api";

const REASONS = [
  "Spam",
  "Inappropriate content",
  "Harassment",
  "Misinformation",
  "Other",
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
  targetType: "bet" | "user" | "circle";
  targetId: string;
}

export default function ReportModal({ visible, onDismiss, targetType, targetId }: Props) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleDismiss() {
    onDismiss();
    // reset after close animation
    setTimeout(() => {
      setSelectedReason(null);
      setSubmitted(false);
    }, 300);
  }

  async function submitReport() {
    if (!selectedReason) return;
    setSubmitting(true);
    try {
      const sessionId = await getSessionId();
      const endpoint =
          targetType === "bet"
            ? `${API_BASE}/bets/${targetId}/report`
            : targetType === "circle"
            ? `${API_BASE}/circles/${targetId}/report`
            : `${API_BASE}/users/${targetId}/report`;
      await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId ?? "",
        },
        body: JSON.stringify({ reason: selectedReason }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Report submit error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(10,20,30,0.85)",
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
        onPress={handleDismiss}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={{
              backgroundColor: "#1f3347",
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              width: 320,
            }}
          >
            {submitted ? (
              // ── Success state ──────────────────────────────────────────
              <View style={{ alignItems: "center", gap: 12, paddingVertical: 8 }}>
                <View
                  style={{
                    width: 52, height: 52, borderRadius: 26,
                    backgroundColor: "rgba(157,212,190,0.12)",
                    borderWidth: 1, borderColor: "rgba(157,212,190,0.3)",
                    justifyContent: "center", alignItems: "center",
                  }}
                >
                  <Ionicons name="checkmark" size={26} color="#9dd4be" />
                </View>
                <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
                  Report submitted
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 13,
                    textAlign: "center",
                    lineHeight: 18,
                  }}
                >
                  Thanks for letting us know. We'll review this and take action if needed.
                </Text>
                <TouchableOpacity
                  onPress={handleDismiss}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    paddingVertical: 13,
                    borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.07)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#e8edf2", fontWeight: "600", fontSize: 15 }}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // ── Reason selection ───────────────────────────────────────
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <View
                    style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: "rgba(232,112,96,0.12)",
                      borderWidth: 1, borderColor: "rgba(232,112,96,0.3)",
                      justifyContent: "center", alignItems: "center",
                    }}
                  >
                    <Ionicons name="flag-outline" size={20} color="#e87060" />
                  </View>
                  <View>
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                      Report {targetType === "bet" ? "Bet" : "User"}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                      Why are you reporting this?
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 8, marginBottom: 20 }}>
                  {REASONS.map((reason) => {
                    const selected = selectedReason === reason;
                    return (
                      <TouchableOpacity
                        key={reason}
                        onPress={() => setSelectedReason(reason)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 12,
                          backgroundColor: selected
                            ? "rgba(232,112,96,0.1)"
                            : "rgba(255,255,255,0.05)",
                          borderWidth: 1,
                          borderColor: selected
                            ? "rgba(232,112,96,0.4)"
                            : "rgba(255,255,255,0.09)",
                        }}
                      >
                        <Text
                          style={{
                            color: selected ? "#e87060" : "rgba(255,255,255,0.75)",
                            fontSize: 14,
                            fontWeight: selected ? "600" : "400",
                          }}
                        >
                          {reason}
                        </Text>
                        {selected && (
                          <Ionicons name="checkmark-circle" size={18} color="#e87060" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={handleDismiss}
                    disabled={submitting}
                    style={{
                      flex: 1, paddingVertical: 13, borderRadius: 12,
                      backgroundColor: "rgba(255,255,255,0.07)",
                      borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={submitReport}
                    disabled={!selectedReason || submitting}
                    style={{
                      flex: 1, paddingVertical: 13, borderRadius: 12,
                      backgroundColor: selectedReason
                        ? "rgba(232,112,96,0.2)"
                        : "rgba(255,255,255,0.04)",
                      borderWidth: 1,
                      borderColor: selectedReason
                        ? "rgba(232,112,96,0.5)"
                        : "rgba(255,255,255,0.08)",
                      alignItems: "center",
                    }}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#e87060" />
                    ) : (
                      <Text
                        style={{
                          color: selectedReason ? "#e87060" : "rgba(255,255,255,0.25)",
                          fontWeight: "700",
                        }}
                      >
                        Report
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
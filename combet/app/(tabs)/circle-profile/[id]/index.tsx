import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";


type Circle = {
  circle_id: string;
  name: string;
  description?: string;
  icon?: string;
};

export default function CircleProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const circleId = Array.isArray(id) ? id[0] : id;

  const [circle, setCircle] = useState<Circle | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "live">("history");

  useFocusEffect(
    useCallback(() => {
    if (!circleId) return;

    fetch(`http://localhost:3001/circles/${circleId}`)
      .then((res) => res.json())
      .then((data) => setCircle(data))
      .catch((err) => console.error(err));
  }, [circleId])
  );

  if (!circle) return null;

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => router.replace('/circles')}
        >
          <Ionicons name="arrow-back" size={22} color="white"/>
          <Text style={styles.backText}>See all Circles</Text>
        </TouchableOpacity>
      </View>

      {/* Page Title */}
      <Text style={styles.pageTitle}>Circle Profile</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.circleIcon}>
            <Ionicons
              name={(circle.icon as any) || "people"}
              size={40}
              color="white"
            />
          </View>

          <Text style={styles.circleName}>{circle.name}</Text>

          {circle.description ? (
            <Text style={styles.circleDescription}>
              {circle.description}
            </Text>
          ) : null}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.sideButton}>
              <Text style={styles.sideButtonText}>See Members</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                router.push(`/circle-profile/${circleId}/edit`)
              }
            >
              <Text style={styles.editButtonText}>Edit Circle</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideButton}>
              <Text style={styles.sideButtonText}>Add Friend</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "history" && styles.activeTab,
            ]}
            onPress={() => setActiveTab("history")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "history" && styles.activeTabText,
              ]}
            >
              Circle History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "live" && styles.activeTab,
            ]}
            onPress={() => setActiveTab("live")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "live" && styles.activeTabText,
              ]}
            >
              Live Bets
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.contentArea}>
          {activeTab === "history" ? (
            <Text style={styles.placeholder}>
              History coming from DB soon
            </Text>
          ) : (
            <Text style={styles.placeholder}>
              Live bets coming from DB soon
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#051120",
  },

  topHeader: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  backText: {
    color: "white",
    fontSize: 16,
    marginLeft: 8,
  },

  profileSection: {
    alignItems: "center",
    marginTop: 20,
  },

  circleIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2E6CF6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  circleName: {
    color: "white",
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 6,
  },

  circleDescription: {
    color: "#aaa",
    textAlign: "center",
    marginBottom: 18,
    paddingHorizontal: 30,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },

  sideButton: {
    backgroundColor: "#1F2C44",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  editButton: {
    backgroundColor: "#2E6CF6",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  sideButtonText: {
    color: "white",
    fontSize: 14,
  },

  editButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },

  tabRow: {
    flexDirection: "row",
    marginTop: 10,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#0F223A",
    alignItems: "center",
  },

  activeTab: {
    backgroundColor: "#2E6CF6",
  },

  tabText: {
    color: "#aaa",
  },

  activeTabText: {
    color: "white",
    fontWeight: "500",
  },

  contentArea: {
    padding: 20,
  },

  placeholder: {
    color: "#aaa",
  },
  navRow: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },

  pageTitle: {
      color: "white",
      fontSize: 20,
      fontWeight: "600",
      marginTop: 10,
      marginBottom: 0,
      alignSelf: "center",
    },
});
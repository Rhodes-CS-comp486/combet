import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ── Avatar config ─────────────────────────────────────────────────────────────
export const AVATAR_COLORS = [
  "#dc2626", // red
  "#be185d", // deep pink
  "#db2777", // pink
  "#9333ea", // violet
  "#7c3aed", // purple
  "#2563eb", // blue
  "#0891b2", // teal
  "#0f766e", // dark teal
  "#16a34a", // green
  "#65a30d", // lime
  "#ca8a04", // yellow
  "#ea580c", // orange
];

export const AVATAR_ICONS: { key: string; label: string; icon: string }[] = [
  // Default
  { key: "initials",     label: "Initials",   icon: "person-outline" },
  // Animals
  { key: "paw",          label: "Paw",        icon: "paw-outline" },
  { key: "fish",         label: "Fish",       icon: "fish-outline" },
  { key: "bug",          label: "Bug",        icon: "bug-outline" },
  { key: "bird",         label: "Bird",       icon: "egg-outline" },
  { key: "cat",          label: "Cat",        icon: "logo-octocat" },
  { key: "butterfly",    label: "Butterfly",  icon: "color-filter-outline" },
  { key: "leaf",         label: "Leaf",       icon: "leaf-outline" },
  { key: "flower",       label: "Flower",     icon: "flower-outline" },
  // Sports
  { key: "football",     label: "Football",   icon: "american-football-outline" },
  { key: "basketball",   label: "Basketball", icon: "basketball-outline" },
  { key: "baseball",     label: "Baseball",   icon: "baseball-outline" },
  { key: "trophy",       label: "Trophy",     icon: "trophy-outline" },
  { key: "medal",        label: "Medal",      icon: "medal-outline" },
  { key: "barbell",      label: "Fitness",    icon: "barbell-outline" },
  { key: "bicycle",      label: "Cycling",    icon: "bicycle-outline" },
  { key: "football2",    label: "Soccer",     icon: "football-outline" },
  { key: "tennisball",   label: "Tennis",     icon: "tennisball-outline" },
  { key: "golf",         label: "Golf",       icon: "golf-outline" },
  // Fantasy
  { key: "skull",        label: "Skull",      icon: "skull-outline" },
  { key: "rocket",       label: "Rocket",     icon: "rocket-outline" },
  { key: "planet",       label: "Planet",     icon: "planet-outline" },
  { key: "diamond",      label: "Diamond",    icon: "diamond-outline" },
  { key: "nuclear",      label: "Hazard",     icon: "nuclear-outline" },
  { key: "magnet",       label: "Magnet",     icon: "magnet-outline" },
  { key: "prism",        label: "Prism",      icon: "prism-outline" },
  // Cute
  { key: "heart",        label: "Heart",      icon: "heart-outline" },
  { key: "star",         label: "Star",       icon: "star-outline" },
  { key: "sparkles",     label: "Sparkles",   icon: "sparkles-outline" },
  { key: "ribbon",       label: "Ribbon",     icon: "ribbon-outline" },
  { key: "balloon",      label: "Balloon",    icon: "balloon-outline" },
  { key: "gift",         label: "Gift",       icon: "gift-outline" },
  { key: "icecream",     label: "Ice Cream",  icon: "ice-cream-outline" },
  { key: "happy",        label: "Happy",      icon: "happy-outline" },
  { key: "sunny",        label: "Sunny",      icon: "sunny-outline" },
  { key: "rose",         label: "Rose",       icon: "rose-outline" },
  // Nature
  { key: "flame",        label: "Fire",       icon: "flame-outline" },
  { key: "moon",         label: "Moon",       icon: "moon-outline" },
  { key: "snow",         label: "Snow",       icon: "snow-outline" },
  { key: "thunderstorm", label: "Storm",      icon: "thunderstorm-outline" },
  { key: "water",        label: "Water",      icon: "water-outline" },
  // Food & fun
  { key: "pizza",        label: "Pizza",      icon: "pizza-outline" },
  { key: "beer",         label: "Beer",       icon: "beer-outline" },
  { key: "cafe",         label: "Coffee",     icon: "cafe-outline" },
  { key: "game",         label: "Gaming",     icon: "game-controller-outline" },
  { key: "music",        label: "Music",      icon: "musical-notes-outline" },
  { key: "car",          label: "Car",        icon: "car-outline" },
  { key: "camera",       label: "Camera",     icon: "camera-outline" },
  { key: "book",         label: "Book",       icon: "book-outline" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
export type AvatarUser = {
  display_name?: string;
  username?: string;
  avatar_color?: string;
  avatar_icon?: string;
};

// ── Component ─────────────────────────────────────────────────────────────────
type Props = {
  user: AvatarUser | null;
  size?: number;
  onPress?: () => void;
  showEditBadge?: boolean;
  borderColor?: string;
};

export default function UserAvatar({
  user,
  size = 40,
  onPress,
  showEditBadge = false,
  borderColor = "#0a0e17",
}: Props) {
  const displayName = user?.display_name || user?.username || "U";
  const initials = displayName.slice(0, 2).toUpperCase();
  const color = user?.avatar_color ?? "#2563eb";
  const iconKey = user?.avatar_icon ?? "initials";
  const iconConfig = AVATAR_ICONS.find(i => i.key === iconKey);
  const iconName = iconConfig?.icon ?? "person-outline";
  const iconSize = size * 0.45;
  const badgeSize = size * 0.3;
  const badgeIconSize = size * 0.13;

  const content = (
    <View style={{ position: "relative" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {iconKey === "initials" ? (
          <Text style={{ color: "#fff", fontSize: size * 0.3, fontWeight: "700" }}>
            {initials}
          </Text>
        ) : (
          <Ionicons name={iconName as any} size={iconSize} color="#fff" />
        )}
      </View>

      {showEditBadge && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: "#2563eb",
            borderWidth: 2,
            borderColor,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="pencil" size={badgeIconSize} color="#fff" />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }

  return content;
}

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "session_id";

export async function getSessionId(): Promise<string | null> {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(KEY);
  }
  return SecureStore.getItemAsync(KEY);
}

export async function setSessionId(value: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem(KEY, value);
    return;
  }
  await SecureStore.setItemAsync(KEY, value);
}

export async function deleteSessionId(): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}

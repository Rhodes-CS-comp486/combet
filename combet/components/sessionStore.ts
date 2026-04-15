import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "session_id";

export async function getSessionId(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return typeof window !== "undefined"
        ? window.localStorage.getItem(KEY)
        : null;
    }
    return await SecureStore.getItemAsync(KEY);
  } catch (e) {
    console.error("getSessionId error:", e);
    return null;
  }
}

export async function setSessionId(value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(KEY, value);
      }
      return;
    }
    await SecureStore.setItemAsync(KEY, value);
  } catch (e) {
    console.error("setSessionId error:", e);
  }
}

export async function deleteSessionId(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(KEY);
  } catch (e) {
    console.error("deleteSessionId error:", e);
  }
}

const SPIN_KEY = "last_spin_date";

export async function getLastSpinDate(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return typeof window !== "undefined"
        ? window.localStorage.getItem(SPIN_KEY)
        : null;
    }
    return await SecureStore.getItemAsync(SPIN_KEY);
  } catch (e) {
    console.error("getLastSpinDate error:", e);
    return null;
  }
}

export async function setLastSpinDate(value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SPIN_KEY, value);
      }
      return;
    }
    await SecureStore.setItemAsync(SPIN_KEY, value);
  } catch (e) {
    console.error("setLastSpinDate error:", e);
  }
}

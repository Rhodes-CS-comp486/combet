import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const ADMIN_MODE_KEY = "admin_mode";

type User = {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
};

type UserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  adminMode: boolean;
  toggleAdminMode: () => void;
};

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  adminMode: false,
  toggleAdminMode: () => {},
});

async function getPersistedAdminMode(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return window.localStorage.getItem(ADMIN_MODE_KEY) === "true";
    }
    const val = await SecureStore.getItemAsync(ADMIN_MODE_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

async function persistAdminMode(value: boolean): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.setItem(ADMIN_MODE_KEY, String(value));
      return;
    }
    await SecureStore.setItemAsync(ADMIN_MODE_KEY, String(value));
  } catch {}
}

export function UserContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [adminMode, setAdminMode] = useState(false);

  // Load persisted admin mode on startup
  useEffect(() => {
    getPersistedAdminMode().then(setAdminMode);
  }, []);

  const toggleAdminMode = async () => {
    if (!user?.is_admin) return;
    const next = !adminMode;
    setAdminMode(next);
    await persistAdminMode(next);
  };

  return (
    <UserContext.Provider value={{ user, setUser, adminMode, toggleAdminMode }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
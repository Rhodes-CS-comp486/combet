import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

const API_URL = "http://localhost:3001"; // change to LAN IP if using Expo Go phone

export default function Login() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername, password }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Login failed");

      const data = JSON.parse(text);
      await SecureStore.setItemAsync("session_id", data.session_id);

      router.replace("/(tabs)"); // go to your tabs homepage
    } catch (e: any) {
      setErr(e.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", textAlign: "center" }}>Login</Text>

      <TextInput
        placeholder="Email or Username"
        value={emailOrUsername}
        onChangeText={setEmailOrUsername}
        autoCapitalize="none"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      {err ? <Text style={{ color: "crimson", textAlign: "center" }}>{err}</Text> : null}

      <Pressable
        onPress={onLogin}
        disabled={loading}
        style={{ backgroundColor: "#111", padding: 14, borderRadius: 12, opacity: loading ? 0.7 : 1 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
          {loading ? "Logging in..." : "Login"}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push("/register")} style={{ padding: 12 }}>
        <Text style={{ textAlign: "center", fontWeight: "600" }}>Create an account</Text>
      </Pressable>
    </View>
  );
}

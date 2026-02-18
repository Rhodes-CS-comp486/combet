import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

const API_URL = "http://localhost:3001"; // change to LAN IP if using Expo Go phone

export default function Register() {
  const [first_name, setFirst] = useState("");
  const [last_name, setLast] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    setErr(null);
    if (!first_name || !last_name || !username || !email || !password) {
      setErr("Please fill out all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name, last_name, username, email, password }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Registration failed");

      const data = JSON.parse(text);
      await SecureStore.setItemAsync("session_id", data.session_id);

      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "800", textAlign: "center" }}>Create account</Text>

      <TextInput placeholder="First name" value={first_name} onChangeText={setFirst}
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput placeholder="Last name" value={last_name} onChangeText={setLast}
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none"
        keyboardType="email-address" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

      {err ? <Text style={{ color: "crimson", textAlign: "center" }}>{err}</Text> : null}

      <Pressable onPress={onRegister} disabled={loading}
        style={{ backgroundColor: "#111", padding: 14, borderRadius: 12, opacity: loading ? 0.7 : 1 }}>
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
          {loading ? "Creating..." : "Create account"}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ padding: 12 }}>
        <Text style={{ textAlign: "center", fontWeight: "600" }}>Back to login</Text>
      </Pressable>
    </View>
  );
}

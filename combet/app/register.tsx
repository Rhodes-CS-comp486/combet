import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { setSessionId } from "@/components/sessionStore";

const API_URL = "http://10.20.60.13:3001"; // change to LAN IP if using Expo Go on phone

export default function Register() {
  const [first_name, setFirst] = useState("");
  const [last_name, setLast] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    setErrorMsg(null);

    if (!first_name || !last_name || !username || !email || !password) {
      setErrorMsg("Please fill out all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        // backend likely returns "Username or email already exists"
        setErrorMsg(text || "Unable to create account.");
        return;
      }

      const data = JSON.parse(text);
      await setSessionId(data.session_id);

      router.replace("/(tabs)");
    } catch {
      setErrorMsg("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>COMBET</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Enter your information below</Text>

          <Text style={styles.label}>First name</Text>
          <TextInput
            value={first_name}
            onChangeText={setFirst}
            placeholder="First name"
            placeholderTextColor="#8A94A6"
            style={styles.input}
          />

          <Text style={styles.label}>Last name</Text>
          <TextInput
            value={last_name}
            onChangeText={setLast}
            placeholder="Last name"
            placeholderTextColor="#8A94A6"
            style={styles.input}
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="Choose a username"
            placeholderTextColor="#8A94A6"
            style={styles.input}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#8A94A6"
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Create a password"
            placeholderTextColor="#8A94A6"
            style={styles.input}
          />

          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

          <Pressable
            onPress={onRegister}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || loading) && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Creating..." : "Create account"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.linkText}>Back to login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#091C32" },
  container: { flexGrow: 1, justifyContent: "center", padding: 20 },
  brand: {
    textAlign: "center",
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 18,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  title: {
  color: "white",
  fontSize: 22,
  fontWeight: "800",
  textAlign: "center",
},

subtitle: {
  color: "rgba(255,255,255,0.75)",
  marginTop: 4,
  marginBottom: 16,
  textAlign: "center",
},

  label: { color: "rgba(255,255,255,0.85)", marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  error: {
    color: "#FF6B6B",
    marginTop: 2,
    marginBottom: 10,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#091C32",
    fontWeight: "900",
    fontSize: 16,
  },
  linkBtn: { marginTop: 12, paddingVertical: 10, alignItems: "center" },
  linkText: { color: "white", fontWeight: "700" },
});

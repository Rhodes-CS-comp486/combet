import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { setSessionId } from "@/components/sessionStore";

const API_URL = "http://10.20.60.13:3001"; // change to LAN IP if using Expo Go on phone

export default function Login() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOrUsername: emailOrUsername.trim(),
          password,
        }),
      });

      // If login fails, show the this message
      if (!res.ok) {
        setErrorMsg("The login information you entered is incorrect.");
        return;
      }

      // gives session_id when logged in
      const data = await res.json();
      await setSessionId(data.session_id);


      router.replace("/(tabs)");
    } catch {
      // network/server down
      setErrorMsg("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.container}>
        <Text style={styles.brand}>COMBET</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.subtitle}>Log in to continue</Text>

          <Text style={styles.label}>Email or Username</Text>
          <TextInput
            value={emailOrUsername}
            onChangeText={setEmailOrUsername}
            autoCapitalize="none"
            placeholder="Enter your email or username"
            placeholderTextColor="#8A94A6"
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
            placeholderTextColor="#8A94A6"
            style={styles.input}
          />

          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

          <Pressable
            onPress={onLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || loading) && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Logging in..." : "Log In"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/register")}
            style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.linkText}>Create an account</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#091C32" },
  container: { flex: 1, justifyContent: "center", padding: 20 },
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

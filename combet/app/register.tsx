import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Text, TextInput, Button, Surface, HelperText } from "react-native-paper";
import { router } from "expo-router";
import { setSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";

const API_URL = "http://localhost:3001"; // change to LAN IP if using Expo Go on phone

export default function Register() {
  const { theme } = useAppTheme();

  const [first_name, setFirst]            = useState("");
  const [last_name, setLast]              = useState("");
  const [username, setUsername]           = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);

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
          last_name:  last_name.trim(),
          username:   username.trim(),
          email:      email.trim().toLowerCase(),
          password,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Brand ── */}
        <Text
          variant="headlineLarge"
          style={{
            textAlign:     "center",
            color:         theme.colors.primary,
            fontWeight:    "900",
            letterSpacing: 3,
            marginBottom:  24,
          }}
        >
          COMBET
        </Text>

        {/* ── Card ── */}
        <Surface
          elevation={2}
          style={{
            borderRadius:    18,
            padding:         24,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text
            variant="titleLarge"
            style={{
              textAlign:    "center",
              fontWeight:   "800",
              color:        theme.colors.onSurface,
              marginBottom: 4,
            }}
          >
            Create account
          </Text>

          <Text
            variant="bodyMedium"
            style={{
              textAlign:    "center",
              color:        theme.colors.onSurfaceVariant,
              marginBottom: 24,
            }}
          >
            Enter your information below
          </Text>

          {/* ── First & Last name row ── */}
          <TextInput
            label="First name"
            value={first_name}
            onChangeText={setFirst}
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
            style={{ marginBottom: 12 }}
          />

          <TextInput
            label="Last name"
            value={last_name}
            onChangeText={setLast}
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
            style={{ marginBottom: 12 }}
          />

          {/* ── Username ── */}
          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            mode="outlined"
            left={<TextInput.Icon icon="at" />}
            style={{ marginBottom: 12 }}
          />

          {/* ── Email ── */}
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            mode="outlined"
            left={<TextInput.Icon icon="email" />}
            style={{ marginBottom: 12 }}
          />

          {/* ── Password ── */}
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            mode="outlined"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={passwordVisible ? "eye-off" : "eye"}
                onPress={() => setPasswordVisible((v) => !v)}
              />
            }
            style={{ marginBottom: 4 }}
          />

          {/* ── Error ── */}
          <HelperText type="error" visible={!!errorMsg} style={{ marginBottom: 8 }}>
            {errorMsg}
          </HelperText>

          {/* ── Register Button ── */}
          <Button
            mode="contained"
            onPress={onRegister}
            loading={loading}
            disabled={loading}
            contentStyle={{ paddingVertical: 6 }}
            labelStyle={{ fontWeight: "900", fontSize: 16 }}
            style={{ borderRadius: 12, marginTop: 4 }}
          >
            {loading ? "Creating..." : "Create account"}
          </Button>

          {/* ── Back to login ── */}
          <Button
            mode="text"
            onPress={() => router.back()}
            style={{ marginTop: 8 }}
            labelStyle={{ color: theme.colors.onSurfaceVariant }}
          >
            Back to login
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
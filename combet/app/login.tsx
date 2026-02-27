import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Text, TextInput, Button, Surface, HelperText } from "react-native-paper";
import { router } from "expo-router";
import { setSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";

const API_URL = "http://localhost:3001"; // change to LAN IP if using Expo Go on phone

export default function Login() {
  const { theme } = useAppTheme();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword]               = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMsg, setErrorMsg]               = useState<string | null>(null);
  const [loading, setLoading]                 = useState(false);

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

      if (!res.ok) {
        setErrorMsg("The login information you entered is incorrect.");
        return;
      }

      const data = await res.json();
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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 20,
        }}
      >
        {/* ── Brand ── */}
        <Text
          variant="headlineLarge"
          style={{
            textAlign:    "center",
            color:        theme.colors.primary,
            fontWeight:   "900",
            letterSpacing: 3,
            marginBottom: 24,
          }}
        >
          COMBET
        </Text>

        {/* ── Card ── */}
        <Surface
          elevation={2}
          style={{
            borderRadius:      18,
            padding:           24,
            backgroundColor:   theme.colors.surface,
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
            Welcome back!
          </Text>

          <Text
            variant="bodyMedium"
            style={{
              textAlign:    "center",
              color:        theme.colors.onSurfaceVariant,
              marginBottom: 24,
            }}
          >
            Log in to continue
          </Text>

          {/* ── Email or Username ── */}
          <TextInput
            label="Email or Username"
            value={emailOrUsername}
            onChangeText={setEmailOrUsername}
            autoCapitalize="none"
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
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

          {/* ── Login Button ── */}
          <Button
            mode="contained"
            onPress={onLogin}
            loading={loading}
            disabled={loading}
            contentStyle={{ paddingVertical: 6 }}
            labelStyle={{ fontWeight: "900", fontSize: 16 }}
            style={{ borderRadius: 12, marginTop: 4 }}
          >
            {loading ? "Logging in..." : "Log In"}
          </Button>

          {/* ── Register Link ── */}
          <Button
            mode="text"
            onPress={() => router.push("/register")}
            style={{ marginTop: 8 }}
            labelStyle={{ color: theme.colors.onSurfaceVariant }}
          >
            Create an account
          </Button>
        </Surface>
      </View>
    </KeyboardAvoidingView>
  );
}
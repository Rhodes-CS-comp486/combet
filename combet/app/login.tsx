import React, {useEffect, useState} from "react";
import {KeyboardAvoidingView, Platform, TouchableOpacity, View} from "react-native";
import { Text, TextInput, Button, Surface, HelperText } from "react-native-paper";
import { router } from "expo-router";
import { setSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { API_BASE } from "@/constants/api";
import GradientBackground from "@/components/GradientBackground";

export default function Login() {
  const { theme } = useAppTheme();
  const { setUser } = useUser();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword]               = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMsg, setErrorMsg]               = useState<string | null>(null);
  const [loading, setLoading]                 = useState(false);

  const onLogin = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
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
      setUser(data.user);
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
    style={{ flex: 1 }}
  >
    <GradientBackground style={{ paddingHorizontal: 24 }}>
      <View style={{ flex: 1, justifyContent: "center" }}>

        <Text style={{
          textAlign: "center",
          color: "#ffffff",
          fontWeight: "300",
          letterSpacing: 6,
          fontSize: 32,
          marginBottom: 8,
        }}>
          COMBET
        </Text>
        <Text style={{
          textAlign: "center",
          color: theme.colors.onSurfaceVariant,
          marginBottom: 48,
          fontSize: 14,
        }}>
          Log in to continue
        </Text>

        <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12 }}>
          <TextInput
            label="Email or Username"
            value={emailOrUsername}
            onChangeText={setEmailOrUsername}
            autoCapitalize="none"
            mode="flat"
            left={<TextInput.Icon icon="account" />}
            style={{ backgroundColor: "transparent" }}
            underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
          />
        </View>

        <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 4 }}>
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            mode="flat"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={passwordVisible ? "eye-off" : "eye"}
                onPress={() => setPasswordVisible((v) => !v)}
              />
            }
            style={{ backgroundColor: "transparent" }}
            underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
          />
        </View>

        <HelperText type="error" visible={!!errorMsg} style={{ marginBottom: 8 }}>
          {errorMsg}
        </HelperText>

        <Button
          mode="contained"
          onPress={onLogin}
          loading={loading}
          disabled={loading}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: "400", fontSize: 16 }}
          style={{ borderRadius: 12, marginTop: 4 }}
        >
          {loading ? "Logging in..." : "Log In"}
        </Button>

        <Button
          mode="text"
          onPress={() => router.push("/register" as any)}
          style={{ marginTop: 8 }}
          labelStyle={{ color: theme.colors.onSurfaceVariant }}
        >
          Create an account
        </Button>
      </View>
    </GradientBackground>
  </KeyboardAvoidingView>
);
}
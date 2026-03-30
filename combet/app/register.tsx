import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Text, TextInput, Button, Surface, HelperText } from "react-native-paper";
import { router } from "expo-router";
import { setSessionId } from "@/components/sessionStore";
import { useAppTheme } from "@/context/ThemeContext";
import { View } from "react-native";
import GradientBackground from "@/components/GradientBackground";
import { API_BASE } from "@/constants/api";



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
      const res = await fetch(`${API_BASE}/auth/register`, {
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
    style={{ flex: 1 }}
  >
    <GradientBackground style={{ paddingHorizontal: 24 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
          marginBottom: 40,
          fontSize: 14,
        }}>
          Create your account
        </Text>

        <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12 }}>
          <TextInput label="First name" value={first_name} onChangeText={setFirst}
            mode="flat" left={<TextInput.Icon icon="account" />}
            style={{ backgroundColor: "transparent" }} underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
          />
        </View>

        <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12 }}>
          <TextInput label="Last name" value={last_name} onChangeText={setLast}
            mode="flat" left={<TextInput.Icon icon="account" />}
            style={{ backgroundColor: "transparent" }} underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
          />
        </View>

        <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12 }}>
          <TextInput label="Username" value={username} onChangeText={setUsername}
            autoCapitalize="none" mode="flat" left={<TextInput.Icon icon="at" />}
            style={{ backgroundColor: "transparent" }} underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
          />
        </View>

        <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12 }}>
          <TextInput label="Email" value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address" mode="flat"
            left={<TextInput.Icon icon="email" />}
            style={{ backgroundColor: "transparent" }} underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
          />
        </View>

        <View style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 4 }}>
          <TextInput label="Password" value={password} onChangeText={setPassword}
            secureTextEntry={!passwordVisible} mode="flat"
            left={<TextInput.Icon icon="lock" />}
            right={<TextInput.Icon icon={passwordVisible ? "eye-off" : "eye"} onPress={() => setPasswordVisible((v) => !v)} />}
            style={{ backgroundColor: "transparent" }} underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            theme={{ colors: { onSurfaceVariant: theme.colors.onSurfaceVariant, primary: theme.colors.primary } }}
          />
        </View>

        <HelperText type="error" visible={!!errorMsg} style={{ marginBottom: 8 }}>
          {errorMsg}
        </HelperText>

        <Button
          mode="contained"
          onPress={onRegister}
          loading={loading}
          disabled={loading}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: "400", fontSize: 16 }}
          style={{ borderRadius: 12, marginTop: 4 }}
        >
          {loading ? "Creating..." : "Create account"}
        </Button>

        <Button
          mode="text"
          onPress={() => router.back()}
          style={{ marginTop: 8 }}
          labelStyle={{ color: theme.colors.onSurfaceVariant }}
        >
          Back to login
        </Button>
      </ScrollView>
    </GradientBackground>
  </KeyboardAvoidingView>
);


}
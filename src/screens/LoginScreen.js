import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const handleLogin = async () => {
    if (!employeeId.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter Employee ID and password.");
      return;
    }
    try {
      setLoading(true);
      await login({ email: employeeId.trim(), password });
      router.replace("/home");
    } catch (err) {
      Alert.alert("Login Failed", err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.govHeader}>
          <View style={styles.emblemContainer}>
            <Text style={styles.emblemEmoji}>🏛️</Text>
          </View>
          <View>
            <Text style={styles.govTitle}>Datalake 3.0</Text>
            <Text style={styles.govSubtitle}>
              Field Personnel Verification System
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Login</Text>

          <TextInput
            style={[
              styles.input,
              focused === "employeeId" && styles.inputFocused,
            ]}
            placeholder="Employee ID (e.g. NHAI001)"
            placeholderTextColor="#999"
            value={employeeId}
            onChangeText={setEmployeeId}
            onFocus={() => setFocused("employeeId")}
            onBlur={() => setFocused(null)}
            keyboardType="default"
            autoCapitalize="characters"
          />

          <TextInput
            style={[
              styles.input,
              focused === "password" && styles.inputFocused,
            ]}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            secureTextEntry
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </Pressable>

          <View style={styles.row}>
            <Text style={styles.helpText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push("/register")}>
              <Text style={styles.link}>Register</Text>
            </Pressable>
          </View>

          <View style={styles.poweredBy}>
            <Text style={styles.poweredText}>powered by </Text>
            <Text style={styles.digitalIndia}>🇮🇳 Digital India</Text>
          </View>
        </View>

        <Text style={styles.version}>APP VERSION: V1.0.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#E8EDF2" },
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 24,
  },
  govHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 4,
  },
  emblemContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D0D8E4",
    elevation: 2,
  },
  emblemEmoji: { fontSize: 28 },
  govTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B3E7B",
    letterSpacing: 0.3,
  },
  govSubtitle: { fontSize: 11, color: "#666", marginTop: 2 },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 28,
    gap: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#D0D8E4",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A1A1A",
    backgroundColor: "#FAFBFC",
  },
  inputFocused: { borderColor: "#1B3E7B" },
  button: {
    backgroundColor: "#1B3E7B",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    elevation: 2,
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  row: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  helpText: { color: "#666", fontSize: 13 },
  link: { color: "#1B3E7B", fontSize: 13, fontWeight: "700" },
  poweredBy: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  poweredText: { color: "#999", fontSize: 12 },
  digitalIndia: { color: "#138808", fontSize: 12, fontWeight: "700" },
  version: { color: "#999", fontSize: 11, letterSpacing: 1 },
});

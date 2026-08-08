import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

function paramsFromUrl(url: string) {
  const query = url.includes("?") ? (url.split("?")[1] ?? "").split("#")[0] : "";
  const fragment = url.includes("#") ? (url.split("#")[1] ?? "") : "";
  return new URLSearchParams(query || fragment);
}

async function establishRecoverySession(url: string | null) {
  if (!url) return false;
  const params = paramsFromUrl(url);
  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return !error;
  }
  return false;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkReady, setLinkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    const handleUrl = async (url: string | null) => {
      const established = await establishRecoverySession(url);
      const { data: { session } } = await supabase.auth.getSession();
      if (active) {
        setLinkReady(established || Boolean(session));
        setCheckingLink(false);
      }
    };
    Linking.getInitialURL().then(handleUrl).catch(() => {
      if (active) setCheckingLink(false);
    });
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url).catch(() => {
        if (active) setCheckingLink(false);
      });
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const handleSubmit = async () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
    setTimeout(() => router.replace("/"), 1800);
  };

  if (checkingLink) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={NAVY} />
        <Text style={styles.statusText}>Preparing your secure reset link…</Text>
      </View>
    );
  }

  if (!linkReady) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredTitle}>This reset link is invalid or has expired.</Text>
        <Text style={styles.statusText}>Request a new password reset link to continue.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace("/login")}>
          <Text style={styles.primaryText}>Return to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoCircle}><Text style={styles.logoText}>EM</Text></View>
        <Text style={styles.title}>EduMetrics</Text>
        <Text style={styles.subtitle}>Set a new password</Text>
        <View style={styles.divider} />
        {done ? (
          <View style={styles.centeredBlock}>
            <View style={styles.checkCircle}><Text style={styles.checkMark}>✓</Text></View>
            <Text style={styles.centeredTitle}>Password updated!</Text>
            <Text style={styles.statusText}>Taking you to the dashboard…</Text>
          </View>
        ) : (
          <View style={styles.formBlock}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="New password (min 6 chars)"
              placeholderTextColor="#aaa"
              secureTextEntry
              autoFocus
            />
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Confirm new password"
              placeholderTextColor="#aaa"
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.primaryBtn, (loading || password.length < 6 || !confirm) && styles.disabled]}
              onPress={handleSubmit}
              disabled={loading || password.length < 6 || !confirm}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Set new password</Text>}
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

const NAVY = "#1e3a5f";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, alignItems: "center", justifyContent: "center", padding: 24 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 340, alignItems: "center", gap: 12 },
  logoCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 20, fontFamily: "Poppins_700Bold" },
  title: { fontSize: 22, fontFamily: "Poppins_700Bold", color: NAVY },
  subtitle: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#888" },
  divider: { width: "100%", height: 1, backgroundColor: "#f0f0f0", marginVertical: 4 },
  formBlock: { width: "100%", gap: 10 },
  input: { width: "100%", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, fontFamily: "Poppins_400Regular", color: "#333" },
  primaryBtn: { width: "100%", backgroundColor: NAVY, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontSize: 14, fontFamily: "Poppins_500Medium" },
  disabled: { opacity: 0.6 },
  centeredBlock: { alignItems: "center", gap: 10, paddingVertical: 4 },
  checkCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#ecfdf5", alignItems: "center", justifyContent: "center" },
  checkMark: { fontSize: 22, color: "#10b981", fontFamily: "Poppins_700Bold" },
  centeredTitle: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#333" },
  statusText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#888", textAlign: "center" },
  errorText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#ef4444", textAlign: "center" },
});
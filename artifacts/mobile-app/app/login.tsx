import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const redirectTo = AuthSession.makeRedirectUri({ scheme: "edumetrics" });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error("No auth URL returned");

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success") {
        const url = result.url;
        const params = new URLSearchParams(url.split("?")[1] ?? url.split("#")[1] ?? "");
        const code = params.get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      }
    } catch (err: unknown) {
      Alert.alert("Sign in failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.card}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>EM</Text>
        </View>

        <Text style={styles.title}>EduMetrics</Text>
        <Text style={styles.subtitle}>School Exam Management</Text>

        <View style={styles.divider} />

        <Text style={styles.signinLabel}>Sign in to continue</Text>

        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#666" />
          ) : (
            <Text style={styles.googleIcon}>G</Text>
          )}
          <Text style={styles.googleBtnText}>
            {loading ? "Signing in…" : "Continue with Google"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>For authorized school staff only</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 36,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  logoText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
  },
  title: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    color: "#1e3a5f",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#888",
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 4,
  },
  signinLabel: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#555",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
    backgroundColor: "#fff",
  },
  googleBtnDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#4285F4",
  },
  googleBtnText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#333",
  },
  footer: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#aaa",
    textAlign: "center",
    marginTop: 4,
  },
});

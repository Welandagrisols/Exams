import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

type Mode = "options" | "password" | "signup" | "signup_sent" | "email" | "email_sent";

/** Pulls a Supabase auth `code` out of a redirect URL and exchanges it for a
 * session. Used for the Google OAuth round-trip, and for links tapped from
 * a sign-up confirmation or magic-link email (mirrors the web app's single
 * /auth/callback handler). */
async function completeSessionFromUrl(url: string | null) {
  if (!url) return false;
  const params = new URLSearchParams(url.split("?")[1] ?? url.split("#")[1] ?? "");
  const code = params.get("code");
  if (!code) return false;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return !error;
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledInitialUrl = useRef(false);

  // Catch sign-up-confirmation and magic-link taps that open the app from
  // outside (Mail app, etc.) — both a cold start and an already-running app.
  useEffect(() => {
    if (!handledInitialUrl.current) {
      handledInitialUrl.current = true;
      Linking.getInitialURL().then(completeSessionFromUrl).catch(() => {});
    }
    const sub = Linking.addEventListener("url", ({ url }) => {
      completeSessionFromUrl(url).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const reset = () => {
    setError(null);
    setMode("options");
    setPassword("");
  };

  const redirectTo = () => AuthSession.makeRedirectUri({ scheme: "edumetrics" });

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const uri = redirectTo();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: uri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error("No auth URL returned");

      const result = await WebBrowser.openAuthSessionAsync(data.url, uri);

      if (result.type === "success") {
        await completeSessionFromUrl(result.url);
      }
    } catch (err: unknown) {
      Alert.alert("Sign in failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed")) {
        setError("Your email hasn't been confirmed yet. Try 'Email magic link' to sign in without confirming, or check your inbox for the confirmation link.");
      } else if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        setError("Incorrect email or password. Check your details or create a new account.");
      } else {
        setError(error.message);
      }
      setLoading(false);
    }
    // On success, AuthContext's onAuthStateChange listener picks up the new
    // session and the app navigates away from this screen automatically.
  };

  const handleSignUp = async () => {
    if (!email.trim() || password.length < 6) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      setLoading(false);
    } else {
      setMode("signup_sent");
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMode("email_sent");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>EM</Text>
          </View>

          <Text style={styles.title}>EduMetrics</Text>
          <Text style={styles.subtitle}>School Exam Management</Text>

          <View style={styles.divider} />

          {mode === "signup_sent" && (
            <View style={styles.centeredBlock}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={styles.centeredTitle}>Check your email</Text>
              <Text style={styles.centeredBody}>
                We sent a confirmation link to <Text style={styles.emphasis}>{email}</Text>.{"\n"}
                Tap the link to verify your account and sign in.
              </Text>
              <TouchableOpacity onPress={reset}>
                <Text style={styles.linkBtn}>Use a different email</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === "email_sent" && (
            <View style={styles.centeredBlock}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={styles.centeredTitle}>Check your email</Text>
              <Text style={styles.centeredBody}>
                Sign-in link sent to <Text style={styles.emphasis}>{email}</Text>.{"\n"}
                Tap the link in the email to log in.
              </Text>
              <TouchableOpacity onPress={reset}>
                <Text style={styles.linkBtn}>Use a different method</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === "options" && (
            <View style={styles.formBlock}>
              <Text style={styles.signinLabel}>Sign in to your account</Text>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => setMode("password")} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Sign in with password</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.outlinePrimaryBtn} onPress={() => setMode("signup")} activeOpacity={0.85}>
                <Text style={styles.outlinePrimaryBtnText}>Create an account</Text>
              </TouchableOpacity>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
              </View>

              <TouchableOpacity
                style={[styles.googleBtn, loading && styles.btnDisabled]}
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

              <TouchableOpacity style={styles.outlineBtn} onPress={() => setMode("email")} activeOpacity={0.8}>
                <Text style={styles.outlineBtnText}>Email magic link</Text>
              </TouchableOpacity>

              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}

          {mode === "password" && (
            <View style={styles.formBlock}>
              <Text style={styles.signinLabel}>Sign in with password</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="teacher@school.edu"
                placeholderTextColor="#aaa"
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#aaa"
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.primaryBtn, (loading || !email.trim() || !password) && styles.btnDisabled]}
                onPress={handlePasswordLogin}
                disabled={loading || !email.trim() || !password}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Sign in</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode("signup")}>
                <Text style={styles.linkBtnCenter}>Don't have an account? Create one</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={reset}>
                <Text style={styles.backBtn}>← Back</Text>
              </TouchableOpacity>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}

          {mode === "signup" && (
            <View style={styles.formBlock}>
              <Text style={styles.signinLabel}>Create your account</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="teacher@school.edu"
                placeholderTextColor="#aaa"
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Choose a password (min 6 chars)"
                placeholderTextColor="#aaa"
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.primaryBtn, (loading || !email.trim() || password.length < 6) && styles.btnDisabled]}
                onPress={handleSignUp}
                disabled={loading || !email.trim() || password.length < 6}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Create account</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode("password")}>
                <Text style={styles.linkBtnCenter}>Already have an account? Sign in</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={reset}>
                <Text style={styles.backBtn}>← Back</Text>
              </TouchableOpacity>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}

          {mode === "email" && (
            <View style={styles.formBlock}>
              <Text style={styles.signinLabel}>Enter your email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="teacher@school.edu"
                placeholderTextColor="#aaa"
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.primaryBtn, (loading || !email.trim()) && styles.btnDisabled]}
                onPress={handleMagicLink}
                disabled={loading || !email.trim()}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Send sign-in link</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={reset}>
                <Text style={styles.backBtn}>← Back</Text>
              </TouchableOpacity>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}

          <Text style={styles.footer}>For authorized school staff only</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const NAVY = "#1e3a5f";

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
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
    backgroundColor: NAVY,
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
    color: NAVY,
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
  formBlock: {
    width: "100%",
    gap: 10,
  },
  signinLabel: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#555",
    textAlign: "center",
    marginBottom: 2,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#333",
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },
  outlinePrimaryBtn: {
    width: "100%",
    borderWidth: 1,
    borderColor: NAVY,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  outlinePrimaryBtnText: {
    color: NAVY,
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },
  outlineBtn: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: {
    color: "#444",
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },
  btnDisabled: {
    opacity: 0.6,
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
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginVertical: 2,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#f0f0f0",
  },
  orText: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#aaa",
  },
  linkBtnCenter: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: NAVY,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  backBtn: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#999",
    textAlign: "center",
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#ef4444",
    textAlign: "center",
  },
  centeredBlock: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: 22,
    color: "#10b981",
    fontFamily: "Poppins_700Bold",
  },
  centeredTitle: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
  },
  centeredBody: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
  },
  emphasis: {
    fontFamily: "Poppins_600SemiBold",
    color: NAVY,
  },
  linkBtn: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: NAVY,
    textDecorationLine: "underline",
    marginTop: 2,
  },
  footer: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#aaa",
    textAlign: "center",
    marginTop: 4,
  },
});

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [loading] = useState(false);

  const handleLogin = () => {
    Alert.alert(
      "Sign In",
      "Please sign in via the EduMetrics web portal first, then open the mobile app.",
    );
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
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.loginBtnText}>Log in</Text>
          )}
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
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e3a5f",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#fff",
  },
  footer: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#aaa",
    textAlign: "center",
    marginTop: 4,
  },
});

import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { queryClient } from "@/lib/query-client";
import { useColorScheme } from "react-native";
import palette from "@/constants/colors";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "login";
    if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;

  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <KeyboardProvider>
              <AuthGuard />
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: colors.navHeader },
                  headerTintColor: colors.navHeaderText,
                  headerTitleStyle: { fontFamily: "Poppins_600SemiBold", fontSize: 17 },
                  contentStyle: { backgroundColor: colors.background },
                }}
              >
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="classes/[classId]/students"
                  options={{ title: "Students", headerBackTitle: "Back" }}
                />
                <Stack.Screen
                  name="classes/[classId]/students-add"
                  options={{ title: "Add Student", headerBackTitle: "Back" }}
                />
                <Stack.Screen
                  name="classes/[classId]/students-bulk-scan"
                  options={{ title: "Scan Class List", headerBackTitle: "Back" }}
                />
                <Stack.Screen
                  name="classes/[classId]/exams"
                  options={{ title: "Exams", headerBackTitle: "Back" }}
                />
                <Stack.Screen
                  name="exams/[examId]/rankings"
                  options={{ title: "Rankings", headerBackTitle: "Back" }}
                />
                <Stack.Screen
                  name="exams/[examId]/scores"
                  options={{ title: "Scores", headerBackTitle: "Back" }}
                />
                <Stack.Screen
                  name="exams/[examId]/ocr-upload"
                  options={{ title: "Scan Score Sheet", headerBackTitle: "Back" }}
                />
                <Stack.Screen
                  name="reports/[examId]/[studentId]"
                  options={{ title: "Report Card", headerBackTitle: "Back" }}
                />
                <Stack.Screen
                  name="messages/compose"
                  options={{ title: "New Message", headerBackTitle: "Back", presentation: "modal" }}
                />
                <Stack.Screen
                  name="messages/[id]"
                  options={{ title: "Message", headerBackTitle: "Back" }}
                />
              </Stack>
              <StatusBar style={scheme === "dark" ? "light" : "light"} />
            </KeyboardProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

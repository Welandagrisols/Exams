import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, useColorScheme,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

type Message = {
  id: number;
  type: string;
  title: string;
  body: string;
  recipientCount: number;
  createdAt: string;
  className: string | null;
  examName: string | null;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export default function MessagesScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery<Message[]>({
    queryKey: ["/messages"],
    queryFn: () => apiFetch("/messages"),
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    fab: {
      position: "absolute",
      bottom: 30,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
    item: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginVertical: 5,
      borderRadius: colors.radius,
      padding: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    title: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.foreground,
      flex: 1,
      marginRight: 8,
    },
    time: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
    },
    body: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 4,
      lineHeight: 18,
    },
    metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 10 },
    metaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.muted,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    metaText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
    },
    typeChip: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    typeText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 11,
      color: "#fff",
    },
    empty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      padding: 40,
    },
    emptyText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 15,
      color: colors.mutedForeground,
      textAlign: "center",
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={!data?.length ? { flex: 1 } : { paddingTop: 12, paddingBottom: 100 }}
        data={data ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No messages yet.{"\n"}Tap + to compose one.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => router.push(`/messages/${item.id}`)} activeOpacity={0.75}>
            <View style={styles.topRow}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.typeChip, { backgroundColor: item.type === "fee_arrears" ? "#f59e0b" : colors.primary }]}>
                <Text style={styles.typeText}>{item.type === "fee_arrears" ? "Fee" : "General"}</Text>
              </View>
              <View style={styles.metaChip}>
                <Ionicons name="people-outline" size={12} color={colors.mutedForeground} />
                <Text style={styles.metaText}>{item.recipientCount} recipients</Text>
              </View>
              {item.className && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaText}>{item.className}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/messages/compose")}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

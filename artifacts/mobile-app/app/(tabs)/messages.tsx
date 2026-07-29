import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, useColorScheme,
} from "react-native";
import { useState, useMemo } from "react";
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

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return data ?? [];
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(m => {
      const sentDate = new Date(m.createdAt);
      const dateVariants = [
        sentDate.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }),
        sentDate.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }),
        sentDate.toISOString().slice(0, 10), // 2026-07-23
      ].join(" ").toLowerCase();
      const haystack = `${m.title} ${m.body} ${m.className ?? ""} ${m.examName ?? ""} ${dateVariants}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [data, query]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchBar: {
      flexDirection: "row", alignItems: "center", gap: 8,
      marginHorizontal: 16, marginTop: 12, marginBottom: 4,
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 12, paddingVertical: 9,
    },
    searchInput: {
      flex: 1, fontFamily: "Poppins_400Regular", fontSize: 13, color: colors.foreground,
    },
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
        contentContainerStyle={!filtered.length ? { flex: 1 } : { paddingTop: 4, paddingBottom: 100 }}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          !!data?.length ? (
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search messages, class, or date (e.g. 23 July)"
                placeholderTextColor={colors.mutedForeground}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {!!query && (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name={query ? "search-outline" : "chatbubble-outline"} size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>
              {query ? `No messages match "${query}".` : "No messages yet.\nTap + to compose one."}
            </Text>
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

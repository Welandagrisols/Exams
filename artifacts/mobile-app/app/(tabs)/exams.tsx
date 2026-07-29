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
import { usePermissions } from "@/hooks/usePermissions";

type Exam = {
  id: number;
  name: string;
  classId: number;
  className: string | null;
  term: number;
  year: number;
  status: string;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "#9ca3af",
  active: "#10b981",
  completed: "#3b82f6",
};

export default function ExamsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const { isStaff, assignedClassIds } = usePermissions();
  const canCreateExams = isStaff || assignedClassIds.length > 0;

  const { data, isLoading, refetch, isRefetching } = useQuery<Exam[]>({
    queryKey: ["/exams"],
    queryFn: () => apiFetch("/exams"),
  });

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return data ?? [];
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(e =>
      e.name.toLowerCase().includes(q) || (e.className ?? "").toLowerCase().includes(q)
    );
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
    item: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginVertical: 5,
      borderRadius: colors.radius,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    name: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.foreground,
      flex: 1,
      marginRight: 8,
    },
    statusBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    statusText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 11,
      color: "#fff",
      textTransform: "capitalize",
    },
    sub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 4,
    },
    actionsRow: {
      flexDirection: "row",
      marginTop: 12,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      padding: 7,
      borderRadius: 7,
      backgroundColor: colors.muted,
    },
    actionText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.foreground,
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
    fab: {
      position: "absolute", right: 20, bottom: 24,
      width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
      justifyContent: "center", alignItems: "center",
      shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
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
    <View style={{ flex: 1 }}>
      <FlatList
        style={styles.container}
        contentContainerStyle={!filtered.length ? { flex: 1 } : { paddingTop: 4, paddingBottom: 96 }}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          !!data?.length ? (
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exams or classes"
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
            <Ionicons name={query ? "search-outline" : "document-text-outline"} size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>
              {query
                ? `No exams match "${query}".`
                : canCreateExams ? "No exams yet.\nTap + to create one." : "No exams yet for your classes."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.topRow}>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] ?? "#9ca3af" }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.sub}>
              {item.className ?? "Unknown class"} · Term {item.term}, {item.year}
            </Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/exams/${item.id}/scores`)}>
                <Ionicons name="create-outline" size={15} color={colors.foreground} />
                <Text style={styles.actionText}>Scores</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/exams/${item.id}/ocr-upload`)}>
                <Ionicons name="camera-outline" size={15} color={colors.foreground} />
                <Text style={styles.actionText}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/exams/${item.id}/rankings`)}>
                <Ionicons name="trophy-outline" size={15} color={colors.foreground} />
                <Text style={styles.actionText}>Rankings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/exams/${item.id}/share-reports`)}>
                <Ionicons name="share-social-outline" size={15} color={colors.foreground} />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      {canCreateExams && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push("/exams/bulk-create")}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

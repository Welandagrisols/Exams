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

type Class = { id: number; name: string; year: number; term: number; classTeacherName: string | null; studentCount: number };

export default function ClassesScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const { isStaff, assignedClassIds } = usePermissions();

  const { data, isLoading, refetch, isRefetching } = useQuery<Class[]>({
    queryKey: ["/classes"],
    queryFn: () => apiFetch("/classes"),
  });

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return data ?? [];
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(c =>
      c.name.toLowerCase().includes(q) || (c.classTeacherName ?? "").toLowerCase().includes(q)
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
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary + "18",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    name: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.foreground,
    },
    sub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    actions: { flexDirection: "row", gap: 4, marginLeft: "auto" },
    actionBtn: {
      padding: 6,
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
    importBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      marginTop: 10, alignSelf: "flex-start",
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
      backgroundColor: colors.primary + "18",
    },
    importBtnText: {
      fontFamily: "Poppins_600SemiBold", fontSize: 11.5, color: colors.primary,
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
                placeholder="Search classes or teacher"
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
            <Ionicons name={query ? "search-outline" : "school-outline"} size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>
              {query
                ? `No classes match "${query}".`
                : isStaff ? "No classes yet.\nTap + to add your first class." : "No classes assigned to you yet."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const canWriteThisClass = isStaff || assignedClassIds.includes(item.id);
          return (
            <View style={styles.item}>
              <View style={styles.itemRow}>
                <View style={styles.icon}>
                  <Ionicons name="school-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.sub}>
                    {item.year} · Term {item.term} · {item.studentCount} student{item.studentCount !== 1 ? "s" : ""}
                    {item.classTeacherName ? ` · ${item.classTeacherName}` : ""}
                  </Text>
                </View>
                <View style={styles.actions}>
                  {isStaff && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/classes/${item.id}/edit`)}>
                      <Ionicons name="settings-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  {/* Trends — all teachers can view */}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/classes/${item.id}/trends`)}>
                    <Ionicons name="trending-up-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/classes/${item.id}/students`)}>
                    <Ionicons name="people-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/classes/${item.id}/exams`)}>
                    <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              {canWriteThisClass && (
                <TouchableOpacity
                  style={styles.importBtn}
                  onPress={() => router.push(`/classes/${item.id}/students`)}
                >
                  <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />
                  <Text style={styles.importBtnText}>
                    {item.studentCount > 0 ? "Import More Students" : "Import Students"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
      {isStaff && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push("/classes/new")}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

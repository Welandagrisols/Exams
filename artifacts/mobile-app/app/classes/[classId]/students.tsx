import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput,
  RefreshControl, useColorScheme, TouchableOpacity,
} from "react-native";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";
import { usePermissions } from "@/hooks/usePermissions";

type Student = {
  id: number;
  name: string;
  admissionNo: string;
  gender: string | null;
  parentName: string | null;
  parentPhone: string | null;
};

export default function StudentsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { canWrite } = usePermissions(classId);
  const [query, setQuery] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery<Student[]>({
    queryKey: ["/students", classId],
    queryFn: () => apiFetch(`/students?classId=${classId}`),
    enabled: !!classId,
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return data ?? [];
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(s =>
      s.name.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q)
    );
  }, [data, query]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    addBar: {
      flexDirection: "row",
      gap: 8,
      padding: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    addBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: colors.radius,
      backgroundColor: colors.primary,
    },
    addBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      color: "#fff",
    },
    searchBar: {
      flexDirection: "row", alignItems: "center", gap: 8,
      marginHorizontal: 12, marginTop: 12, marginBottom: 4,
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 12, paddingVertical: 9,
    },
    searchInput: {
      flex: 1, fontFamily: "Poppins_400Regular", fontSize: 13, color: colors.foreground,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginVertical: 4,
      borderRadius: colors.radius,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    avatarText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: colors.primary,
    },
    name: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.foreground,
    },
    adm: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    phone: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    genderBadge: {
      marginLeft: "auto",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    genderText: {
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
    countBar: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.muted,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    countText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.mutedForeground,
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
    <FlatList
      style={styles.container}
      contentContainerStyle={!filtered.length ? { flex: 1 } : { paddingTop: 12, paddingBottom: 32 }}
      data={filtered}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          {canWrite && (
            <View style={styles.addBar}>
              <TouchableOpacity style={styles.addBtn} onPress={() => router.push(`/classes/${classId}/students-add`)}>
                <Ionicons name="camera" size={15} color="#fff" />
                <Text style={styles.addBtnText}>Scan Form</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={() => router.push(`/classes/${classId}/students-bulk-scan`)}>
                <Ionicons name="list" size={15} color="#fff" />
                <Text style={styles.addBtnText}>Scan Class List</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={() => router.push(`/classes/${classId}/students-excel`)}>
                <Ionicons name="document" size={15} color="#fff" />
                <Text style={styles.addBtnText}>Import Excel</Text>
              </TouchableOpacity>
            </View>
          )}
          {!!data?.length && (
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or admission no."
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
          )}
          {data?.length ? (
            <View style={styles.countBar}>
              <Text style={styles.countText}>
                {query
                  ? `${filtered.length} of ${data.length} student${data.length !== 1 ? "s" : ""}`
                  : `${data.length} student${data.length !== 1 ? "s" : ""}`}
              </Text>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name={query ? "search-outline" : "people-outline"} size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>
            {query ? `No students match "${query}".` : "No students in this class yet."}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.item}
          onPress={() => canWrite && router.push(`/classes/${classId}/student-edit?studentId=${item.id}`)}
          activeOpacity={canWrite ? 0.7 : 1}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.name?.trim().charAt(0) ?? "?").toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.adm}>{item.admissionNo}</Text>
            {item.parentPhone && <Text style={styles.phone}>{item.parentPhone}</Text>}
          </View>
          {item.gender && (
            <View style={[styles.genderBadge, { backgroundColor: item.gender === "M" ? "#3b82f6" : "#ec4899" }]}>
              <Text style={styles.genderText}>{item.gender === "M" ? "M" : "F"}</Text>
            </View>
          )}
          {canWrite && <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} style={{ marginLeft: 6 }} />}
        </TouchableOpacity>
      )}
    />
  );
}

import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, useColorScheme, TouchableOpacity,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

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

  const { data, isLoading, refetch, isRefetching } = useQuery<Student[]>({
    queryKey: ["/students", classId],
    queryFn: () => apiFetch(`/students?classId=${classId}`),
    enabled: !!classId,
  });

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
      contentContainerStyle={!data?.length ? { flex: 1 } : { paddingTop: 12, paddingBottom: 32 }}
      data={data ?? []}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          <View style={styles.addBar}>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push(`/classes/${classId}/students-add`)}>
              <Ionicons name="camera" size={15} color="#fff" />
              <Text style={styles.addBtnText}>Scan Registration Form</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push(`/classes/${classId}/students-bulk-scan`)}>
              <Ionicons name="list" size={15} color="#fff" />
              <Text style={styles.addBtnText}>Scan Class List</Text>
            </TouchableOpacity>
          </View>
          {data?.length ? (
            <View style={styles.countBar}>
              <Text style={styles.countText}>{data.length} student{data.length !== 1 ? "s" : ""}</Text>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>No students in this class yet.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.item}>
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
        </View>
      )}
    />
  );
}

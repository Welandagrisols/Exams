import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, useColorScheme,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

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

  const { data, isLoading, refetch, isRefetching } = useQuery<Exam[]>({
    queryKey: ["/exams"],
    queryFn: () => apiFetch("/exams"),
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>No exams yet.{"\n"}Create exams from the web portal.</Text>
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
          </View>
        </View>
      )}
    />
  );
}

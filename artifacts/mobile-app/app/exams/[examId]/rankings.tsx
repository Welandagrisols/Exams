import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, useColorScheme,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getRubricColor } from "@/lib/api";
import palette from "@/constants/colors";

type RankRow = {
  rank: number;
  totalMarks: number;
  totalMaxMarks: number;
  averagePercentage: number;
  overallGrade: string;
  student: { id: number; name: string; admissionNo: string };
};

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function RankingsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery<RankRow[]>({
    queryKey: ["/rankings", examId],
    queryFn: () => apiFetch(`/rankings/${examId}`),
    enabled: !!examId,
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    rankBox: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.muted,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    rankText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 14,
      color: colors.foreground,
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
    right: { marginLeft: "auto", alignItems: "flex-end", gap: 4 },
    pct: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: colors.foreground,
    },
    gradeBadge: {
      borderRadius: 5,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    gradeText: {
      fontFamily: "Poppins_600SemiBold",
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
    <FlatList
      style={styles.container}
      contentContainerStyle={!data?.length ? { flex: 1 } : { paddingTop: 12, paddingBottom: 32 }}
      data={data ?? []}
      keyExtractor={(item) => String(item.student.id)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>No rankings yet.{"\n"}Enter scores first.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.item,
            item.rank === 1 && { borderColor: "#f59e0b", borderWidth: 1.5 },
          ]}
          onPress={() => router.push(`/reports/${examId}/${item.student.id}`)}
          activeOpacity={0.75}
        >
          <View style={[
            styles.rankBox,
            item.rank <= 3 && { backgroundColor: item.rank === 1 ? "#fef3c7" : item.rank === 2 ? "#f3f4f6" : "#fff7ed" }
          ]}>
            <Text style={styles.rankText}>{MEDAL[item.rank] ?? item.rank}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{item.student.name}</Text>
            <Text style={styles.adm}>{item.student.admissionNo}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.pct}>{item.averagePercentage.toFixed(0)}%</Text>
            <View style={[styles.gradeBadge, { backgroundColor: getRubricColor(item.overallGrade) }]}>
              <Text style={styles.gradeText}>{item.overallGrade}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

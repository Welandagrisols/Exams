import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, useColorScheme,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { apiFetch, getRubricColor } from "@/lib/api";
import palette from "@/constants/colors";

type ScoreRow = {
  studentId: number;
  studentName: string;
  admissionNo: string;
  scores: { learningAreaId: number; learningAreaName: string; abbreviation: string; marks: number | null; maxMarks: number }[];
  total: number;
  maxTotal: number;
};

type ScoreData = {
  examId: number;
  examName: string;
  rows: ScoreRow[];
};

export default function ScoresScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const { examId } = useLocalSearchParams<{ examId: string }>();

  const { data, isLoading, refetch, isRefetching } = useQuery<ScoreData>({
    queryKey: ["/scores", examId],
    queryFn: () => apiFetch(`/scores/${examId}`),
    enabled: !!examId,
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 32 },
    header: {
      padding: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    examName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.foreground,
    },
    sub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    card: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: colors.muted,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    studentName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.foreground,
      flex: 1,
    },
    totalBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: colors.primary,
    },
    totalText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 13,
      color: "#fff",
    },
    scoreRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    subjectName: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.foreground,
      flex: 1,
    },
    marks: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.foreground,
      width: 50,
      textAlign: "right",
      marginRight: 8,
    },
    gradeDot: {
      width: 28,
      height: 20,
      borderRadius: 4,
      justifyContent: "center",
      alignItems: "center",
    },
    gradeText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 9,
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

  if (!data?.rows.length) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyText}>No scores entered yet.</Text>
      </View>
    );
  }

  function getGrade(marks: number, max: number): string {
    if (max <= 0) return "BE";
    const pct = (marks / max) * 100;
    if (pct >= 80) return "EE";
    if (pct >= 60) return "ME";
    if (pct >= 40) return "AE";
    return "BE";
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.examName}>{data.examName}</Text>
        <Text style={styles.sub}>{data.rows.length} students</Text>
      </View>

      {data.rows.map((row) => (
        <View key={row.studentId} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.studentName} numberOfLines={1}>{row.studentName}</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalText}>{row.total}/{row.maxTotal}</Text>
            </View>
          </View>
          {row.scores.map((score) => {
            const grade = score.marks !== null ? getGrade(score.marks, score.maxMarks) : null;
            return (
              <View key={score.learningAreaId} style={styles.scoreRow}>
                <Text style={styles.subjectName} numberOfLines={1}>{score.learningAreaName}</Text>
                <Text style={styles.marks}>
                  {score.marks ?? "—"}/{score.maxMarks}
                </Text>
                {grade && (
                  <View style={[styles.gradeDot, { backgroundColor: getRubricColor(grade) }]}>
                    <Text style={styles.gradeText}>{grade}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, useColorScheme,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { apiFetch, getRubricColor } from "@/lib/api";
import palette from "@/constants/colors";

type Subject = {
  learningAreaId: number;
  name: string;
  abbreviation: string;
  marks: number;
  maxMarks: number;
  percentage: number;
};

type TrendExam = {
  examId: number;
  examName: string;
  term: number;
  year: number;
  totalMarks: number;
  totalMaxMarks: number;
  averagePercentage: number;
  overallGrade: string;
  classAverage: number | null;
  subjects: Subject[];
};

type StudentTrends = {
  student: { id: number; name: string; admissionNo: string; className: string };
  exams: TrendExam[];
};

function PercentBar({ pct, color, comparison }: { pct: number; color: string; comparison?: number | null }) {
  return (
    <View>
      <View style={{ height: 8, backgroundColor: "#e4e6eb", borderRadius: 4, overflow: "hidden", marginTop: 4, position: "relative" }}>
        <View style={{ width: `${Math.min(pct, 100)}%`, height: "100%", backgroundColor: color, borderRadius: 4 }} />
      </View>
      {comparison != null && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color }}>
            Student: {Math.round(pct * 10) / 10}%
          </Text>
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: "#9ca3af" }}>
            Class avg: {Math.round(comparison * 10) / 10}%
          </Text>
        </View>
      )}
    </View>
  );
}

export default function StudentTrendsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const { studentId } = useLocalSearchParams<{ studentId: string }>();

  const { data, isLoading, refetch, isRefetching } = useQuery<StudentTrends>({
    queryKey: ["/trends/student", studentId],
    queryFn: () => apiFetch(`/trends/student/${studentId}`),
    enabled: !!studentId,
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.primary,
      padding: 16,
      marginBottom: 4,
    },
    headerName: {
      fontFamily: "Poppins_700Bold",
      fontSize: 18,
      color: "#fff",
    },
    headerSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: "rgba(255,255,255,0.75)",
      marginTop: 2,
    },
    card: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: colors.radius,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    examName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.foreground,
    },
    termLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginBottom: 8,
    },
    gradeBadge: {
      alignSelf: "flex-start",
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginBottom: 8,
    },
    gradeBadgeText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 13,
      color: "#fff",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 10,
    },
    subjectTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      color: colors.mutedForeground,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    subjectRow: { marginBottom: 8 },
    subjectLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.foreground,
    },
    subBar: {
      height: 6,
      backgroundColor: "#e4e6eb",
      borderRadius: 3,
      overflow: "hidden",
      marginTop: 3,
    },
    empty: {
      flex: 1, justifyContent: "center", alignItems: "center", padding: 40,
    },
    emptyText: {
      fontFamily: "Poppins_500Medium", fontSize: 15,
      color: colors.mutedForeground, textAlign: "center",
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const exams = data?.exams ?? [];

  if (!exams.length) {
    return (
      <View style={[styles.container, { flex: 1 }]}>
        {data?.student && (
          <View style={styles.header}>
            <Text style={styles.headerName}>{data.student.name}</Text>
            <Text style={styles.headerSub}>{data.student.admissionNo} · {data.student.className}</Text>
          </View>
        )}
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No exam results yet.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {data?.student && (
        <View style={styles.header}>
          <Text style={styles.headerName}>{data.student.name}</Text>
          <Text style={styles.headerSub}>{data.student.admissionNo} · {data.student.className}</Text>
        </View>
      )}

      {exams.map(exam => {
        const color = getRubricColor(exam.overallGrade);
        return (
          <View key={exam.examId} style={styles.card}>
            <Text style={styles.examName}>{exam.examName}</Text>
            <Text style={styles.termLabel}>Term {exam.term}, {exam.year}</Text>

            <View style={[styles.gradeBadge, { backgroundColor: color }]}>
              <Text style={styles.gradeBadgeText}>{exam.overallGrade}</Text>
            </View>

            <PercentBar pct={exam.averagePercentage} color={color} comparison={exam.classAverage} />

            <View style={styles.divider} />
            <Text style={styles.subjectTitle}>Subject Breakdown</Text>

            {exam.subjects.map(subj => {
              const sColor = getRubricColor(subj.percentage >= 75 ? "EE" : subj.percentage >= 50 ? "ME" : subj.percentage >= 30 ? "AE" : "BE");
              const sPct = subj.maxMarks > 0 ? (subj.marks / subj.maxMarks) * 100 : 0;
              return (
                <View key={subj.learningAreaId} style={styles.subjectRow}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.subjectLabel}>{subj.abbreviation} — {subj.name}</Text>
                    <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: sColor }}>
                      {subj.marks}/{subj.maxMarks}
                    </Text>
                  </View>
                  <View style={styles.subBar}>
                    <View style={{ width: `${Math.min(sPct, 100)}%`, height: "100%", backgroundColor: sColor, borderRadius: 3 }} />
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

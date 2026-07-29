import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, useColorScheme, TouchableOpacity,
} from "react-native";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

type AreaAvg = { learningAreaId: number; name: string; abbreviation: string; average: number };
type TrendExam = { examId: number; examName: string; term: number; year: number; classAverage: number; learningAreas: AreaAvg[] };
type ClassTrends = { classId: number; className: string; exams: TrendExam[] };

function TrendBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
      <View style={{ flex: 1, height: 8, backgroundColor: "#e4e6eb", borderRadius: 4, overflow: "hidden" }}>
        <View style={{ width: `${Math.min(pct, 100)}%`, height: "100%", backgroundColor: color, borderRadius: 4 }} />
      </View>
      <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color, width: 42, textAlign: "right" }}>
        {value}%
      </Text>
    </View>
  );
}

function avgColor(pct: number): string {
  if (pct >= 75) return "#10b981";
  if (pct >= 50) return "#3b82f6";
  if (pct >= 30) return "#f59e0b";
  return "#ef4444";
}

export default function ClassTrendsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const [mode, setMode] = useState<"overall" | "subjects">("overall");

  const { data, isLoading, refetch, isRefetching } = useQuery<ClassTrends>({
    queryKey: ["/trends/class", classId],
    queryFn: () => apiFetch(`/trends/class/${classId}`),
    enabled: !!classId,
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    toggle: {
      flexDirection: "row",
      margin: 16,
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      padding: 3,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: colors.radius - 2,
      alignItems: "center",
    },
    toggleBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
    card: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: colors.radius,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    examLabel: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 2,
    },
    termLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
      marginBottom: 6,
    },
    subjectRow: { marginTop: 6 },
    subjectName: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.foreground,
    },
    empty: {
      flex: 1, justifyContent: "center", alignItems: "center", padding: 40,
    },
    emptyText: {
      fontFamily: "Poppins_500Medium", fontSize: 15,
      color: colors.mutedForeground, textAlign: "center",
    },
    trendDot: {
      width: 10, height: 10, borderRadius: 5, marginRight: 6,
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
  const maxOverall = 100;

  if (!exams.length) {
    return (
      <View style={[styles.container, { flex: 1 }]}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No exam data yet.{"\n"}Enter scores to see trends.</Text>
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
      {/* Toggle */}
      <View style={styles.toggle}>
        {(["overall", "subjects"] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.toggleBtn, mode === m && { backgroundColor: colors.card }]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.toggleBtnText, { color: mode === m ? colors.primary : colors.mutedForeground }]}>
              {m === "overall" ? "Overall Average" : "By Subject"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trend direction hint */}
      {exams.length >= 2 && mode === "overall" && (() => {
        const first = exams[0].classAverage;
        const last = exams[exams.length - 1].classAverage;
        const diff = Math.round((last - first) * 10) / 10;
        const color = diff >= 0 ? colors.success : colors.destructive;
        const arrow = diff >= 0 ? "▲" : "▼";
        return (
          <View style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground }}>
              {exams.length} exams tracked &nbsp;
              <Text style={{ color, fontFamily: "Poppins_600SemiBold" }}>
                {arrow} {Math.abs(diff)}% overall
              </Text>
            </Text>
          </View>
        );
      })()}

      {exams.map((exam, idx) => {
        const prevAvg = idx > 0 ? exams[idx - 1].classAverage : null;
        const diff = prevAvg !== null ? Math.round((exam.classAverage - prevAvg) * 10) / 10 : null;
        const color = avgColor(exam.classAverage);
        return (
          <View key={exam.examId} style={styles.card}>
            <Text style={styles.examLabel}>{exam.examName}</Text>
            <Text style={styles.termLabel}>Term {exam.term}, {exam.year}</Text>

            {mode === "overall" ? (
              <>
                <TrendBar value={exam.classAverage} max={maxOverall} color={color} />
                {diff !== null && (
                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: diff >= 0 ? colors.success : colors.destructive, marginTop: 4 }}>
                    {diff >= 0 ? "▲" : "▼"} {Math.abs(diff)}% from previous exam
                  </Text>
                )}
              </>
            ) : (
              <View style={styles.subjectRow}>
                {exam.learningAreas.map(la => (
                  <View key={la.learningAreaId} style={{ marginTop: 8 }}>
                    <Text style={styles.subjectName}>{la.abbreviation} — {la.name}</Text>
                    <TrendBar value={la.average} max={100} color={avgColor(la.average)} />
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

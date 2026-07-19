import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, useColorScheme,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { apiFetch, getRubricColor } from "@/lib/api";
import palette from "@/constants/colors";

type Distribution = { EE: number; ME: number; AE: number; BE: number };

type LearningArea = {
  learningAreaId: number;
  learningAreaName: string;
  abbreviation: string;
  mean: number;
  maxMarks: number;
  meanPercentage: number;
  meanGrade: string;
  distribution: Distribution;
  highest: number;
  lowest: number;
};

type Analytics = {
  exam: { id: number; name: string; classId: number; className: string; term: number; year: number };
  learningAreas: LearningArea[];
  overallMean: number;
  overallMeanPercentage: number;
  classSize: number;
  gradedCount: number;
  overallDistribution: Distribution;
};

const GRADE_COLORS = {
  EE: "#10b981",
  ME: "#3b82f6",
  AE: "#f59e0b",
  BE: "#ef4444",
} as const;

function GradeDistBar({ dist, total }: { dist: Distribution; total: number }) {
  if (total === 0) return null;
  const grades = (["EE", "ME", "AE", "BE"] as const).filter(g => dist[g] > 0);
  return (
    <View style={{ flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
      {grades.map(g => (
        <View
          key={g}
          style={{ flex: dist[g] / total, backgroundColor: GRADE_COLORS[g] }}
        />
      ))}
    </View>
  );
}

function GradeLegend({ dist, total }: { dist: Distribution; total: number }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {(["EE", "ME", "AE", "BE"] as const).map(g => (
        <View key={g} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: GRADE_COLORS[g] }} />
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: "#666d80" }}>
            {g}: {dist[g]} ({total > 0 ? Math.round((dist[g] / total) * 100) : 0}%)
          </Text>
        </View>
      ))}
    </View>
  );
}

function PercentBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={{ height: 8, backgroundColor: "#e4e6eb", borderRadius: 4, overflow: "hidden", marginTop: 4 }}>
      <View style={{ width: `${Math.min(pct, 100)}%`, height: "100%", backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

export default function AnalyticsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const { examId } = useLocalSearchParams<{ examId: string }>();

  const { data, isLoading, refetch, isRefetching } = useQuery<Analytics>({
    queryKey: ["/analytics", examId],
    queryFn: () => apiFetch(`/analytics/${examId}`),
    enabled: !!examId,
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    section: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: colors.radius,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    statRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
    statBox: {
      flex: 1,
      backgroundColor: colors.muted,
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
    },
    statValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: colors.foreground,
    },
    statLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 2,
      textAlign: "center",
    },
    subjectCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    subjectRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    subjectName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.foreground,
      flex: 1,
    },
    gradeBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    gradeBadgeText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 12,
      color: "#fff",
    },
    subjectMeta: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 6,
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontFamily: "Poppins_400Regular", color: colors.mutedForeground }}>No analytics data yet.</Text>
      </View>
    );
  }

  const overallColor = getRubricColor(data.overallDistribution.EE >= data.classSize * 0.5 ? "EE" : data.overallDistribution.ME >= data.classSize * 0.5 ? "ME" : data.overallDistribution.AE >= data.classSize * 0.5 ? "AE" : "BE");
  const pct = Math.round(data.overallMeanPercentage * 10) / 10;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Class Overview</Text>
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{pct}%</Text>
            <Text style={styles.statLabel}>Class Average</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{data.gradedCount}</Text>
            <Text style={styles.statLabel}>Students Graded</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{data.learningAreas.length}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
        </View>
        <GradeDistBar dist={data.overallDistribution} total={data.gradedCount * data.learningAreas.length || 1} />
        <GradeLegend dist={data.overallDistribution} total={data.gradedCount * data.learningAreas.length || 1} />
      </View>

      {/* Per-subject breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subject Performance</Text>
        {data.learningAreas.map(la => {
          const color = getRubricColor(la.meanGrade);
          const subPct = Math.round(la.meanPercentage * 10) / 10;
          const distTotal = Object.values(la.distribution).reduce((a, b) => a + b, 0);
          return (
            <View key={la.learningAreaId} style={styles.subjectCard}>
              <View style={styles.subjectRow}>
                <Text style={styles.subjectName}>{la.learningAreaName}</Text>
                <View style={[styles.gradeBadge, { backgroundColor: color }]}>
                  <Text style={styles.gradeBadgeText}>{la.meanGrade}</Text>
                </View>
              </View>
              <PercentBar pct={subPct} color={color} />
              <Text style={styles.subjectMeta}>
                Avg: {subPct}% &nbsp;·&nbsp; High: {Math.round(la.highest)}/{la.maxMarks} &nbsp;·&nbsp; Low: {Math.round(la.lowest)}/{la.maxMarks}
              </Text>
              <GradeDistBar dist={la.distribution} total={distTotal} />
              <GradeLegend dist={la.distribution} total={distTotal} />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

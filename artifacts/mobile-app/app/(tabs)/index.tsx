import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, useColorScheme,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getRubricColor } from "@/lib/api";
import palette from "@/constants/colors";
import { usePermissions } from "@/hooks/usePermissions";

type RecentExam = {
  id: number;
  name: string;
  classId: number;
  className: string | null;
  year: number;
  term: number;
  openingDate: string | null;
  closingDate: string | null;
  status: "draft" | "active" | "closed";
};

type ClassSnapshot = {
  classId: number;
  className: string;
  studentCount: number;
  latestExamId: number | null;
  latestExamName: string | null;
  latestAverage: number | null;
  latestGrades: { EE: number; ME: number; AE: number; BE: number };
  topStudentName: string | null;
  topStudentGrade: string | null;
};

type Dashboard = {
  totalStudents: number;
  totalClasses: number;
  totalExams: number;
  totalActive: number;
  recentExams: RecentExam[];
  classSnapshots: ClassSnapshot[];
};

function GradeBar({ grades, total }: { grades: ClassSnapshot["latestGrades"]; total: number }) {
  if (total === 0) return null;
  const segments = [
    { key: "EE", color: "#10b981" },
    { key: "ME", color: "#3b82f6" },
    { key: "AE", color: "#f59e0b" },
    { key: "BE", color: "#ef4444" },
  ] as const;
  return (
    <View style={{ flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden", marginTop: 8 }}>
      {segments.map(({ key, color }) => {
        const count = grades[key];
        if (!count) return null;
        return (
          <View key={key} style={{ flex: count / total, backgroundColor: color }} />
        );
      })}
    </View>
  );
}

export default function DashboardScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isStaff, assignedClassIds } = usePermissions();
  const canCreateExams = isStaff || assignedClassIds.length > 0;

  const { data, isLoading, refetch, isRefetching } = useQuery<Dashboard>({
    queryKey: ["/dashboard"],
    queryFn: () => apiFetch("/dashboard"),
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.primary,
      paddingTop: insets.top + 16,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    headerTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 24,
      color: "#ffffff",
    },
    headerSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: "rgba(255,255,255,0.7)",
      marginTop: 2,
    },
    statsRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statNum: {
      fontFamily: "Poppins_700Bold",
      fontSize: 28,
      color: colors.primary,
    },
    statLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 2,
      textAlign: "center",
    },
    sectionTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: colors.foreground,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 10,
    },
    classCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: colors.radius,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    className: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.foreground,
    },
    classSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    avgBadge: {
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    avgText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: "#fff",
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      gap: 6,
    },
    topName: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.mutedForeground,
      flex: 1,
    },
    footer: { height: insets.bottom + 20 },
    quickRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 10,
    },
    quickBtn: {
      flex: 1,
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickIcon: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.primary + "18",
      justifyContent: "center", alignItems: "center",
    },
    quickLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 10.5,
      color: colors.foreground,
      textAlign: "center",
    },
    attentionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fffbeb",
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: colors.radius,
      padding: 12,
      borderWidth: 1,
      borderColor: "#fde68a",
      gap: 10,
    },
    attentionIcon: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: "#fef3c7",
      justifyContent: "center", alignItems: "center",
    },
    attentionName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: "#78350f",
    },
    attentionSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: "#92400e",
      marginTop: 1,
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EduMetrics</Text>
        <Text style={styles.headerSub}>School performance at a glance</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { num: data?.totalStudents ?? 0, label: "Students" },
            { num: data?.totalClasses ?? 0, label: "Classes" },
            { num: data?.totalExams ?? 0, label: "Exams" },
          ].map(({ num, label }) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statNum}>{num}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickRow}>
          {isStaff && (
            <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/classes/new")}>
              <View style={styles.quickIcon}><Ionicons name="add-circle-outline" size={18} color={colors.primary} /></View>
              <Text style={styles.quickLabel}>New Class</Text>
            </TouchableOpacity>
          )}
          {canCreateExams && (
            <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/exams/bulk-create")}>
              <View style={styles.quickIcon}><Ionicons name="document-text-outline" size={18} color={colors.primary} /></View>
              <Text style={styles.quickLabel}>New Exam</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/classes")}>
            <View style={styles.quickIcon}><Ionicons name="school-outline" size={18} color={colors.primary} /></View>
            <Text style={styles.quickLabel}>Classes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/messages/compose")}>
            <View style={styles.quickIcon}><Ionicons name="chatbubble-outline" size={18} color={colors.primary} /></View>
            <Text style={styles.quickLabel}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Needs Attention — draft exams still waiting on scores */}
        {(() => {
          const draftExams = (data?.recentExams ?? []).filter(e => e.status === "draft");
          if (draftExams.length === 0) return null;
          return (
            <>
              <Text style={styles.sectionTitle}>Needs Attention</Text>
              {draftExams.map(exam => (
                <TouchableOpacity
                  key={exam.id}
                  style={styles.attentionCard}
                  onPress={() => router.push(`/exams/${exam.id}/scores`)}
                  activeOpacity={0.75}
                >
                  <View style={styles.attentionIcon}>
                    <Ionicons name="alert-circle-outline" size={18} color="#b45309" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attentionName} numberOfLines={1}>{exam.name}</Text>
                    <Text style={styles.attentionSub}>{exam.className ?? "Unknown class"} · No scores entered yet</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#b45309" />
                </TouchableOpacity>
              ))}
            </>
          );
        })()}

        {/* Class snapshots */}
        <Text style={styles.sectionTitle}>Class Performance</Text>
        {data?.classSnapshots?.map((cls) => {
          const total = (cls.latestGrades.EE ?? 0) + (cls.latestGrades.ME ?? 0) + (cls.latestGrades.AE ?? 0) + (cls.latestGrades.BE ?? 0);
          return (
            <TouchableOpacity
              key={cls.classId}
              style={styles.classCard}
              onPress={() => router.push(`/classes/${cls.classId}/exams`)}
              activeOpacity={0.75}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.className}>{cls.className}</Text>
                  <Text style={styles.classSub}>{cls.studentCount} students</Text>
                  {cls.latestExamName && (
                    <Text style={[styles.classSub, { marginTop: 4 }]}>{cls.latestExamName}</Text>
                  )}
                </View>
                {cls.latestAverage !== null && (
                  <View style={[styles.avgBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avgText}>{cls.latestAverage.toFixed(0)}%</Text>
                  </View>
                )}
              </View>

              {total > 0 && <GradeBar grades={cls.latestGrades} total={total} />}

              {cls.topStudentName && (
                <View style={styles.topRow}>
                  <Ionicons name="trophy-outline" size={13} color={colors.accent} />
                  <Text style={styles.topName} numberOfLines={1}>
                    Top: {cls.topStudentName} · {cls.topStudentGrade}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

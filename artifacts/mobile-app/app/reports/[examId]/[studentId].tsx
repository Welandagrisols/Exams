import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  useColorScheme, TouchableOpacity, Share,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getRubricColor } from "@/lib/api";
import palette from "@/constants/colors";
import * as Haptics from "expo-haptics";

type Report = {
  student: { name: string; admissionNo: string; className: string };
  exam: { name: string; term: number; year: number };
  school: { name: string; motto: string | null };
  subjects: { learningAreaId: number; learningAreaName: string; marks: number; maxMarks: number; percentage: number; rubricGrade: string }[];
  totalMarks: number;
  totalMaxMarks: number;
  averagePercentage: number;
  overallGrade: string;
  rank: number;
  classSize: number;
  teacherComment: string | null;
  principalComment: string | null;
};

export default function ReportScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const { examId, studentId } = useLocalSearchParams<{ examId: string; studentId: string }>();

  const { data, isLoading } = useQuery<Report>({
    queryKey: ["/reports", examId, studentId],
    queryFn: () => apiFetch(`/reports/${examId}/${studentId}`),
    enabled: !!examId && !!studentId,
  });

  const handleShare = async () => {
    if (!data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = [
      `${data.school.name}`,
      `${data.exam.name} — Term ${data.exam.term}, ${data.exam.year}`,
      ``,
      `Student: ${data.student.name} (${data.student.admissionNo})`,
      `Class: ${data.student.className}`,
      `Rank: ${data.rank} of ${data.classSize}`,
      ``,
      `RESULTS:`,
      ...data.subjects.map(s => `  ${s.learningAreaName}: ${s.marks}/${s.maxMarks} (${s.rubricGrade})`),
      ``,
      `Overall: ${data.totalMarks}/${data.totalMaxMarks} — ${data.averagePercentage.toFixed(1)}% — ${data.overallGrade}`,
      data.teacherComment ? `\nTeacher: ${data.teacherComment}` : "",
    ].join("\n");
    Share.share({ message: text, title: `Report — ${data.student.name}` });
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    header: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      padding: 20,
      marginBottom: 12,
      alignItems: "center",
    },
    schoolName: {
      fontFamily: "Poppins_700Bold",
      fontSize: 18,
      color: "#fff",
      textAlign: "center",
    },
    motto: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: "rgba(255,255,255,0.75)",
      marginTop: 4,
      textAlign: "center",
      fontStyle: "italic",
    },
    examLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: "rgba(255,255,255,0.85)",
      marginTop: 10,
    },
    infoGrid: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 12,
    },
    infoItem: { width: "47%" },
    infoLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 10,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    infoValue: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.foreground,
    },
    sectionTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 8,
    },
    tableCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      marginBottom: 12,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: colors.muted,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tableHeaderText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 11,
      color: colors.mutedForeground,
      textTransform: "uppercase",
    },
    tableRow: {
      flexDirection: "row",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: "center",
    },
    tableRowAlt: { backgroundColor: colors.muted + "60" },
    tableCell: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.foreground,
    },
    tableCellBold: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.foreground,
    },
    gradeBadge: {
      borderRadius: 5,
      paddingHorizontal: 7,
      paddingVertical: 2,
      alignSelf: "flex-start",
    },
    gradeText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 11,
      color: "#fff",
    },
    totalRow: {
      flexDirection: "row",
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.primary,
      borderTopWidth: 1,
      borderTopColor: colors.primary,
      alignItems: "center",
    },
    totalLabel: {
      fontFamily: "Poppins_700Bold",
      fontSize: 13,
      color: "#fff",
      flex: 1,
    },
    totalValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 14,
      color: "#fff",
      textAlign: "right",
    },
    commentCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    commentLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 11,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    commentText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.foreground,
      fontStyle: "italic",
      lineHeight: 20,
    },
    shareBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.accent,
      borderRadius: colors.radius,
      padding: 14,
      marginBottom: 12,
    },
    shareBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#fff",
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* School header */}
      <View style={styles.header}>
        <Text style={styles.schoolName}>{data.school.name}</Text>
        {data.school.motto && <Text style={styles.motto}>"{data.school.motto}"</Text>}
        <Text style={styles.examLabel}>
          {data.exam.name} · Term {data.exam.term}, {data.exam.year}
        </Text>
      </View>

      {/* Student info grid */}
      <View style={styles.infoGrid}>
        {[
          { label: "Student", value: data.student.name },
          { label: "Admission No", value: data.student.admissionNo },
          { label: "Class", value: data.student.className },
          { label: "Rank", value: `${data.rank} of ${data.classSize}` },
        ].map(({ label, value }) => (
          <View key={label} style={styles.infoItem}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Marks table */}
      <Text style={styles.sectionTitle}>Academic Performance</Text>
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Subject</Text>
          <Text style={[styles.tableHeaderText, { width: 60, textAlign: "center" }]}>Marks</Text>
          <Text style={[styles.tableHeaderText, { width: 50, textAlign: "center" }]}>%</Text>
          <Text style={[styles.tableHeaderText, { width: 40, textAlign: "center" }]}>Grade</Text>
        </View>
        {data.subjects.map((sub, i) => (
          <View key={sub.learningAreaId} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
            <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>{sub.learningAreaName}</Text>
            <Text style={[styles.tableCellBold, { width: 60, textAlign: "center" }]}>
              {sub.marks}/{sub.maxMarks}
            </Text>
            <Text style={[styles.tableCell, { width: 50, textAlign: "center" }]}>
              {sub.percentage.toFixed(0)}%
            </Text>
            <View style={{ width: 40, alignItems: "center" }}>
              <View style={[styles.gradeBadge, { backgroundColor: getRubricColor(sub.rubricGrade) }]}>
                <Text style={styles.gradeText}>{sub.rubricGrade}</Text>
              </View>
            </View>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Overall</Text>
          <Text style={styles.totalValue}>
            {data.totalMarks}/{data.totalMaxMarks} · {data.averagePercentage.toFixed(1)}% · {data.overallGrade}
          </Text>
        </View>
      </View>

      {/* Comments */}
      {(data.teacherComment || data.principalComment) && (
        <>
          {data.teacherComment && (
            <View style={styles.commentCard}>
              <Text style={styles.commentLabel}>Class Teacher's Remarks</Text>
              <Text style={styles.commentText}>{data.teacherComment}</Text>
            </View>
          )}
          {data.principalComment && (
            <View style={styles.commentCard}>
              <Text style={styles.commentLabel}>Principal's Remarks</Text>
              <Text style={styles.commentText}>{data.principalComment}</Text>
            </View>
          )}
        </>
      )}

      {/* Share button */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
        <Ionicons name="share-outline" size={20} color="#fff" />
        <Text style={styles.shareBtnText}>Share Report via SMS / WhatsApp</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

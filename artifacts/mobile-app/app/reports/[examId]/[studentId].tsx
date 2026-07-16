import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  useColorScheme, TouchableOpacity, Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getRubricColor } from "@/lib/api";
import palette from "@/constants/colors";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

type Subject = {
  learningAreaId: number;
  learningAreaName: string;
  abbreviation: string;
  marks: number;
  maxMarks: number;
  percentage: number;
  rubricGrade: string;
};

type Report = {
  student: { name: string; admissionNo: string; className: string };
  exam: { name: string; term: number; year: number; openingDate: string | null; closingDate: string | null };
  school: { name: string; address: string | null; motto: string | null; term1StartDate?: string | null; term1EndDate?: string | null; term2StartDate?: string | null; term2EndDate?: string | null; term3StartDate?: string | null; term3EndDate?: string | null };
  subjects: Subject[];
  totalMarks: number;
  totalMaxMarks: number;
  averagePercentage: number;
  overallGrade: string;
  rank: number;
  classSize: number;
  teacherComment: string | null;
  principalComment: string | null;
};

type TrendExam = {
  examId: number;
  examName: string;
  term: number;
  year: number;
  averagePercentage: number;
  classAverage: number | null;
};

type TrendData = { student: { name: string }; exams: TrendExam[] };

// ─── Rubric helpers (mirrored from web) ────────────────────────────────────
function rubricHex(grade: string): string {
  if (grade.startsWith("EE")) return "#166534";
  if (grade.startsWith("ME")) return "#1e40af";
  if (grade.startsWith("AE")) return "#92400e";
  return "#991b1b";
}
function rubricBg(grade: string): string {
  if (grade.startsWith("EE")) return "#dcfce7";
  if (grade.startsWith("ME")) return "#dbeafe";
  if (grade.startsWith("AE")) return "#fef3c7";
  return "#fee2e2";
}

// ─── HTML report builder (matches web print layout exactly) ─────────────────
function buildReportHtml(report: Report, trendRows: TrendExam[], currentExamId: number): string {
  const hasTrend = trendRows.length > 1;

  const subjectRows = report.subjects.map(s => `
    <tr>
      <td style="border:1px solid #e2e8f0;padding:8px 12px;font-weight:600">${s.learningAreaName}</td>
      <td style="border:1px solid #e2e8f0;padding:8px 12px;text-align:center;font-family:monospace">${s.marks} <span style="color:#94a3b8;font-size:11px">/ ${s.maxMarks}</span></td>
      <td style="border:1px solid #e2e8f0;padding:8px 12px;text-align:center;font-family:monospace">${s.percentage.toFixed(0)}%</td>
      <td style="border:1px solid #e2e8f0;padding:8px 12px;text-align:center">
        <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${rubricBg(s.rubricGrade)};color:${rubricHex(s.rubricGrade)}">${s.rubricGrade}</span>
      </td>
    </tr>`).join("");

  const trendSection = hasTrend ? `
    <div style="padding:20px 32px 16px;border-top:1px solid #e2e8f0">
      <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Performance Trajectory</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="border:1px solid #e2e8f0;padding:6px 10px;text-align:left;color:#64748b;font-size:10px;text-transform:uppercase">Term</th>
            <th style="border:1px solid #e2e8f0;padding:6px 10px;text-align:center;color:#64748b;font-size:10px;text-transform:uppercase">Student %</th>
            <th style="border:1px solid #e2e8f0;padding:6px 10px;text-align:center;color:#64748b;font-size:10px;text-transform:uppercase">Class Avg %</th>
          </tr>
        </thead>
        <tbody>
          ${trendRows.map(e => `
            <tr style="${e.examId === currentExamId ? "background:#f0f9ff;" : ""}">
              <td style="border:1px solid #e2e8f0;padding:6px 10px;font-weight:${e.examId === currentExamId ? "700" : "500"}">T${e.term} ${e.year}${e.examId === currentExamId ? " ◀" : ""}</td>
              <td style="border:1px solid #e2e8f0;padding:6px 10px;text-align:center;font-family:monospace;font-weight:600">${e.averagePercentage.toFixed(1)}%</td>
              <td style="border:1px solid #e2e8f0;padding:6px 10px;text-align:center;font-family:monospace;color:#64748b">${e.classAverage != null ? `${e.classAverage.toFixed(1)}%` : "—"}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; color: #0f172a; background: #fff; font-size: 13px; }
    @page { margin: 14mm 12mm; }
  </style>
</head>
<body>
  <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;max-width:700px;margin:0 auto">

    <!-- School header -->
    <div style="padding:28px 32px 20px;border-bottom:1px solid #e2e8f0;text-align:center;background:#f8fafc">
      <h1 style="font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#0f172a">${report.school.name}</h1>
      ${report.school.address ? `<p style="color:#475569;font-size:12px;margin-top:4px">${report.school.address}</p>` : ""}
      ${report.school.motto ? `<p style="color:#1e3a5f;font-weight:700;font-style:italic;margin-top:6px">"${report.school.motto}"</p>` : ""}
      <div style="margin-top:20px;padding-top:16px;border-top:2px solid #e2e8f0">
        <h2 style="font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1e293b">Termly Performance Report</h2>
        <div style="display:flex;justify-content:center;gap:28px;margin-top:8px;font-weight:500;color:#475569;font-size:12px;flex-wrap:wrap">
          <span><strong style="color:#0f172a">EXAM:</strong> ${report.exam.name}</span>
          <span><strong style="color:#0f172a">TERM:</strong> ${report.exam.term}</span>
          <span><strong style="color:#0f172a">YEAR:</strong> ${report.exam.year}</span>
        </div>
      </div>
    </div>

    <!-- Student info -->
    <div style="padding:16px 32px;border-bottom:1px solid #e2e8f0;display:flex;gap:16px;background:#fff">
      <!-- Photo slot -->
      <div style="width:72px;min-width:72px;height:88px;border:2px dashed #cbd5e1;border-radius:4px;background:#f8fafc;display:flex;align-items:center;justify-content:center">
        <span style="font-size:10px;color:#94a3b8;text-align:center">Photo</span>
      </div>
      <!-- Fields -->
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px">
        <div><div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Student Name</div><div style="font-weight:700;font-size:14px">${report.student.name}</div></div>
        <div><div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Admission No</div><div style="font-weight:700;font-size:14px">${report.student.admissionNo}</div></div>
        <div><div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Class</div><div style="font-weight:700;font-size:14px">${report.student.className}</div></div>
        <div><div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Class Rank</div><div style="font-weight:700;font-size:14px">${report.rank} <span style="color:#64748b;font-size:12px;font-weight:500">of ${report.classSize}</span></div></div>
      </div>
    </div>

    <!-- Marks table -->
    <div style="padding:20px 32px;background:#fff">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:12px">Academic Performance</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead style="background:#f1f5f9">
          <tr>
            <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left;color:#475569;font-size:10px;text-transform:uppercase;letter-spacing:0.5px">Learning Area</th>
            <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:center;color:#475569;font-size:10px;text-transform:uppercase">Marks</th>
            <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:center;color:#475569;font-size:10px;text-transform:uppercase">%</th>
            <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:center;color:#475569;font-size:10px;text-transform:uppercase">CBC Grade</th>
          </tr>
        </thead>
        <tbody>${subjectRows}</tbody>
        <tr style="background:#1e293b;color:#fff;font-weight:700;font-size:13px">
          <td style="border:1px solid #334155;padding:10px 12px;text-transform:uppercase;letter-spacing:0.5px">Overall Performance</td>
          <td style="border:1px solid #334155;padding:10px 12px;text-align:center;font-family:monospace">${report.totalMarks} <span style="color:#94a3b8;font-size:11px">/ ${report.totalMaxMarks}</span></td>
          <td style="border:1px solid #334155;padding:10px 12px;text-align:center;font-family:monospace;color:#fbbf24">${report.averagePercentage.toFixed(1)}%</td>
          <td style="border:1px solid #334155;padding:10px 12px;text-align:center;color:#fbbf24">${report.overallGrade}</td>
        </tr>
      </table>
    </div>

    ${trendSection}

    <!-- Comments -->
    <div style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc">
      <div style="margin-bottom:20px">
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Class Teacher's Remarks</div>
        <div style="min-height:50px;border-bottom:1px dashed #94a3b8;padding-bottom:6px;font-style:italic;color:#1e293b;font-weight:500">${report.teacherComment || "&nbsp;"}</div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Principal's Remarks</div>
        <div style="min-height:50px;border-bottom:1px dashed #94a3b8;padding-bottom:6px;font-style:italic;color:#1e293b;font-weight:500">${report.principalComment || "&nbsp;"}</div>
        <div style="margin-top:20px;text-align:right;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#1e293b">Signature &amp; Stamp: ..........................</div>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:12px 32px;background:#1e293b;color:#cbd5e1;font-size:11px;font-weight:500;display:flex;justify-content:space-between">
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.7;margin-bottom:2px">Closing Date</div>
        <div style="color:#fff">${report.exam.closingDate ? new Date(report.exam.closingDate).toLocaleDateString("en-KE", { day:"numeric", month:"long", year:"numeric" }) : "—"}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.7;margin-bottom:2px">Opening Date</div>
        <div style="color:#fff">${report.exam.openingDate ? new Date(report.exam.openingDate).toLocaleDateString("en-KE", { day:"numeric", month:"long", year:"numeric" }) : "—"}</div>
      </div>
    </div>

  </div>
</body>
</html>`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ReportScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const { examId, studentId } = useLocalSearchParams<{ examId: string; studentId: string }>();

  const { data, isLoading } = useQuery<Report>({
    queryKey: ["/reports", examId, studentId],
    queryFn: () => apiFetch(`/reports/${examId}/${studentId}`),
    enabled: !!examId && !!studentId,
  });

  const { data: trends } = useQuery<TrendData>({
    queryKey: ["/trends/student", studentId],
    queryFn: () => apiFetch(`/trends/student/${studentId}`),
    enabled: !!studentId,
  });

  const trendRows = (trends?.exams ?? []).sort(
    (a, b) => a.year !== b.year ? a.year - b.year : a.term - b.term
  );
  const hasTrend = trendRows.length > 1;
  const currentExamId = parseInt(examId ?? "0");

  const handleSharePdf = async () => {
    if (!data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const html = buildReportHtml(data, trendRows, currentExamId);
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      // Rename to something meaningful before sharing
      const fileName = `Report_${data.student.admissionNo}_T${data.exam.term}_${data.exam.year}.pdf`;
      const destUri = uri.replace(/[^/]+$/, fileName);
      // expo-print returns a cache file; we share it directly
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Sharing unavailable", "PDF sharing is not supported on this device.");
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Share ${data.student.name}'s Report`,
        UTI: "com.adobe.pdf",
      });
    } catch (err: any) {
      Alert.alert("PDF Error", err.message ?? "Could not generate PDF.");
    }
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
    schoolName: { fontFamily: "Poppins_700Bold", fontSize: 18, color: "#fff", textAlign: "center" },
    motto: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 4, textAlign: "center", fontStyle: "italic" },
    examLabel: { fontFamily: "Poppins_500Medium", fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 10 },
    infoGrid: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
      padding: 14, flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12,
    },
    infoItem: { width: "47%" },
    infoLabel: { fontFamily: "Poppins_400Regular", fontSize: 10, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    infoValue: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.foreground },
    sectionTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.foreground, marginBottom: 8, marginTop: 4 },
    tableCard: { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 12 },
    tableHeader: { flexDirection: "row", backgroundColor: colors.muted, paddingHorizontal: 12, paddingVertical: 8 },
    tableHeaderText: { fontFamily: "Poppins_600SemiBold", fontSize: 11, color: colors.mutedForeground, textTransform: "uppercase" },
    tableRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "center" },
    tableRowAlt: { backgroundColor: colors.muted + "60" },
    tableCell: { fontFamily: "Poppins_400Regular", fontSize: 13, color: colors.foreground },
    tableCellBold: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.foreground },
    gradeBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start" },
    gradeText: { fontFamily: "Poppins_700Bold", fontSize: 11, color: "#fff" },
    totalRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.primary, borderTopWidth: 1, borderTopColor: colors.primary, alignItems: "center" },
    totalLabel: { fontFamily: "Poppins_700Bold", fontSize: 13, color: "#fff", flex: 1 },
    totalValue: { fontFamily: "Poppins_700Bold", fontSize: 14, color: "#fff", textAlign: "right" },
    // Trend
    trendCard: { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 12 },
    trendRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "center" },
    trendRowCurrent: { backgroundColor: colors.primary + "18" },
    trendLabel: { fontFamily: "Poppins_500Medium", fontSize: 13, color: colors.foreground, flex: 1 },
    trendStudentPct: { fontFamily: "Poppins_700Bold", fontSize: 13, width: 60, textAlign: "right" },
    trendClassPct: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, width: 72, textAlign: "right" },
    trendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    trendCaption: { fontFamily: "Poppins_400Regular", fontSize: 11, color: colors.mutedForeground, textAlign: "center", paddingVertical: 6, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.border },
    // Comments
    commentCard: { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    commentLabel: { fontFamily: "Poppins_500Medium", fontSize: 11, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
    commentText: { fontFamily: "Poppins_400Regular", fontSize: 13, color: colors.foreground, fontStyle: "italic", lineHeight: 20 },
    // Share button
    shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, borderRadius: colors.radius, padding: 16, marginBottom: 12 },
    shareBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#fff" },
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
        <Text style={styles.examLabel}>{data.exam.name} · Term {data.exam.term}, {data.exam.year}</Text>
      </View>

      {/* Student info */}
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
          <Text style={[styles.tableHeaderText, { width: 64, textAlign: "center" }]}>Marks</Text>
          <Text style={[styles.tableHeaderText, { width: 44, textAlign: "center" }]}>%</Text>
          <Text style={[styles.tableHeaderText, { width: 44, textAlign: "center" }]}>Grade</Text>
        </View>
        {data.subjects.map((sub, i) => (
          <View key={sub.learningAreaId} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
            <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>{sub.learningAreaName}</Text>
            <Text style={[styles.tableCellBold, { width: 64, textAlign: "center" }]}>{sub.marks}/{sub.maxMarks}</Text>
            <Text style={[styles.tableCell, { width: 44, textAlign: "center" }]}>{sub.percentage.toFixed(0)}%</Text>
            <View style={{ width: 44, alignItems: "center" }}>
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

      {/* Performance trajectory */}
      {hasTrend && (
        <>
          <Text style={styles.sectionTitle}>Performance Trajectory</Text>
          <View style={styles.trendCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Exam</Text>
              <Text style={[styles.tableHeaderText, { width: 60, textAlign: "right" }]}>Student</Text>
              <Text style={[styles.tableHeaderText, { width: 72, textAlign: "right" }]}>Class Avg</Text>
            </View>
            {trendRows.map((e) => {
              const isCurrent = e.examId === currentExamId;
              const above = e.classAverage != null && e.averagePercentage >= e.classAverage;
              return (
                <View key={e.examId} style={[styles.trendRow, isCurrent && styles.trendRowCurrent]}>
                  <View style={[styles.trendDot, { backgroundColor: isCurrent ? colors.primary : above ? "#10b981" : "#f59e0b" }]} />
                  <Text style={styles.trendLabel}>T{e.term} {e.year}{isCurrent ? " ◀" : ""}</Text>
                  <Text style={[styles.trendStudentPct, { color: above ? "#10b981" : colors.foreground }]}>
                    {e.averagePercentage.toFixed(1)}%
                  </Text>
                  <Text style={styles.trendClassPct}>
                    {e.classAverage != null ? `${e.classAverage.toFixed(1)}%` : "—"}
                  </Text>
                </View>
              );
            })}
            <Text style={styles.trendCaption}>Green = above class average · ◀ = this exam</Text>
          </View>
        </>
      )}

      {/* Comments */}
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

      {/* Share as PDF */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleSharePdf} activeOpacity={0.8}>
        <Ionicons name="document-outline" size={20} color="#fff" />
        <Text style={styles.shareBtnText}>Share Report as PDF</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

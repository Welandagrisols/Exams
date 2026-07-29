import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, useColorScheme, Alert,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

type Student = { id: number; name: string; admissionNo: string };
type Exam = { id: number; name: string; classId: number; className: string | null; term: number; year: number };

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

type TrendExam = { examId: number; examName: string; term: number; year: number; averagePercentage: number; classAverage: number | null };

/** Small sparkline-style trend chart — a quick "is this student improving vs the class" glance, sized to sit in a narrow sidebar. */
function buildCompactTrendSvg(trendRows: TrendExam[], currentExamId: number): string {
  const W = 130, H = 60;
  const PL = 4, PR = 4, PT = 5, PB = 5;
  const cW = W - PL - PR, cH = H - PT - PB;
  const n = trendRows.length;
  const xAt = (i: number) => (PL + (n <= 1 ? cW / 2 : (i / (n - 1)) * cW)).toFixed(1);
  const yAt = (pct: number) => (PT + (1 - pct / 100) * cH).toFixed(1);

  const studentPts = trendRows.map((r, i) => `${xAt(i)},${yAt(r.averagePercentage)}`).join(" ");
  const classPts = trendRows.filter(r => r.classAverage != null).map((r) => {
    const idx = trendRows.indexOf(r);
    return `${xAt(idx)},${yAt(r.classAverage!)}`;
  }).join(" ");

  const studentDots = trendRows.map((r, i) => {
    const isCurrent = r.examId === currentExamId;
    return `<circle cx="${xAt(i)}" cy="${yAt(r.averagePercentage)}" r="${isCurrent ? 4 : 2.5}" fill="${isCurrent ? "#2563eb" : "#fff"}" stroke="#2563eb" stroke-width="1.5"/>`;
  }).join("");

  const classDots = trendRows.map((r, i) => r.classAverage != null
    ? `<circle cx="${xAt(i)}" cy="${yAt(r.classAverage)}" r="2" fill="#f59e0b" stroke="#fff" stroke-width="1"/>`
    : ""
  ).join("");

  const classLine = classPts
    ? `<polyline points="${classPts}" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 2"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="display:block">
    ${classLine}
    <polyline points="${studentPts}" fill="none" stroke="#2563eb" stroke-width="2"/>
    ${classDots}
    ${studentDots}
  </svg>`;
}

/** Lean report card HTML — same visual language as the full report screen, with a small trend sparkline, built for fast bulk generation. */
function buildSimpleReportHtml(report: any, trendRows: TrendExam[] = [], currentExamId = 0): string {
  const subjectRows = report.subjects.map((s: any) => `
    <tr>
      <td style="border:1px solid #e2e8f0;padding:6px 10px;font-weight:600">${s.learningAreaName}</td>
      <td style="border:1px solid #e2e8f0;padding:6px 10px;text-align:center;font-family:monospace">${s.marks} <span style="color:#94a3b8;font-size:10px">/ ${s.maxMarks}</span></td>
      <td style="border:1px solid #e2e8f0;padding:6px 10px;text-align:center;font-family:monospace">${s.percentage.toFixed(0)}%</td>
      <td style="border:1px solid #e2e8f0;padding:6px 10px;text-align:center">
        <span style="display:inline-block;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;background:${rubricBg(s.rubricGrade)};color:${rubricHex(s.rubricGrade)}">${s.rubricGrade}</span>
      </td>
    </tr>`).join("");

  const signatureBlocks = (report.signatures ?? []).length > 0
    ? report.signatures.map((sig: any) => `
        <div style="min-width:150px;flex:1">
          ${sig.signatureData ? `<img src="${sig.signatureData}" style="height:38px;object-fit:contain;display:block" />` : `<div style="height:38px"></div>`}
          <div style="border-top:1px solid #1e293b;padding-top:3px;margin-top:2px">
            <div style="font-size:11px;font-weight:700;color:#1e293b">${sig.name}</div>
            <div style="font-size:8px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">${sig.title}</div>
          </div>
        </div>`).join("")
    : `<div style="font-size:10px;color:#94a3b8">Not yet signed.</div>`;

  return `
  <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;max-width:700px;margin:0 auto;font-family:-apple-system,sans-serif;color:#0f172a;font-size:12px;page-break-after:always">
    <div style="padding:22px 28px 16px;border-bottom:1px solid #e2e8f0;text-align:center;background:#f8fafc">
      <h1 style="font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#0f172a;margin:0">${report.school.name}</h1>
      ${report.school.motto ? `<p style="color:#1e3a5f;font-weight:700;font-style:italic;margin-top:4px">"${report.school.motto}"</p>` : ""}
      <div style="margin-top:14px;padding-top:12px;border-top:2px solid #e2e8f0">
        <h2 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1e293b;margin:0">Termly Performance Report</h2>
        <div style="margin-top:6px;font-weight:500;color:#475569;font-size:11px">${report.exam.name} · Term ${report.exam.term}, ${report.exam.year}</div>
      </div>
    </div>
    <div style="padding:12px 28px;border-bottom:1px solid #e2e8f0;display:flex;gap:14px;align-items:stretch">
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;align-content:center">
        <div><div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase">Student</div><div style="font-weight:700;font-size:12px">${report.student.name}</div></div>
        <div><div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase">Admission No</div><div style="font-weight:700;font-size:12px">${report.student.admissionNo}</div></div>
        <div><div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase">Class</div><div style="font-weight:700;font-size:12px">${report.student.className}</div></div>
        <div><div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase">Rank</div><div style="font-weight:700;font-size:12px">${report.rank} of ${report.classSize}</div></div>
      </div>
      ${trendRows.length > 1 ? `
      <div style="width:138px;flex-shrink:0;border-left:1px solid #e2e8f0;padding-left:12px;display:flex;flex-direction:column;justify-content:center">
        <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Trend vs Class</div>
        ${buildCompactTrendSvg(trendRows, currentExamId)}
        <div style="font-size:7px;color:#64748b;margin-top:2px;line-height:1.5">
          <span style="display:inline-block;width:6px;height:2px;background:#2563eb;margin-right:2px;vertical-align:middle"></span>Student&nbsp;&nbsp;<span style="display:inline-block;width:6px;height:0;border-top:1.5px dashed #f59e0b;margin-right:2px;vertical-align:middle"></span>Class
        </div>
      </div>` : ""}
    </div>
    <div style="padding:16px 28px">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead style="background:#f1f5f9">
          <tr>
            <th style="border:1px solid #e2e8f0;padding:6px 10px;text-align:left;color:#475569;font-size:9px;text-transform:uppercase">Learning Area</th>
            <th style="border:1px solid #e2e8f0;padding:6px 10px;color:#475569;font-size:9px;text-transform:uppercase">Marks</th>
            <th style="border:1px solid #e2e8f0;padding:6px 10px;color:#475569;font-size:9px;text-transform:uppercase">%</th>
            <th style="border:1px solid #e2e8f0;padding:6px 10px;color:#475569;font-size:9px;text-transform:uppercase">Grade</th>
          </tr>
        </thead>
        <tbody>${subjectRows}</tbody>
        <tr style="background:#1e293b;color:#fff;font-weight:700">
          <td style="border:1px solid #334155;padding:8px 10px;text-transform:uppercase">Overall</td>
          <td style="border:1px solid #334155;padding:8px 10px;text-align:center;font-family:monospace">${report.totalMarks}/${report.totalMaxMarks}</td>
          <td style="border:1px solid #334155;padding:8px 10px;text-align:center;font-family:monospace;color:#fbbf24">${report.averagePercentage.toFixed(1)}%</td>
          <td style="border:1px solid #334155;padding:8px 10px;text-align:center;color:#fbbf24">${report.overallGrade}</td>
        </tr>
      </table>
    </div>
    <div style="padding:14px 28px;border-top:1px solid #e2e8f0;background:#f8fafc">
      <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px">Class Teacher's Remarks</div>
      <div style="min-height:34px;border-bottom:1px dashed #94a3b8;font-style:italic;color:#1e293b">${report.teacherComment || "&nbsp;"}</div>
      <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;margin:10px 0 4px">Principal's Remarks</div>
      <div style="min-height:34px;border-bottom:1px dashed #94a3b8;font-style:italic;color:#1e293b">${report.principalComment || "&nbsp;"}</div>
    </div>
    <div style="padding:14px 28px;border-top:1px solid #e2e8f0;display:flex;flex-wrap:wrap;gap:18px">${signatureBlocks}</div>
  </div>`;
}

function wrapHtmlDoc(inner: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>*{box-sizing:border-box;margin:0;padding:0}@page{margin:12mm 10mm}</style></head><body>${inner}</body></html>`;
}

export default function ShareReportsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const { examId } = useLocalSearchParams<{ examId: string }>();

  const { data: exam } = useQuery<Exam>({
    queryKey: ["/exams", examId],
    queryFn: () => apiFetch(`/exams/${examId}`),
    enabled: !!examId,
  });

  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ["/students", exam?.classId],
    queryFn: () => apiFetch(`/students?classId=${exam?.classId}`),
    enabled: !!exam?.classId,
  });

  const [sharingId, setSharingId] = useState<number | null>(null);
  const [sharingAll, setSharingAll] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());
  const currentExamId = parseInt(examId ?? "0", 10);

  const fetchTrendRows = async (studentId: number): Promise<TrendExam[]> => {
    try {
      const trends = await apiFetch<{ exams: TrendExam[] }>(`/trends/student/${studentId}`);
      return (trends.exams ?? []).sort((a, b) => a.year !== b.year ? a.year - b.year : a.term - b.term);
    } catch {
      return []; // trend chart is a nice-to-have — never block sharing on it
    }
  };

  const shareOne = async (studentId: number) => {
    setSharingId(studentId);
    try {
      const [report, trendRows] = await Promise.all([
        apiFetch<any>(`/reports/${examId}/${studentId}`),
        fetchTrendRows(studentId),
      ]);
      const html = wrapHtmlDoc(buildSimpleReportHtml(report, trendRows, currentExamId));
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert("Sharing unavailable", "PDF sharing is not supported on this device."); return; }
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Share ${report.student.name}'s Report`,
        UTI: "com.adobe.pdf",
      });
      setDoneIds(s => new Set(s).add(studentId));
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not generate this report.");
    } finally {
      setSharingId(null);
    }
  };

  const shareAllCombined = async () => {
    if (!students?.length) return;
    setSharingAll(true);
    try {
      const [reports, trendRowsList] = await Promise.all([
        Promise.all(students.map(st => apiFetch<any>(`/reports/${examId}/${st.id}`))),
        Promise.all(students.map(st => fetchTrendRows(st.id))),
      ]);
      const combined = wrapHtmlDoc(
        reports.map((r, i) => buildSimpleReportHtml(r, trendRowsList[i], currentExamId)).join("")
      );
      const { uri } = await Print.printToFileAsync({ html: combined, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert("Sharing unavailable", "PDF sharing is not supported on this device."); return; }
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `${exam?.className ?? "Class"} — All Reports`,
        UTI: "com.adobe.pdf",
      });
      setDoneIds(new Set(students.map(s => s.id)));
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not generate the combined PDF.");
    } finally {
      setSharingAll(false);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    banner: { margin: 16, marginBottom: 8 },
    bannerTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.foreground },
    bannerSub: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 3, lineHeight: 17 },
    combinedBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      marginHorizontal: 16, marginBottom: 12, paddingVertical: 14,
      borderRadius: colors.radius, backgroundColor: colors.primary,
    },
    combinedBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#fff" },
    item: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, marginHorizontal: 16, marginVertical: 5,
      borderRadius: colors.radius, padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    name: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.foreground },
    sub: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
    shareBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: colors.radius, backgroundColor: colors.primary,
    },
    shareBtnDone: { backgroundColor: "#dcfce7" },
    shareBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 12, color: "#fff" },
    shareBtnTextDone: { color: "#166534" },
  });

  if (isLoading || !exam) {
    return <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.banner}>
        <Text style={s.bannerTitle}>{exam.name} · {exam.className}</Text>
        <Text style={s.bannerSub}>
          Share each report individually via WhatsApp, SMS, or email — or combine every student's report into one PDF. Printing in bulk is available from the web portal, where a printer can be connected.
        </Text>
      </View>

      <TouchableOpacity style={s.combinedBtn} onPress={shareAllCombined} disabled={sharingAll || !students?.length}>
        {sharingAll
          ? <ActivityIndicator color="#fff" size="small" />
          : <><Ionicons name="albums-outline" size={18} color="#fff" /><Text style={s.combinedBtnText}>Combine All into One PDF & Share</Text></>}
      </TouchableOpacity>

      <FlatList
        data={students ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => {
          const isDone = doneIds.has(item.id);
          const isBusy = sharingId === item.id;
          return (
            <View style={s.item}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.sub}>{item.admissionNo}</Text>
              </View>
              <TouchableOpacity
                style={[s.shareBtn, isDone && s.shareBtnDone]}
                onPress={() => shareOne(item.id)}
                disabled={isBusy}
              >
                {isBusy
                  ? <ActivityIndicator color={isDone ? "#166534" : "#fff"} size="small" />
                  : <>
                      <Ionicons name={isDone ? "checkmark-circle" : "share-social-outline"} size={15} color={isDone ? "#166534" : "#fff"} />
                      <Text style={[s.shareBtnText, isDone && s.shareBtnTextDone]}>{isDone ? "Shared" : "Share"}</Text>
                    </>}
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

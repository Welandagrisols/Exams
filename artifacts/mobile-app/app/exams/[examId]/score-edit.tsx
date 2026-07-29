import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, useColorScheme, TextInput, Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getRubricColor } from "@/lib/api";
import palette from "@/constants/colors";

type ScoreEntry = {
  learningAreaId: number;
  learningAreaName: string;
  abbreviation: string;
  marks: string; // string for TextInput
  maxMarks: number;
};

type ScoreData = {
  examId: number;
  examName: string;
  rows: {
    studentId: number;
    studentName: string;
    admissionNo: string;
    scores: { learningAreaId: number; learningAreaName: string; abbreviation: string; marks: number | null; maxMarks: number }[];
  }[];
};

function getGrade(marks: number, max: number): string {
  if (max <= 0) return "BE";
  const pct = (marks / max) * 100;
  if (pct >= 80) return "EE";
  if (pct >= 60) return "ME";
  if (pct >= 40) return "AE";
  return "BE";
}

export default function ScoreEditScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { examId, studentId } = useLocalSearchParams<{ examId: string; studentId: string }>();

  const { data, isLoading } = useQuery<ScoreData>({
    queryKey: ["/scores", examId],
    queryFn: () => apiFetch(`/scores/${examId}`),
    enabled: !!examId,
  });

  const [entries, setEntries] = useState<ScoreEntry[] | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialise entries once data arrives (useEffect avoids setting state during render)
  useEffect(() => {
    if (!data || entries) return;
    const row = data.rows.find((r) => String(r.studentId) === studentId);
    if (row) {
      setEntries(
        row.scores.map((s) => ({
          learningAreaId: s.learningAreaId,
          learningAreaName: s.learningAreaName,
          abbreviation: s.abbreviation,
          marks: s.marks !== null ? String(s.marks) : "",
          maxMarks: s.maxMarks,
        }))
      );
    } else {
      // Student has no scores yet — show empty entry list so user can add them
      setEntries([]);
    }
  }, [data, studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const studentName = data?.rows.find((r) => String(r.studentId) === studentId)?.studentName ?? "";

  const handleSave = async () => {
    if (!entries) return;
    // Validate all filled marks are numeric and within range
    for (const e of entries) {
      if (e.marks === "") continue; // allow blank (skip)
      const n = parseFloat(e.marks);
      if (isNaN(n) || n < 0 || n > e.maxMarks) {
        Alert.alert("Invalid mark", `${e.learningAreaName}: enter a number between 0 and ${e.maxMarks}.`);
        return;
      }
    }
    setSaving(true);
    try {
      const scores = entries
        .filter((e) => e.marks !== "")
        .map((e) => ({ learningAreaId: e.learningAreaId, marks: parseFloat(e.marks) }));
      await apiFetch(`/scores`, {
        method: "POST",
        body: JSON.stringify({ studentId: parseInt(studentId), examId: parseInt(examId), scores }),
      });
      queryClient.invalidateQueries({ queryKey: ["/scores", examId] });
      Alert.alert("Saved", "Scores updated.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert("Save failed", err.message ?? "Could not save scores.");
    } finally {
      setSaving(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
    header: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border, padding: 16,
    },
    title: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.foreground },
    sub: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    row: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    },
    subject: { fontFamily: "Poppins_500Medium", fontSize: 13, color: colors.foreground, flex: 1 },
    input: {
      fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.foreground,
      borderWidth: 1, borderColor: colors.border, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 8, width: 72, textAlign: "center",
    },
    maxLabel: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, width: 36 },
    gradeDot: {
      width: 30, height: 22, borderRadius: 4,
      justifyContent: "center", alignItems: "center",
    },
    gradeText: { fontFamily: "Poppins_700Bold", fontSize: 9, color: "#fff" },
    btn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, paddingVertical: 13, borderRadius: colors.radius,
      backgroundColor: colors.primary,
    },
    btnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#fff" },
  });

  if (isLoading || !entries) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>{studentName}</Text>
        <Text style={styles.sub}>{data?.examName} · edit marks below</Text>
      </View>

      {entries.map((entry, i) => {
        const n = parseFloat(entry.marks);
        const grade = !isNaN(n) && entry.marks !== "" ? getGrade(n, entry.maxMarks) : null;
        return (
          <View key={entry.learningAreaId} style={styles.row}>
            <Text style={styles.subject} numberOfLines={2}>{entry.learningAreaName}</Text>
            <TextInput
              style={styles.input}
              value={entry.marks}
              onChangeText={(v) => setEntries((prev) => prev ? prev.map((e, j) => j === i ? { ...e, marks: v } : e) : prev)}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={styles.maxLabel}>/{entry.maxMarks}</Text>
            <View style={[styles.gradeDot, { backgroundColor: grade ? getRubricColor(grade) : colors.border }]}>
              {grade && <Text style={styles.gradeText}>{grade}</Text>}
            </View>
          </View>
        );
      })}

      <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={16} color="#fff" />}
        <Text style={styles.btnText}>{saving ? "Saving…" : "Save Scores"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

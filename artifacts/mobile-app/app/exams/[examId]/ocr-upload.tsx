import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, useColorScheme, Image, TextInput, Alert,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, apiUpload } from "@/lib/api";
import palette from "@/constants/colors";

type OcrMark = { learningAreaId: number; subjectName: string; maxMarks: number; marks: number | null };
type OcrRow = { studentId: number | null; studentName: string; admissionNo: string; marks: OcrMark[] };
type OcrResult = { examId: number; examName: string; className: string; scores: OcrRow[] };

export default function OcrUploadScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const { examId } = useLocalSearchParams<{ examId: string }>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [editedMarks, setEditedMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    title: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.foreground },
    sub: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground },
    dropZone: {
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
      borderRadius: colors.radius,
      minHeight: 160,
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
    },
    preview: { width: "100%", height: 220, borderRadius: colors.radius },
    buttonRow: { flexDirection: "row", gap: 10 },
    btn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    btnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.foreground },
    primaryBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#fff" },
    processingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
    },
    processingText: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, flex: 1 },
    studentCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    studentHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      backgroundColor: colors.muted,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    studentName: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.foreground, flex: 1 },
    unmatched: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#ef4444" },
    markRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    markLabel: { fontFamily: "Poppins_400Regular", fontSize: 13, color: colors.foreground, flex: 1 },
    markInput: {
      width: 60,
      textAlign: "center",
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingVertical: 4,
    },
    saveBar: { gap: 10 },
    successBox: {
      alignItems: "center",
      gap: 8,
      padding: 24,
    },
    successText: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: colors.foreground },
  });

  const requestAndPick = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", fromCamera ? "Camera access is required to take a photo." : "Gallery access is required to pick a photo.");
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.85,
    };
    const pickerResult = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!pickerResult.canceled && pickerResult.assets?.[0]) {
      setImageUri(pickerResult.assets[0].uri);
      setResult(null);
      setSaved(false);
    }
  };

  const handleProcess = async () => {
    if (!imageUri) return;
    setProcessing(true);
    try {
      const form = new FormData();
      const filename = imageUri.split("/").pop() || "scoresheet.jpg";
      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      form.append("image", { uri: imageUri, name: filename, type: mimeType } as any);

      const data = await apiUpload<OcrResult>(`/exams/${examId}/ocr-upload`, form);
      setResult(data);
      const init: Record<string, string> = {};
      data.scores.forEach((row) => {
        row.marks.forEach((m) => {
          init[`${row.studentId}-${m.learningAreaId}`] = m.marks != null ? String(m.marks) : "";
        });
      });
      setEditedMarks(init);
    } catch (err: any) {
      Alert.alert("OCR failed", err.message ?? "Could not read the score sheet.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const students = result.scores
        .filter((row) => row.studentId)
        .map((row) => ({
          studentId: row.studentId!,
          scores: row.marks
            .map((m) => ({ learningAreaId: m.learningAreaId, marks: parseFloat(editedMarks[`${row.studentId}-${m.learningAreaId}`] ?? "") }))
            .filter((s) => !isNaN(s.marks) && s.marks >= 0),
        }))
        .filter((s) => s.scores.length > 0);

      if (students.length === 0) {
        Alert.alert("Nothing to save", "No matched students have valid marks entered.");
        return;
      }

      await apiFetch(`/scores/bulk`, {
        method: "POST",
        body: JSON.stringify({ examId: parseInt(examId), students }),
      });
      setSaved(true);
    } catch (err: any) {
      Alert.alert("Save failed", err.message ?? "Could not save marks.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          <Text style={styles.successText}>Marks saved!</Text>
          <Text style={styles.sub}>All extracted scores have been recorded.</Text>
          <View style={[styles.buttonRow, { marginTop: 12 }]}>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => { setSaved(false); setResult(null); setImageUri(null); }}
            >
              <Text style={styles.btnText}>Upload Another</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.primaryBtn]}
              onPress={() => router.replace(`/exams/${examId}/scores`)}
            >
              <Text style={styles.primaryBtnText}>View Scores</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.title}>Scan Score Sheet</Text>
        <Text style={styles.sub}>Take a photo or pick one from your gallery. Gemini AI will read every mark.</Text>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.dropZone}>
            <Ionicons name="camera-outline" size={40} color={colors.mutedForeground} />
            <Text style={styles.sub}>No image selected</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btn} onPress={() => requestAndPick(true)}>
            <Ionicons name="camera" size={16} color={colors.foreground} />
            <Text style={styles.btnText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => requestAndPick(false)}>
            <Ionicons name="images" size={16} color={colors.foreground} />
            <Text style={styles.btnText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>

        {imageUri && !result && (
          <TouchableOpacity
            style={[styles.btn, styles.primaryBtn]}
            onPress={handleProcess}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="sparkles" size={16} color="#fff" />
            )}
            <Text style={styles.primaryBtnText}>{processing ? "Reading marks…" : "Process with AI"}</Text>
          </TouchableOpacity>
        )}

        {processing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.processingText}>Gemini AI is reading every mark. This takes 10–20 seconds…</Text>
          </View>
        )}
      </View>

      {result && (
        <View style={{ gap: 12 }}>
          <View style={styles.card}>
            <Text style={styles.title}>Review Extracted Marks</Text>
            <Text style={styles.sub}>{result.className} — {result.examName}. Check every value before saving.</Text>
          </View>

          {result.scores.map((row) => (
            <View key={row.studentId ?? row.studentName} style={styles.studentCard}>
              <View style={styles.studentHeader}>
                <Text style={styles.studentName} numberOfLines={1}>{row.studentName}</Text>
                {!row.studentId && <Text style={styles.unmatched}>Not matched</Text>}
              </View>
              {row.marks.map((m) => {
                const key = `${row.studentId}-${m.learningAreaId}`;
                return (
                  <View key={m.learningAreaId} style={styles.markRow}>
                    <Text style={styles.markLabel} numberOfLines={1}>{m.subjectName} (/{m.maxMarks})</Text>
                    <TextInput
                      style={styles.markInput}
                      keyboardType="numeric"
                      value={editedMarks[key] ?? ""}
                      onChangeText={(v) => setEditedMarks((prev) => ({ ...prev, [key]: v }))}
                      editable={!!row.studentId}
                      placeholder="—"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                );
              })}
            </View>
          ))}

          <View style={styles.saveBar}>
            <TouchableOpacity
              style={[styles.btn, styles.primaryBtn]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={16} color="#fff" />}
              <Text style={styles.primaryBtnText}>{saving ? "Saving…" : "Confirm & Save All Marks"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => { setResult(null); setImageUri(null); }}
            >
              <Text style={styles.btnText}>Start Over</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

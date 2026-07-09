import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, useColorScheme, Image, TextInput, Alert,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiUpload } from "@/lib/api";
import palette from "@/constants/colors";

type OcrStudentRow = {
  rowIndex: number;
  name: string;
  admissionNo: string;
  gender: "M" | "F" | null;
  dateOfBirth: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  nationality: string | null;
  notes: string | null;
  valid: boolean;
};

type OcrStudentListResult = { students: OcrStudentRow[]; total: number; valid: number };

export default function BulkScanStudentsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rows, setRows] = useState<OcrStudentRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ count: number } | null>(null);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
    card: {
      backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1,
      borderColor: colors.border, padding: 16, gap: 12,
    },
    title: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.foreground },
    sub: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground },
    dropZone: {
      borderWidth: 2, borderColor: colors.border, borderStyle: "dashed",
      borderRadius: colors.radius, minHeight: 160, justifyContent: "center",
      alignItems: "center", gap: 8,
    },
    preview: { width: "100%", height: 220, borderRadius: colors.radius },
    buttonRow: { flexDirection: "row", gap: 10 },
    btn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, paddingVertical: 12, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border,
    },
    primaryBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
    btnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.foreground },
    primaryBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#fff" },
    processingRow: {
      flexDirection: "row", alignItems: "center", gap: 8, padding: 12,
      backgroundColor: colors.muted, borderRadius: colors.radius,
    },
    processingText: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, flex: 1 },
    rowCard: {
      backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1,
      borderColor: colors.border, overflow: "hidden",
    },
    rowHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      padding: 12, backgroundColor: colors.muted, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    rowName: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.foreground, flex: 1 },
    invalidTag: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#ef4444" },
    fieldRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
    fieldLabel: { fontFamily: "Poppins_500Medium", fontSize: 11, color: colors.mutedForeground, width: 90 },
    fieldInput: {
      flex: 1, fontFamily: "Poppins_400Regular", fontSize: 13, color: colors.foreground,
      borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6,
    },
    successBox: { alignItems: "center", gap: 8, padding: 24 },
    successText: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: colors.foreground },
    summaryBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  });

  const requestAndPick = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", fromCamera ? "Camera access is required to take a photo." : "Gallery access is required to pick a photo.");
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.85 };
    const pickerResult = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!pickerResult.canceled && pickerResult.assets?.[0]) {
      setImageUri(pickerResult.assets[0].uri);
      setRows(null);
      setSaved(null);
    }
  };

  const handleProcess = async () => {
    if (!imageUri) return;
    setProcessing(true);
    try {
      const filename = imageUri.split("/").pop() || "list.jpg";
      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      const fd = new FormData();
      fd.append("image", { uri: imageUri, name: filename, type: mimeType } as any);

      const data = await apiUpload<OcrStudentListResult>(`/ocr/student-list`, fd);
      setRows(data.students);
    } catch (err: any) {
      Alert.alert("OCR failed", err.message ?? "Could not read the student list.");
    } finally {
      setProcessing(false);
    }
  };

  const updateRow = (rowIndex: number, key: keyof OcrStudentRow, value: string) => {
    setRows((prev) =>
      prev
        ? prev.map((r) =>
            r.rowIndex === rowIndex
              ? { ...r, [key]: value, valid: key === "name" ? !!value.trim() : r.valid }
              : r
          )
        : prev
    );
  };

  const handleSaveAll = async () => {
    if (!rows) return;
    const validRows = rows.filter((r) => r.name.trim() && r.admissionNo.trim());
    if (validRows.length === 0) {
      Alert.alert("Nothing to save", "Every row needs at least a name and admission number.");
      return;
    }
    setSaving(true);
    let successCount = 0;
    try {
      for (const row of validRows) {
        try {
          await apiFetch(`/students`, {
            method: "POST",
            body: JSON.stringify({
              name: row.name.trim(),
              admissionNo: row.admissionNo.trim(),
              classId: parseInt(classId),
              gender: row.gender || undefined,
              dateOfBirth: row.dateOfBirth || undefined,
              parentName: row.parentName || undefined,
              parentPhone: row.parentPhone || undefined,
              parentEmail: row.parentEmail || undefined,
              nationality: row.nationality || undefined,
              notes: row.notes || undefined,
            }),
          });
          successCount++;
        } catch {
          // continue on per-row failure (e.g. duplicate admission no.), report at the end
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/students", classId] });
      setSaved({ count: successCount });
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          <Text style={styles.successText}>{saved.count} of {rows?.length ?? 0} students saved</Text>
          {rows && saved.count < rows.length && (
            <Text style={styles.sub}>Some rows failed to save (e.g. duplicate admission numbers). You can re-check the class list and add missing students manually.</Text>
          )}
          <View style={[styles.buttonRow, { marginTop: 12 }]}>
            <TouchableOpacity style={styles.btn} onPress={() => { setSaved(null); setRows(null); setImageUri(null); }}>
              <Text style={styles.btnText}>Scan Another</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={() => router.back()}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.title}>Scan Class List</Text>
        <Text style={styles.sub}>Photograph a handwritten or printed class register / admission list. Gemini AI will extract every student row for you to review before saving.</Text>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.dropZone}>
            <Ionicons name="list-outline" size={40} color={colors.mutedForeground} />
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

        {imageUri && !rows && (
          <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={handleProcess} disabled={processing}>
            {processing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={16} color="#fff" />}
            <Text style={styles.primaryBtnText}>{processing ? "Reading list…" : "Process with AI"}</Text>
          </TouchableOpacity>
        )}

        {processing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.processingText}>Gemini AI is reading every row. This may take 20–30 seconds for a full class list…</Text>
          </View>
        )}
      </View>

      {rows && (
        <View style={{ gap: 12 }}>
          <View style={styles.card}>
            <View style={styles.summaryBar}>
              <Text style={styles.title}>Review Extracted Students</Text>
              <Text style={styles.sub}>{rows.length} rows found</Text>
            </View>
            <Text style={styles.sub}>Check every row. Fix mis-reads, remove rows you don't want by clearing the name, then save.</Text>
          </View>

          {rows.map((row) => (
            <View key={row.rowIndex} style={styles.rowCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowName} numberOfLines={1}>{row.name || "(no name)"}</Text>
                {!row.name.trim() && <Text style={styles.invalidTag}>Will be skipped</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput style={styles.fieldInput} value={row.name} onChangeText={(v) => updateRow(row.rowIndex, "name", v)} placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Adm. No.</Text>
                <TextInput style={styles.fieldInput} value={row.admissionNo} onChangeText={(v) => updateRow(row.rowIndex, "admissionNo", v)} placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <TextInput style={styles.fieldInput} value={row.gender ?? ""} onChangeText={(v) => updateRow(row.rowIndex, "gender", v.toUpperCase())} maxLength={1} autoCapitalize="characters" placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>DOB</Text>
                <TextInput style={styles.fieldInput} value={row.dateOfBirth ?? ""} onChangeText={(v) => updateRow(row.rowIndex, "dateOfBirth", v)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Parent</Text>
                <TextInput style={styles.fieldInput} value={row.parentName ?? ""} onChangeText={(v) => updateRow(row.rowIndex, "parentName", v)} placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput style={styles.fieldInput} value={row.parentPhone ?? ""} onChangeText={(v) => updateRow(row.rowIndex, "parentPhone", v)} keyboardType="phone-pad" placeholderTextColor={colors.mutedForeground} />
              </View>
            </View>
          ))}

          <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={handleSaveAll} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={16} color="#fff" />}
            <Text style={styles.primaryBtnText}>{saving ? "Saving…" : `Save All (${rows.filter(r => r.name.trim()).length})`}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, useColorScheme, Image, TextInput, Alert,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiUpload } from "@/lib/api";
import palette from "@/constants/colors";

type FeeEntry = {
  studentId: number | null;
  studentName: string;
  admissionNo: string;
  balance: string;
  matched: boolean;
};

type FeeArrearsResult = { entries: FeeEntry[] };

export default function ScanFeeSheetScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [entries, setEntries] = useState<FeeEntry[] | null>(null);
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
    matchedTag: { fontFamily: "Poppins_500Medium", fontSize: 11, color: "#10b981" },
    unmatchedTag: { fontFamily: "Poppins_500Medium", fontSize: 11, color: "#ef4444" },
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
      setEntries(null);
      setSaved(null);
    }
  };

  const handleProcess = async () => {
    if (!imageUri) return;
    setProcessing(true);
    try {
      const filename = imageUri.split("/").pop() || "fees.jpg";
      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      const fd = new FormData();
      fd.append("image", { uri: imageUri, name: filename, type: mimeType } as any);

      const data = await apiUpload<FeeArrearsResult>(`/ocr/fee-arrears`, fd);
      setEntries(data.entries);
    } catch (err: any) {
      Alert.alert("OCR failed", err.message ?? "Could not read the fee sheet.");
    } finally {
      setProcessing(false);
    }
  };

  const updateEntry = (index: number, key: "balance", value: string) => {
    setEntries((prev) =>
      prev ? prev.map((e, i) => (i === index ? { ...e, [key]: value } : e)) : prev
    );
  };

  const handleSaveAll = async () => {
    if (!entries) return;
    // Allow balance of 0 so teachers can zero out a cleared debt; only skip truly blank/invalid
    const matchedEntries = entries.filter(e => e.matched && e.studentId && e.balance !== "" && !isNaN(parseFloat(e.balance)));
    if (matchedEntries.length === 0) {
      Alert.alert("Nothing to save", "No matched students with a valid balance were found.");
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch<{ updated: number }>(`/students/fee-balances/bulk`, {
        method: "POST",
        body: JSON.stringify({
          updates: matchedEntries.map(e => ({ studentId: e.studentId, feeBalance: e.balance })),
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/students"] });
      setSaved({ count: result.updated });
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to save balances.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          <Text style={styles.successText}>{saved.count} fee balance{saved.count === 1 ? "" : "s"} saved</Text>
          <Text style={styles.sub}>Balances are now stored on each student and ready for reminders.</Text>
          <View style={[styles.buttonRow, { marginTop: 12 }]}>
            <TouchableOpacity style={styles.btn} onPress={() => { setSaved(null); setEntries(null); setImageUri(null); }}>
              <Text style={styles.btnText}>Scan Another</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={() => router.replace("/fees")}>
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
        <Text style={styles.title}>Scan Fee Sheet</Text>
        <Text style={styles.sub}>Photograph a handwritten or printed fee statement, ledger, or arrears list. Gemini AI will extract each student's balance and match them to your student records.</Text>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.dropZone}>
            <Ionicons name="receipt-outline" size={40} color={colors.mutedForeground} />
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

        {imageUri && !entries && (
          <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={handleProcess} disabled={processing}>
            {processing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={16} color="#fff" />}
            <Text style={styles.primaryBtnText}>{processing ? "Reading sheet…" : "Process with AI"}</Text>
          </TouchableOpacity>
        )}

        {processing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.processingText}>Gemini AI is reading every row. This may take 20–30 seconds…</Text>
          </View>
        )}
      </View>

      {entries && (
        <View style={{ gap: 12 }}>
          <View style={styles.card}>
            <View style={styles.summaryBar}>
              <Text style={styles.title}>Review Extracted Balances</Text>
              <Text style={styles.sub}>{entries.length} row{entries.length === 1 ? "" : "s"} found</Text>
            </View>
            <Text style={styles.sub}>Only matched students (green) can be saved. Fix any misread balance before saving.</Text>
          </View>

          {entries.map((entry, i) => (
            <View key={i} style={styles.rowCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowName} numberOfLines={1}>{entry.studentName || "(no name)"}</Text>
                {entry.matched
                  ? <Text style={styles.matchedTag}>Matched</Text>
                  : <Text style={styles.unmatchedTag}>Not found</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Adm. No.</Text>
                <TextInput style={[styles.fieldInput, { color: colors.mutedForeground }]} value={entry.admissionNo} editable={false} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Balance (Ksh)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={entry.balance}
                  onChangeText={(v) => updateEntry(i, "balance", v)}
                  keyboardType="numeric"
                  editable={entry.matched}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={handleSaveAll} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={16} color="#fff" />}
            <Text style={styles.primaryBtnText}>
              {saving ? "Saving…" : `Save ${entries.filter(e => e.matched).length} Matched Balance${entries.filter(e => e.matched).length === 1 ? "" : "s"}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

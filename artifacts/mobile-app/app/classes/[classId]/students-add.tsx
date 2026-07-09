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

type StudentForm = {
  name: string;
  admissionNo: string;
  gender: string | null;
  dateOfBirth: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  nationality: string | null;
  notes: string | null;
};

const EMPTY_FORM: StudentForm = {
  name: "", admissionNo: "", gender: null, dateOfBirth: null,
  parentName: null, parentPhone: null, parentEmail: null, nationality: null, notes: null,
};

export default function AddStudentScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState<StudentForm | null>(null);
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
    primaryBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
    btnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.foreground },
    primaryBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#fff" },
    processingRow: {
      flexDirection: "row", alignItems: "center", gap: 8, padding: 12,
      backgroundColor: colors.muted, borderRadius: colors.radius,
    },
    processingText: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, flex: 1 },
    fieldLabel: { fontFamily: "Poppins_500Medium", fontSize: 12, color: colors.mutedForeground },
    input: {
      fontFamily: "Poppins_400Regular", fontSize: 14, color: colors.foreground,
      borderWidth: 1, borderColor: colors.border, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 10,
    },
    successBox: { alignItems: "center", gap: 8, padding: 24 },
    successText: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: colors.foreground },
    orDivider: { flexDirection: "row", alignItems: "center", gap: 8 },
    orLine: { flex: 1, height: 1, backgroundColor: colors.border },
    orText: { fontFamily: "Poppins_400Regular", fontSize: 11, color: colors.mutedForeground },
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
      setForm(null);
      setSaved(false);
    }
  };

  const handleProcess = async () => {
    if (!imageUri) return;
    setProcessing(true);
    try {
      const filename = imageUri.split("/").pop() || "form.jpg";
      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      const fd = new FormData();
      fd.append("image", { uri: imageUri, name: filename, type: mimeType } as any);

      const data = await apiUpload<Partial<StudentForm>>(`/ocr/student`, fd);
      setForm({
        ...EMPTY_FORM,
        ...data,
        name: data.name ?? "",
        admissionNo: data.admissionNo ?? "",
      });
    } catch (err: any) {
      Alert.alert("OCR failed", err.message ?? "Could not read the registration form.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.admissionNo.trim()) {
      Alert.alert("Missing info", "Name and admission number are required.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/students`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          admissionNo: form.admissionNo.trim(),
          classId: parseInt(classId),
          gender: form.gender || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          parentName: form.parentName || undefined,
          parentPhone: form.parentPhone || undefined,
          parentEmail: form.parentEmail || undefined,
          nationality: form.nationality || undefined,
          notes: form.notes || undefined,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/students", classId] });
      setSaved(true);
    } catch (err: any) {
      Alert.alert("Save failed", err.message ?? "Could not save student.");
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof StudentForm, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  if (saved) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          <Text style={styles.successText}>Student added!</Text>
          <Text style={styles.sub}>{form?.name} has been saved to this class.</Text>
          <View style={[styles.buttonRow, { marginTop: 12 }]}>
            <TouchableOpacity style={styles.btn} onPress={() => { setSaved(false); setForm(null); setImageUri(null); }}>
              <Text style={styles.btnText}>Add Another</Text>
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
        <Text style={styles.title}>Scan Registration Form</Text>
        <Text style={styles.sub}>Take a photo of the student's admission card or biodata sheet. Gemini AI will fill in the details for you to review.</Text>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.dropZone}>
            <Ionicons name="document-text-outline" size={40} color={colors.mutedForeground} />
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

        {imageUri && !form && (
          <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={handleProcess} disabled={processing}>
            {processing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={16} color="#fff" />}
            <Text style={styles.primaryBtnText}>{processing ? "Reading form…" : "Process with AI"}</Text>
          </TouchableOpacity>
        )}

        {processing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.processingText}>Gemini AI is reading the form. This takes 10–20 seconds…</Text>
          </View>
        )}

        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => { setForm({ ...EMPTY_FORM }); setImageUri(null); }}
        >
          <Ionicons name="create-outline" size={16} color={colors.foreground} />
          <Text style={styles.btnText}>Enter Details Manually</Text>
        </TouchableOpacity>
      </View>

      {form && (
        <View style={styles.card}>
          <Text style={styles.title}>Review Student Details</Text>
          <Text style={styles.sub}>Check every field. Fix any mis-reads before saving.</Text>

          <View>
            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(v) => setField("name", v)} placeholder="e.g. John Kamau" placeholderTextColor={colors.mutedForeground} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Admission No. *</Text>
            <TextInput style={styles.input} value={form.admissionNo} onChangeText={(v) => setField("admissionNo", v)} placeholder="e.g. 2024/045" placeholderTextColor={colors.mutedForeground} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Gender (M/F)</Text>
            <TextInput style={styles.input} value={form.gender ?? ""} onChangeText={(v) => setField("gender", v.toUpperCase())} placeholder="M or F" placeholderTextColor={colors.mutedForeground} maxLength={1} autoCapitalize="characters" />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Date of Birth (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={form.dateOfBirth ?? ""} onChangeText={(v) => setField("dateOfBirth", v)} placeholder="2015-03-20" placeholderTextColor={colors.mutedForeground} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Parent/Guardian Name</Text>
            <TextInput style={styles.input} value={form.parentName ?? ""} onChangeText={(v) => setField("parentName", v)} placeholderTextColor={colors.mutedForeground} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Parent Phone</Text>
            <TextInput style={styles.input} value={form.parentPhone ?? ""} onChangeText={(v) => setField("parentPhone", v)} keyboardType="phone-pad" placeholderTextColor={colors.mutedForeground} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Parent Email</Text>
            <TextInput style={styles.input} value={form.parentEmail ?? ""} onChangeText={(v) => setField("parentEmail", v)} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.mutedForeground} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Nationality</Text>
            <TextInput style={styles.input} value={form.nationality ?? ""} onChangeText={(v) => setField("nationality", v)} placeholderTextColor={colors.mutedForeground} />
          </View>

          <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={16} color="#fff" />}
            <Text style={styles.primaryBtnText}>{saving ? "Saving…" : "Save Student"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

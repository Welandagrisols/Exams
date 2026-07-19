import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, useColorScheme, TextInput, Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

type StudentForm = {
  name: string;
  admissionNo: string;
  gender: string;
  dateOfBirth: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  nationality: string;
  notes: string;
};

export default function StudentEditScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { classId, studentId } = useLocalSearchParams<{ classId: string; studentId: string }>();

  const { data: student, isLoading } = useQuery<any>({
    queryKey: ["/students", studentId],
    queryFn: () => apiFetch(`/students/${studentId}`),
    enabled: !!studentId,
  });

  const [form, setForm] = useState<StudentForm | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialise form once data arrives (useEffect avoids setting state during render)
  useEffect(() => {
    if (!student || form) return;
    setForm({
      name: student.name ?? "",
      admissionNo: student.admissionNo ?? "",
      gender: student.gender ?? "",
      dateOfBirth: student.dateOfBirth ?? "",
      parentName: student.parentName ?? "",
      parentPhone: student.parentPhone ?? "",
      parentEmail: student.parentEmail ?? "",
      nationality: student.nationality ?? "",
      notes: student.notes ?? "",
    });
  }, [student]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (key: keyof StudentForm, value: string) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.admissionNo.trim()) {
      Alert.alert("Missing info", "Name and admission number are required.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/students/${studentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          admissionNo: form.admissionNo.trim(),
          gender: form.gender || null,
          dateOfBirth: form.dateOfBirth || null,
          parentName: form.parentName || null,
          parentPhone: form.parentPhone || null,
          parentEmail: form.parentEmail || null,
          nationality: form.nationality || null,
          notes: form.notes || null,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/students", classId] });
      queryClient.invalidateQueries({ queryKey: ["/students", studentId] });
      Alert.alert("Saved", "Student details updated.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert("Save failed", err.message ?? "Could not update student.");
    } finally {
      setSaving(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
    card: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12,
    },
    title: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.foreground },
    fieldLabel: { fontFamily: "Poppins_500Medium", fontSize: 12, color: colors.mutedForeground, marginBottom: 4 },
    input: {
      fontFamily: "Poppins_400Regular", fontSize: 14, color: colors.foreground,
      borderWidth: 1, borderColor: colors.border, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 10,
    },
    btn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, paddingVertical: 13, borderRadius: colors.radius,
      backgroundColor: colors.primary,
    },
    btnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#fff" },
  });

  if (isLoading || !form) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const Field = ({ label, fieldKey, ...props }: { label: string; fieldKey: keyof StudentForm } & any) => (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={form[fieldKey]}
        onChangeText={(v) => setField(fieldKey, v)}
        placeholderTextColor={colors.mutedForeground}
        {...props}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.title}>Edit Student</Text>
        <Field label="Full Name *" fieldKey="name" placeholder="e.g. John Kamau" />
        <Field label="Admission No. *" fieldKey="admissionNo" placeholder="e.g. 2024/045" />
        <Field label="Gender (M/F)" fieldKey="gender" placeholder="M or F" maxLength={1} autoCapitalize="characters" />
        <Field label="Date of Birth (YYYY-MM-DD)" fieldKey="dateOfBirth" placeholder="2015-03-20" />
        <Field label="Parent/Guardian Name" fieldKey="parentName" />
        <Field label="Parent Phone" fieldKey="parentPhone" keyboardType="phone-pad" />
        <Field label="Parent Email" fieldKey="parentEmail" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Nationality" fieldKey="nationality" />
        <Field label="Notes" fieldKey="notes" multiline numberOfLines={3} style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]} />

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={16} color="#fff" />}
          <Text style={styles.btnText}>{saving ? "Saving…" : "Save Changes"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

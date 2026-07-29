import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, useColorScheme,
} from "react-native";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

type School = {
  id: number;
  name: string;
  address: string | null;
  motto: string | null;
  principalName: string | null;
  term1StartDate: string | null; term1EndDate: string | null;
  term2StartDate: string | null; term2EndDate: string | null;
  term3StartDate: string | null; term3EndDate: string | null;
  rubricEe2: number | null; rubricEe1: number | null;
  rubricMe2: number | null; rubricMe1: number | null;
  rubricAe2: number | null; rubricAe1: number | null;
  rubricBe2: number | null;
};

const RUBRIC_FIELDS: { key: keyof School; label: string; hint: string }[] = [
  { key: "rubricEe2", label: "EE2 minimum %", hint: "Top band — Exceeds Expectation (higher)" },
  { key: "rubricEe1", label: "EE1 minimum %", hint: "Exceeds Expectation" },
  { key: "rubricMe2", label: "ME2 minimum %", hint: "Meets Expectation (higher)" },
  { key: "rubricMe1", label: "ME1 minimum %", hint: "Meets Expectation" },
  { key: "rubricAe2", label: "AE2 minimum %", hint: "Approaches Expectation (higher)" },
  { key: "rubricAe1", label: "AE1 minimum %", hint: "Approaches Expectation" },
  { key: "rubricBe2", label: "BE2 minimum %", hint: "Below Expectation. Anything lower is BE1." },
];

export default function SchoolSettingsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<School>({
    queryKey: ["/school"],
    queryFn: () => apiFetch("/school"),
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const flat: Record<string, string> = {};
      Object.entries(data).forEach(([k, v]) => { flat[k] = v == null ? "" : String(v); });
      setForm(flat);
    }
  }, [data]);

  const set = (key: string) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        name: form.name || "My School",
        address: form.address || undefined,
        motto: form.motto || undefined,
        principalName: form.principalName || undefined,
        term1StartDate: form.term1StartDate || undefined,
        term1EndDate: form.term1EndDate || undefined,
        term2StartDate: form.term2StartDate || undefined,
        term2EndDate: form.term2EndDate || undefined,
        term3StartDate: form.term3StartDate || undefined,
        term3EndDate: form.term3EndDate || undefined,
      };
      RUBRIC_FIELDS.forEach(({ key }) => {
        const n = parseInt(form[key as string], 10);
        if (!isNaN(n)) body[key as string] = n;
      });
      return apiFetch("/school", { method: "PATCH", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/school"] });
      Alert.alert("Saved", "School settings updated.");
    },
    onError: (err: any) => Alert.alert("Error", err.message ?? "Could not save settings."),
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    section: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: colors.border, padding: 16,
    },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    sectionTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.foreground },
    desc: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, marginBottom: 12, lineHeight: 17 },
    field: { marginBottom: 12 },
    label: { fontFamily: "Poppins_500Medium", fontSize: 12, color: colors.mutedForeground, marginBottom: 5 },
    input: {
      fontFamily: "Poppins_400Regular", fontSize: 14, color: colors.foreground,
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.background,
    },
    termRow: { flexDirection: "row", gap: 10 },
    termCol: { flex: 1 },
    rubricRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    rubricInput: {
      fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.foreground,
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      paddingHorizontal: 10, paddingVertical: 9, width: 64, textAlign: "center",
      backgroundColor: colors.background,
    },
    rubricTexts: { flex: 1 },
    rubricLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.foreground },
    rubricHint: { fontFamily: "Poppins_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
    saveBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      marginHorizontal: 16, marginTop: 16, marginBottom: 40,
      paddingVertical: 14, borderRadius: colors.radius, backgroundColor: colors.primary,
    },
    saveBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#fff" },
  });

  if (isLoading || !data) {
    return <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="school-outline" size={18} color={colors.primary} />
          <Text style={s.sectionTitle}>School Profile</Text>
        </View>
        <View style={s.field}>
          <Text style={s.label}>School Name</Text>
          <TextInput style={s.input} value={form.name ?? ""} onChangeText={set("name")} placeholderTextColor={colors.mutedForeground} />
        </View>
        <View style={s.field}>
          <Text style={s.label}>Address</Text>
          <TextInput style={s.input} value={form.address ?? ""} onChangeText={set("address")} placeholderTextColor={colors.mutedForeground} />
        </View>
        <View style={s.field}>
          <Text style={s.label}>Motto</Text>
          <TextInput style={s.input} value={form.motto ?? ""} onChangeText={set("motto")} placeholderTextColor={colors.mutedForeground} />
        </View>
        <View style={[s.field, { marginBottom: 0 }]}>
          <Text style={s.label}>Principal's Name</Text>
          <TextInput style={s.input} value={form.principalName ?? ""} onChangeText={set("principalName")} placeholderTextColor={colors.mutedForeground} />
        </View>
      </View>

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={s.sectionTitle}>Term Dates</Text>
        </View>
        <Text style={s.desc}>Format: YYYY-MM-DD. Used on report cards and to drive the current-term default across the app.</Text>
        {[1, 2, 3].map(term => (
          <View key={term} style={s.termRow}>
            <View style={[s.field, s.termCol]}>
              <Text style={s.label}>Term {term} Start</Text>
              <TextInput
                style={s.input} placeholder="2026-01-05" placeholderTextColor={colors.mutedForeground}
                value={form[`term${term}StartDate`] ?? ""} onChangeText={set(`term${term}StartDate`)}
              />
            </View>
            <View style={[s.field, s.termCol]}>
              <Text style={s.label}>Term {term} End</Text>
              <TextInput
                style={s.input} placeholder="2026-04-03" placeholderTextColor={colors.mutedForeground}
                value={form[`term${term}EndDate`] ?? ""} onChangeText={set(`term${term}EndDate`)}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
          <Text style={s.sectionTitle}>CBC Rubric Grade Bands</Text>
        </View>
        <Text style={s.desc}>
          Set the minimum percentage each grade requires. Affects all reports, rankings, and analytics school-wide.
          Anything below BE2's threshold is automatically BE1.
        </Text>
        {RUBRIC_FIELDS.map(({ key, label, hint }) => (
          <View key={key as string} style={s.rubricRow}>
            <TextInput
              style={s.rubricInput} keyboardType="number-pad"
              value={form[key as string] ?? ""} onChangeText={set(key as string)}
            />
            <View style={s.rubricTexts}>
              <Text style={s.rubricLabel}>{label}</Text>
              <Text style={s.rubricHint}>{hint}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={() => save.mutate()} disabled={save.isPending}>
        {save.isPending
          ? <ActivityIndicator color="#fff" size="small" />
          : <><Ionicons name="save-outline" size={18} color="#fff" /><Text style={s.saveBtnText}>Save School Settings</Text></>}
      </TouchableOpacity>
    </ScrollView>
  );
}

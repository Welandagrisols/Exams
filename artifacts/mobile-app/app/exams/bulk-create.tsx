import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, useColorScheme, ScrollView, FlatList,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";
import { usePermissions } from "@/hooks/usePermissions";

type Class = { id: number; name: string; year: number; term: number };

export default function BulkCreateExamScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isStaff, assignedClassIds } = usePermissions();
  const { classId: presetClassId } = useLocalSearchParams<{ classId?: string }>();

  const { data: classes, isLoading } = useQuery<Class[]>({
    queryKey: ["/classes"],
    queryFn: () => apiFetch("/classes"),
  });

  // Teachers only see classes they're assigned to; staff see all — same rule as web.
  const editableClasses = (classes ?? []).filter(c => isStaff || assignedClassIds.includes(c.id));

  const [name, setName] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [term, setTerm] = useState("1");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (presetClassId) {
      const id = parseInt(presetClassId, 10);
      if (!isNaN(id)) setSelected(s => new Set(s).add(id));
    }
  }, [presetClassId]);

  const toggle = (id: number) => setSelected(s => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectAll = () => setSelected(new Set(editableClasses.map(c => c.id)));
  const selectNone = () => setSelected(new Set());

  const create = useMutation({
    mutationFn: () => apiFetch<any[]>("/exams/bulk", {
      method: "POST",
      body: JSON.stringify({
        name, year: parseInt(year, 10), term: parseInt(term, 10),
        status: "draft", classIds: Array.from(selected),
      }),
    }),
    onSuccess: (rows: any[]) => {
      queryClient.invalidateQueries({ queryKey: ["/exams"] });
      Alert.alert("Created", `"${name}" was created for ${rows.length} class${rows.length !== 1 ? "es" : ""}.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => Alert.alert("Error", err.message ?? "Could not create exams."),
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    section: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      margin: 16, marginBottom: 0, borderWidth: 1, borderColor: colors.border, padding: 16,
    },
    sectionTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.foreground, marginBottom: 12 },
    field: { marginBottom: 14 },
    label: { fontFamily: "Poppins_500Medium", fontSize: 12, color: colors.mutedForeground, marginBottom: 5 },
    input: {
      fontFamily: "Poppins_400Regular", fontSize: 15, color: colors.foreground,
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      paddingHorizontal: 12, paddingVertical: 11, backgroundColor: colors.background,
    },
    row: { flexDirection: "row", gap: 10 },
    termRow: { flexDirection: "row", gap: 8 },
    termChip: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border },
    termChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    termChipText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.mutedForeground },
    termChipTextActive: { color: "#fff" },
    selectRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    selectLink: { fontFamily: "Poppins_600SemiBold", fontSize: 12, color: colors.primary },
    classRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    checkbox: {
      width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border,
      justifyContent: "center", alignItems: "center",
    },
    checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    className: { fontFamily: "Poppins_500Medium", fontSize: 14, color: colors.foreground },
    btn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      marginHorizontal: 16, marginTop: 16, marginBottom: 40,
      paddingVertical: 14, borderRadius: colors.radius, backgroundColor: colors.primary,
    },
    btnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#fff" },
  });

  if (isLoading) {
    return <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const canSubmit = !!name && selected.size > 0 && !create.isPending;

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.section}>
        <Text style={s.sectionTitle}>Exam Details</Text>
        <View style={s.field}>
          <Text style={s.label}>Exam Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Mid-Term Exam" placeholderTextColor={colors.mutedForeground} />
        </View>
        <View style={s.row}>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>Year</Text>
            <TextInput style={s.input} value={year} onChangeText={setYear} keyboardType="number-pad" />
          </View>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>Term</Text>
            <View style={s.termRow}>
              {["1", "2", "3"].map(t => (
                <TouchableOpacity key={t} style={[s.termChip, term === t && s.termChipActive]} onPress={() => setTerm(t)}>
                  <Text style={[s.termChipText, term === t && s.termChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <View style={s.selectRow}>
          <Text style={s.sectionTitle}>Classes ({selected.size} selected)</Text>
        </View>
        <View style={[s.selectRow, { marginTop: -8 }]}>
          <TouchableOpacity onPress={selectAll}><Text style={s.selectLink}>Select all</Text></TouchableOpacity>
          <TouchableOpacity onPress={selectNone}><Text style={s.selectLink}>Clear</Text></TouchableOpacity>
        </View>
        <FlatList
          data={editableClasses}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.classRow} onPress={() => toggle(item.id)}>
              <View style={[s.checkbox, selected.has(item.id) && s.checkboxActive]}>
                {selected.has(item.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={s.className}>{item.name} · {item.year} T{item.term}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <TouchableOpacity style={[s.btn, !canSubmit && { opacity: 0.5 }]} disabled={!canSubmit} onPress={() => create.mutate()}>
        {create.isPending
          ? <ActivityIndicator color="#fff" size="small" />
          : <><Ionicons name="copy-outline" size={18} color="#fff" /><Text style={s.btnText}>Create for {selected.size || 0} Class{selected.size === 1 ? "" : "es"}</Text></>}
      </TouchableOpacity>
    </ScrollView>
  );
}

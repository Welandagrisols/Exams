import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, useColorScheme, ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

export default function NewClassScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [term, setTerm] = useState("1");

  const create = useMutation({
    mutationFn: () => apiFetch("/classes", {
      method: "POST",
      body: JSON.stringify({ name, year: parseInt(year, 10), term: parseInt(term, 10) }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/classes"] });
      router.back();
    },
    onError: (err: any) => Alert.alert("Error", err.message ?? "Could not create class."),
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    section: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      margin: 16, borderWidth: 1, borderColor: colors.border, padding: 16,
    },
    field: { marginBottom: 14 },
    label: { fontFamily: "Poppins_500Medium", fontSize: 12, color: colors.mutedForeground, marginBottom: 5 },
    input: {
      fontFamily: "Poppins_400Regular", fontSize: 15, color: colors.foreground,
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      paddingHorizontal: 12, paddingVertical: 11, backgroundColor: colors.background,
    },
    row: { flexDirection: "row", gap: 10 },
    termRow: { flexDirection: "row", gap: 8 },
    termChip: {
      flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
    },
    termChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    termChipText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.mutedForeground },
    termChipTextActive: { color: "#fff" },
    btn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      marginHorizontal: 16, paddingVertical: 14, borderRadius: colors.radius, backgroundColor: colors.primary,
    },
    btnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#fff" },
    hint: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, marginHorizontal: 16, marginTop: 10, lineHeight: 17 },
  });

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.section}>
        <View style={s.field}>
          <Text style={s.label}>Class Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Grade 7 Blue" placeholderTextColor={colors.mutedForeground} />
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

      <TouchableOpacity
        style={[s.btn, !name && { opacity: 0.5 }]}
        disabled={!name || create.isPending}
        onPress={() => create.mutate()}
      >
        {create.isPending
          ? <ActivityIndicator color="#fff" size="small" />
          : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={s.btnText}>Create Class</Text></>}
      </TouchableOpacity>
      <Text style={s.hint}>You can assign a class teacher and add students right after creating the class.</Text>
    </ScrollView>
  );
}

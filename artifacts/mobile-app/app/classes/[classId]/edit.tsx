import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, useColorScheme, ScrollView, Modal, FlatList,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

type Class = { id: number; name: string; year: number; term: number; teacherId: string | null };
type UserRow = { id: string; email: string | null; firstName: string | null; lastName: string | null; role: string };

export default function EditClassScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const { data: cls, isLoading } = useQuery<Class>({
    queryKey: ["/classes", classId],
    queryFn: () => apiFetch(`/classes/${classId}`),
    enabled: !!classId,
  });

  const { data: users } = useQuery<UserRow[]>({
    queryKey: ["/users"],
    queryFn: () => apiFetch("/users"),
  });

  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("1");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (cls) {
      setName(cls.name);
      setYear(String(cls.year));
      setTerm(String(cls.term));
    }
  }, [cls]);

  const currentTeacher = users?.find(u => u.id === cls?.teacherId) ?? null;

  const save = useMutation({
    mutationFn: () => apiFetch(`/classes/${classId}`, {
      method: "PATCH",
      body: JSON.stringify({ name, year: parseInt(year, 10), term: parseInt(term, 10) }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/classes"] });
      Alert.alert("Saved", "Class details updated.");
    },
    onError: (err: any) => Alert.alert("Error", err.message ?? "Could not save."),
  });

  const assignTeacher = useMutation({
    mutationFn: (userId: string | null) => apiFetch(`/classes/${classId}/teacher`, {
      method: "PATCH",
      body: JSON.stringify({ userId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/classes", classId] });
      queryClient.invalidateQueries({ queryKey: ["/classes"] });
      setPickerOpen(false);
    },
    onError: (err: any) => Alert.alert("Error", err.message ?? "Could not assign teacher."),
  });

  const removeClass = useMutation({
    mutationFn: () => apiFetch(`/classes/${classId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/classes"] });
      router.back();
    },
    onError: (err: any) => Alert.alert("Error", err.message ?? "Could not delete class."),
  });

  const confirmDelete = () => {
    Alert.alert(
      "Delete Class",
      `Delete "${cls?.name}"? This cannot be undone and may affect students, exams, and reports linked to this class.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => removeClass.mutate() },
      ],
    );
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    section: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      margin: 16, marginBottom: 0, borderWidth: 1, borderColor: colors.border, padding: 16,
    },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    sectionTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.foreground },
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
    btn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      marginHorizontal: 16, marginTop: 16, paddingVertical: 14, borderRadius: colors.radius, backgroundColor: colors.primary,
    },
    btnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#fff" },
    teacherRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, padding: 12,
    },
    teacherName: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.foreground },
    teacherEmpty: { fontFamily: "Poppins_400Regular", fontSize: 14, color: colors.mutedForeground },
    changeText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.primary },
    dangerBtn: { backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fca5a5", marginBottom: 40 },
    dangerText: { color: "#991b1b" },
    modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, maxHeight: "70%" },
    sheetTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: colors.foreground, paddingHorizontal: 20, marginBottom: 8 },
    userOpt: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: colors.border },
    userOptName: { fontFamily: "Poppins_500Medium", fontSize: 14, color: colors.foreground },
    userOptRole: { fontFamily: "Poppins_400Regular", fontSize: 11, color: colors.mutedForeground, textTransform: "capitalize" },
    cancelBtn: { alignItems: "center", paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border },
    cancelText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.mutedForeground },
  });

  if (isLoading || !cls) {
    return <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={s.sectionTitle}>Class Details</Text>
        </View>
        <View style={s.field}>
          <Text style={s.label}>Class Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholderTextColor={colors.mutedForeground} />
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
        <TouchableOpacity
          style={[s.btn, { marginTop: 0 }]}
          disabled={save.isPending}
          onPress={() => save.mutate()}
        >
          {save.isPending ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="save-outline" size={16} color="#fff" /><Text style={s.btnText}>Save Changes</Text></>}
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
          <Text style={s.sectionTitle}>Class Teacher</Text>
        </View>
        <TouchableOpacity style={s.teacherRow} onPress={() => setPickerOpen(true)}>
          {currentTeacher
            ? <Text style={s.teacherName}>{[currentTeacher.firstName, currentTeacher.lastName].filter(Boolean).join(" ") || currentTeacher.email}</Text>
            : <Text style={s.teacherEmpty}>No teacher assigned</Text>}
          <Text style={s.changeText}>Change</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[s.btn, s.dangerBtn]} onPress={confirmDelete}>
        <Ionicons name="trash-outline" size={18} color="#991b1b" />
        <Text style={[s.btnText, s.dangerText]}>Delete Class</Text>
      </TouchableOpacity>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={s.sheet}>
            <Text style={s.sheetTitle}>Assign Class Teacher</Text>
            <FlatList
              data={[{ id: "__none__", firstName: "No teacher", lastName: "", email: "", role: "" }, ...(users ?? [])]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.userOpt}
                  onPress={() => assignTeacher.mutate(item.id === "__none__" ? null : item.id)}
                >
                  <View>
                    <Text style={s.userOptName}>{[item.firstName, item.lastName].filter(Boolean).join(" ") || item.email}</Text>
                    {!!item.role && <Text style={s.userOptRole}>{item.role}</Text>}
                  </View>
                  {(item.id === "__none__" ? !cls.teacherId : item.id === cls.teacherId) && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={s.cancelBtn} onPress={() => setPickerOpen(false)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
  TextInput, ActivityIndicator, Alert, useColorScheme, Modal,
} from "react-native";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

type LearningArea = { id: number; name: string; abbreviation: string; maxMarks: number; sortOrder: number };

export default function LearningAreasScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery<LearningArea[]>({
    queryKey: ["/learning-areas"],
    queryFn: () => apiFetch("/learning-areas"),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");

  const resetForm = () => { setName(""); setAbbr(""); setMaxMarks("100"); };

  const create = useMutation({
    mutationFn: () => apiFetch("/learning-areas", {
      method: "POST",
      body: JSON.stringify({ name, abbreviation: abbr, maxMarks: parseInt(maxMarks, 10) || 100 }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/learning-areas"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => Alert.alert("Error", err.message ?? "Could not add learning area."),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiFetch(`/learning-areas/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/learning-areas"] }),
    onError: (err: any) => Alert.alert("Error", err.message ?? "Could not delete learning area."),
  });

  const confirmDelete = (item: LearningArea) => {
    Alert.alert("Remove Learning Area", `Remove "${item.name}"? Scores already recorded for it are unaffected.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => remove.mutate(item.id) },
    ]);
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    item: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, marginHorizontal: 16, marginVertical: 5,
      borderRadius: colors.radius, padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    abbrBadge: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "18",
      justifyContent: "center", alignItems: "center", marginRight: 12,
    },
    abbrText: { fontFamily: "Poppins_700Bold", fontSize: 12, color: colors.primary },
    name: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.foreground },
    sub: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
    fab: {
      position: "absolute", right: 20, bottom: 24,
      width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
      justifyContent: "center", alignItems: "center",
      shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, padding: 40 },
    emptyText: { fontFamily: "Poppins_500Medium", fontSize: 15, color: colors.mutedForeground, textAlign: "center" },
    modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    sheetTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: colors.foreground, marginBottom: 16 },
    field: { marginBottom: 12 },
    label: { fontFamily: "Poppins_500Medium", fontSize: 12, color: colors.mutedForeground, marginBottom: 5 },
    input: {
      fontFamily: "Poppins_400Regular", fontSize: 14, color: colors.foreground,
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.background,
    },
    row: { flexDirection: "row", gap: 10 },
    btnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
    btn: {
      flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: colors.radius,
      backgroundColor: colors.primary,
    },
    btnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#fff" },
    cancelBtn: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border },
    cancelText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.foreground },
  });

  if (isLoading) {
    return <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={s.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={!data?.length ? { flex: 1 } : { paddingTop: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="book-outline" size={48} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No learning areas yet.{"\n"}Tap + to add your first subject.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.item}>
            <View style={s.abbrBadge}><Text style={s.abbrText}>{item.abbreviation}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.sub}>Max marks: {item.maxMarks}</Text>
            </View>
            <TouchableOpacity onPress={() => confirmDelete(item)} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => setModalOpen(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={s.modalBg}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Add Learning Area</Text>
            <View style={s.field}>
              <Text style={s.label}>Name</Text>
              <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Mathematics" placeholderTextColor={colors.mutedForeground} />
            </View>
            <View style={s.row}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Abbreviation</Text>
                <TextInput style={s.input} value={abbr} onChangeText={setAbbr} placeholder="MATH" placeholderTextColor={colors.mutedForeground} maxLength={10} autoCapitalize="characters" />
              </View>
              <View style={[s.field, { width: 100 }]}>
                <Text style={s.label}>Max Marks</Text>
                <TextInput style={s.input} value={maxMarks} onChangeText={setMaxMarks} keyboardType="number-pad" />
              </View>
            </View>
            <View style={s.btnRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setModalOpen(false); resetForm(); }}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, (!name || !abbr) && { opacity: 0.5 }]}
                disabled={!name || !abbr || create.isPending}
                onPress={() => create.mutate()}
              >
                {create.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

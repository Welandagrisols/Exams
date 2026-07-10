import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, useColorScheme, Alert, ScrollView,
} from "react-native";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";
import * as Haptics from "expo-haptics";

type Class = { id: number; name: string };

type Candidate = {
  id: number;
  name: string;
  admissionNo: string;
  classId: number;
  className: string | null;
  feeBalance: string;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
};

const DEFAULT_BODY = "Dear Parent/Guardian,\n\nThis is a reminder that [Student Name] has an outstanding fee balance of [Fee Balance]. Kindly clear the balance at your earliest convenience.\n\nRegards,\nSchool Administration";

function formatKsh(value: string): string {
  return `Ksh ${parseFloat(value).toLocaleString("en-KE")}`;
}

export default function FeeRemindersScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();

  const [threshold, setThreshold] = useState("");
  const [classId, setClassId] = useState<number | null>(null);
  const [title, setTitle] = useState("Fee Balance Reminder");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["/classes"],
    queryFn: () => apiFetch("/classes"),
  });

  const minBalance = parseFloat(threshold);
  const { data: candidates, isLoading, refetch, isFetching } = useQuery<Candidate[]>({
    queryKey: ["/students/fee-reminders", minBalance, classId],
    queryFn: () => apiFetch(`/students/fee-reminders?minBalance=${minBalance}${classId ? `&classId=${classId}` : ""}`),
    enabled: false,
  });

  const handleSearch = async () => {
    if (isNaN(minBalance) || minBalance <= 0) {
      Alert.alert("Enter a threshold", "Please enter a valid minimum balance amount.");
      return;
    }
    const result = await refetch();
    if (result.data) {
      setSelected(new Set(result.data.filter(c => c.parentPhone).map(c => c.id)));
    }
    setSearched(true);
  };

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Required", "Please enter a subject and message.");
      return;
    }
    const feeData = (candidates ?? [])
      .filter(c => selected.has(c.id))
      .map(c => ({ studentId: c.id, balance: c.feeBalance }));
    if (feeData.length === 0) {
      Alert.alert("No recipients", "Select at least one student to remind.");
      return;
    }
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const msg = await apiFetch<{ id: number }>("/messages", {
        method: "POST",
        body: JSON.stringify({ type: "fee_arrears", title, body, feeData }),
      });
      router.replace(`/messages/${msg.id}`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSending(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 48, gap: 4 },
    label: { fontFamily: "Poppins_500Medium", fontSize: 13, color: colors.foreground, marginBottom: 6, marginTop: 14 },
    input: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      padding: 12, fontFamily: "Poppins_400Regular", fontSize: 14, color: colors.foreground,
    },
    textArea: { minHeight: 120, textAlignVertical: "top" },
    classRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    classChip: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
    classChipText: { fontFamily: "Poppins_500Medium", fontSize: 13 },
    searchBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.foreground, borderRadius: colors.radius, padding: 14, marginTop: 16,
    },
    searchBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.background },
    hint: { fontFamily: "Poppins_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 4 },
    resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 8 },
    sectionLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.foreground },
    selectAllText: { fontFamily: "Poppins_500Medium", fontSize: 12, color: colors.primary },
    item: {
      flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card,
      borderRadius: colors.radius, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 6,
    },
    checkbox: {
      width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center",
    },
    name: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.foreground },
    meta: { fontFamily: "Poppins_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
    balance: { fontFamily: "Poppins_700Bold", fontSize: 13, color: "#ef4444" },
    emptyBox: { alignItems: "center", padding: 24, gap: 8 },
    emptyText: { fontFamily: "Poppins_500Medium", fontSize: 13, color: colors.mutedForeground, textAlign: "center" },
    sendBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.primary, borderRadius: colors.radius, padding: 15, marginTop: 20,
    },
    sendBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#fff" },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Minimum Balance (Ksh) *</Text>
      <TextInput
        style={styles.input}
        value={threshold}
        onChangeText={setThreshold}
        placeholder="e.g. 5000"
        keyboardType="numeric"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={styles.label}>Class (optional)</Text>
      <View style={styles.classRow}>
        <TouchableOpacity
          style={[styles.classChip, { backgroundColor: classId === null ? colors.primary : colors.card, borderColor: classId === null ? colors.primary : colors.border }]}
          onPress={() => setClassId(null)}
        >
          <Text style={[styles.classChipText, { color: classId === null ? "#fff" : colors.foreground }]}>All Classes</Text>
        </TouchableOpacity>
        {classes?.map((cls) => (
          <TouchableOpacity
            key={cls.id}
            style={[styles.classChip, { backgroundColor: classId === cls.id ? colors.primary : colors.card, borderColor: classId === cls.id ? colors.primary : colors.border }]}
            onPress={() => setClassId(cls.id)}
          >
            <Text style={[styles.classChipText, { color: classId === cls.id ? "#fff" : colors.foreground }]}>{cls.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={isFetching}>
        {isFetching ? <ActivityIndicator color={colors.background} /> : <Ionicons name="search-outline" size={18} color={colors.background} />}
        <Text style={styles.searchBtnText}>{isFetching ? "Searching…" : "Find Matching Students"}</Text>
      </TouchableOpacity>

      {searched && !isLoading && (
        <>
          <View style={styles.resultHeader}>
            <Text style={styles.sectionLabel}>{candidates?.length ?? 0} student{(candidates?.length ?? 0) === 1 ? "" : "s"} found</Text>
            {(candidates?.length ?? 0) > 0 && (
              <TouchableOpacity onPress={() => setSelected(new Set((candidates ?? []).filter(c => c.parentPhone).map(c => c.id)))}>
                <Text style={styles.selectAllText}>Select All</Text>
              </TouchableOpacity>
            )}
          </View>

          {(candidates?.length ?? 0) === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-done-outline" size={36} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No students meet this threshold.</Text>
            </View>
          ) : (
            <>
              {candidates!.map((c) => (
                <TouchableOpacity key={c.id} style={styles.item} onPress={() => c.parentPhone && toggle(c.id)} activeOpacity={0.75}>
                  <View style={[styles.checkbox, { borderColor: selected.has(c.id) ? colors.primary : colors.border, backgroundColor: selected.has(c.id) ? colors.primary : "transparent" }]}>
                    {selected.has(c.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{c.name}</Text>
                    <Text style={styles.meta}>{c.className ?? "—"} · {c.parentPhone ?? "No phone number"}</Text>
                  </View>
                  <Text style={styles.balance}>{formatKsh(c.feeBalance)}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.label}>Subject *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.mutedForeground} />

              <Text style={styles.label}>Message *</Text>
              <TextInput style={[styles.input, styles.textArea]} value={body} onChangeText={setBody} multiline placeholderTextColor={colors.mutedForeground} />
              <Text style={styles.hint}>Use [Student Name] and [Fee Balance] to personalise per student.</Text>

              <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending || selected.size === 0}>
                {sending ? <ActivityIndicator color="#fff" /> : <><Ionicons name="send-outline" size={18} color="#fff" /><Text style={styles.sendBtnText}>Prepare Reminders ({selected.size})</Text></>}
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

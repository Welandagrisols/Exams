import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, useColorScheme, Alert, FlatList,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";
// xlsx is a pure-JS library that works in React Native
import * as XLSX from "xlsx";

type ParsedRow = {
  name: string;
  admissionNo: string;
  gender: string;
  parentPhone: string;
  parentName: string;
  _key: string; // local dedup key
};

// Case-insensitive column name matcher
function col(row: any, ...keys: string[]): string {
  const rowLower = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.toLowerCase().replace(/[\s_\-\.]/g, ""), v])
  );
  for (const key of keys) {
    const val = rowLower[key.toLowerCase().replace(/[\s_\-\.]/g, "")];
    if (val !== undefined && val !== null && String(val).trim()) return String(val).trim();
  }
  return "";
}

export default function StudentsExcelScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ saved: number; skipped: number } | null>(null);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setFileName(asset.name);

      // Fetch file as array buffer
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!json.length) {
        Alert.alert("Empty file", "No rows found in the first sheet.");
        return;
      }

      const parsed: ParsedRow[] = json
        .map((row, i) => ({
          name: col(row, "name", "fullname", "studentname", "student name", "full name"),
          admissionNo: col(row, "admissionno", "admission", "admno", "adm", "reg", "regno", "registration"),
          gender: col(row, "gender", "sex").toUpperCase().charAt(0),
          parentPhone: col(row, "parentphone", "phone", "mobile", "contact", "parentcontact"),
          parentName: col(row, "parentname", "guardian", "parent"),
          _key: `row-${i}`,
        }))
        .filter((r) => r.name || r.admissionNo); // drop blank rows

      if (!parsed.length) {
        Alert.alert(
          "No recognisable columns",
          "Expected columns: Name, AdmissionNo, Gender, ParentPhone, ParentName.\nCheck your header row spelling."
        );
        return;
      }
      setRows(parsed);
      setDone(null);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not read the file.");
    }
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setSaving(true);
    let saved = 0;
    let skipped = 0;
    const cid = parseInt(Array.isArray(classId) ? classId[0] : classId);
    for (const row of rows) {
      if (!row.name.trim() && !row.admissionNo.trim()) { skipped++; continue; }
      try {
        await apiFetch("/students", {
          method: "POST",
          body: JSON.stringify({
            name: row.name.trim() || "(unknown)",
            admissionNo: row.admissionNo.trim() || `IMPORT-${Date.now()}`,
            classId: cid,
            gender: row.gender || undefined,
            parentPhone: row.parentPhone || undefined,
            parentName: row.parentName || undefined,
          }),
        });
        saved++;
      } catch {
        skipped++;
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/students", classId] });
    setSaving(false);
    setDone({ saved, skipped });
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    card: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12,
    },
    title: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: colors.foreground },
    sub: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground },
    btn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, paddingVertical: 12, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
    },
    primaryBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
    btnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.foreground },
    primaryBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#fff" },
    countBar: {
      paddingHorizontal: 14, paddingVertical: 10,
      backgroundColor: colors.muted, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
    },
    countText: { fontFamily: "Poppins_500Medium", fontSize: 13, color: colors.mutedForeground },
    tableHeader: {
      flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8,
      backgroundColor: colors.muted, borderTopLeftRadius: colors.radius,
      borderTopRightRadius: colors.radius, borderWidth: 1, borderColor: colors.border,
    },
    th: { fontFamily: "Poppins_600SemiBold", fontSize: 11, color: colors.mutedForeground },
    tableRow: {
      flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10,
      backgroundColor: colors.card, borderWidth: 1, borderTopWidth: 0, borderColor: colors.border,
    },
    td: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.foreground },
    successBox: { alignItems: "center", gap: 10, padding: 24 },
    successTitle: { fontFamily: "Poppins_700Bold", fontSize: 18, color: colors.foreground },
    successSub: { fontFamily: "Poppins_400Regular", fontSize: 13, color: colors.mutedForeground, textAlign: "center" },
  });

  if (done) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          <Text style={styles.successTitle}>Import complete</Text>
          <Text style={styles.successSub}>{done.saved} student{done.saved !== 1 ? "s" : ""} saved.{done.skipped > 0 ? `\n${done.skipped} row${done.skipped !== 1 ? "s" : ""} skipped (duplicate or missing data).` : ""}</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <TouchableOpacity style={styles.btn} onPress={() => { setRows([]); setFileName(null); setDone(null); }}>
              <Text style={styles.btnText}>Import Another</Text>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Import from Excel / CSV</Text>
        <Text style={styles.sub}>
          Pick an .xlsx, .xls, or .csv file. The first row must be a header row with columns like:{"\n"}
          Name · AdmissionNo · Gender · ParentPhone · ParentName
        </Text>
        <TouchableOpacity style={styles.btn} onPress={pickFile}>
          <Ionicons name="document-attach" size={16} color={colors.foreground} />
          <Text style={styles.btnText}>{fileName ? `Change file (${fileName})` : "Choose File"}</Text>
        </TouchableOpacity>
      </View>

      {rows.length > 0 && (
        <>
          <View style={styles.countBar}>
            <Text style={styles.countText}>{rows.length} student{rows.length !== 1 ? "s" : ""} parsed from "{fileName}" — review before importing</Text>
          </View>

          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Name</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Adm No.</Text>
            <Text style={[styles.th, { width: 28 }]}>G</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Parent Phone</Text>
          </View>
          {rows.map((row, i) => (
            <View
              key={row._key}
              style={[
                styles.tableRow,
                i === rows.length - 1 && { borderBottomLeftRadius: colors.radius, borderBottomRightRadius: colors.radius },
              ]}
            >
              <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{row.name || "—"}</Text>
              <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>{row.admissionNo || "—"}</Text>
              <Text style={[styles.td, { width: 28 }]}>{row.gender || "—"}</Text>
              <Text style={[styles.td, { flex: 1.5 }]} numberOfLines={1}>{row.parentPhone || "—"}</Text>
            </View>
          ))}

          <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={handleImport} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="cloud-upload" size={16} color="#fff" />}
            <Text style={styles.primaryBtnText}>{saving ? "Importing…" : `Import ${rows.length} Students`}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

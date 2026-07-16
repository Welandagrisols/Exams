import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, useColorScheme,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

type Student = {
  id: number;
  name: string;
  admissionNo: string;
  className: string | null;
  feeBalance: string | null;
};

function parseFeeBalance(value: string | null | undefined): number {
  // Strip commas/currency symbols in case of formatted input, then parse
  const cleaned = String(value ?? "0").replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatKsh(value: string | null | undefined): string {
  return `Ksh ${parseFeeBalance(value).toLocaleString("en-KE")}`;
}

export default function FeesScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery<Student[]>({
    queryKey: ["/students"],
    queryFn: () => apiFetch("/students"),
  });

  const withBalance = (data ?? [])
    .filter(s => parseFeeBalance(s.feeBalance) > 0)
    .sort((a, b) => parseFeeBalance(b.feeBalance) - parseFeeBalance(a.feeBalance));

  const totalOutstanding = withBalance.reduce((sum, s) => sum + parseFeeBalance(s.feeBalance), 0);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    summaryCard: {
      backgroundColor: colors.card, marginHorizontal: 16, marginTop: 16, marginBottom: 8,
      borderRadius: colors.radius, padding: 16, borderWidth: 1, borderColor: colors.border,
    },
    summaryLabel: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground },
    summaryValue: { fontFamily: "Poppins_700Bold", fontSize: 24, color: colors.foreground, marginTop: 2 },
    summarySub: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
    actionRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 12 },
    actionBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, backgroundColor: colors.primary, borderRadius: colors.radius, paddingVertical: 13,
    },
    actionBtnAlt: { backgroundColor: "#f59e0b" },
    actionText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#fff" },
    sectionLabel: {
      fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.foreground,
      marginHorizontal: 16, marginTop: 8, marginBottom: 6,
    },
    item: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      backgroundColor: colors.card, marginHorizontal: 16, marginVertical: 5,
      borderRadius: colors.radius, padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    name: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.foreground },
    meta: { fontFamily: "Poppins_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
    balance: { fontFamily: "Poppins_700Bold", fontSize: 14, color: "#ef4444" },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, padding: 40 },
    emptyText: { fontFamily: "Poppins_500Medium", fontSize: 15, color: colors.mutedForeground, textAlign: "center" },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={!withBalance.length ? { flex: 1 } : { paddingBottom: 40 }}
      data={withBalance}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListHeaderComponent={
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Outstanding</Text>
            <Text style={styles.summaryValue}>{formatKsh(String(totalOutstanding))}</Text>
            <Text style={styles.summarySub}>{withBalance.length} student{withBalance.length === 1 ? "" : "s"} with a balance</Text>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/fees/scan")}>
              <Ionicons name="camera-outline" size={16} color="#fff" />
              <Text style={styles.actionText}>Scan Fee Sheet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAlt]} onPress={() => router.push("/fees/reminders")}>
              <Ionicons name="notifications-outline" size={16} color="#fff" />
              <Text style={styles.actionText}>Send Reminders</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionLabel}>Students with balances</Text>
        </>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="wallet-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>No outstanding fee balances yet.{"\n"}Scan a fee sheet to get started.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.className ?? "—"} · {item.admissionNo}</Text>
          </View>
          <Text style={styles.balance}>{formatKsh(item.feeBalance)}</Text>
        </View>
      )}
    />
  );
}

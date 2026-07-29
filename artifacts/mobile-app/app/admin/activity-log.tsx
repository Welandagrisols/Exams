import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, useColorScheme,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

type AuditLog = {
  id: number;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

const ACTION_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  "class.create": "add-circle-outline",
  "class.update": "create-outline",
  "class.delete": "trash-outline",
  "class.assign_teacher": "person-outline",
  "user.role_change": "shield-checkmark-outline",
  "student.create": "person-add-outline",
  "student.update": "create-outline",
  "student.delete": "trash-outline",
  "score.bulk_save": "checkmark-done-outline",
  "report.sign": "create-outline",
};

const ACTION_LABEL: Record<string, string> = {
  "class.create": "created class",
  "class.update": "edited class",
  "class.delete": "deleted class",
  "class.assign_teacher": "assigned teacher",
  "user.role_change": "changed a role",
  "student.create": "added student",
  "student.update": "edited student",
  "student.delete": "removed student",
  "score.bulk_save": "saved scores",
  "report.sign": "signed a report",
};

function summarize(log: AuditLog): string {
  const d = log.details ?? {};
  switch (log.action) {
    case "class.create": return `"${d.name ?? ""}"`;
    case "class.delete": return `"${d.name ?? ""}"`;
    case "class.assign_teacher": return d.teacherName ? `to ${d.teacherName}` : "unassigned";
    case "user.role_change": return `${d.previousRole ?? "?"} → ${d.newRole ?? "?"}`;
    case "student.create": return `"${d.name ?? ""}" (${d.admissionNo ?? ""})`;
    case "student.delete": return `"${d.name ?? ""}"`;
    case "score.bulk_save": return `${d.saved ?? 0} score${d.saved === 1 ? "" : "s"} across ${d.studentCount ?? 0} student${d.studentCount === 1 ? "" : "s"}`;
    case "report.sign": return `as ${d.title ?? ""}`;
    default: return "";
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ActivityLogScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;

  const { data, isLoading, refetch, isRefetching } = useQuery<AuditLog[]>({
    queryKey: ["/audit-logs"],
    queryFn: () => apiFetch("/audit-logs"),
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    item: {
      flexDirection: "row", alignItems: "flex-start", gap: 12,
      backgroundColor: colors.card, marginHorizontal: 16, marginVertical: 5,
      borderRadius: colors.radius, padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    icon: {
      width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary + "18",
      justifyContent: "center", alignItems: "center", marginTop: 1,
    },
    line1: { fontFamily: "Poppins_500Medium", fontSize: 13, color: colors.foreground, lineHeight: 18 },
    userName: { fontFamily: "Poppins_600SemiBold" },
    summary: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    time: { fontFamily: "Poppins_400Regular", fontSize: 10.5, color: colors.mutedForeground, marginTop: 4 },
    empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, padding: 40 },
    emptyText: { fontFamily: "Poppins_500Medium", fontSize: 15, color: colors.mutedForeground, textAlign: "center" },
  });

  if (isLoading) {
    return <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <FlatList
      style={s.container}
      contentContainerStyle={!data?.length ? { flex: 1 } : { paddingTop: 12, paddingBottom: 32 }}
      data={data ?? []}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={s.empty}>
          <Ionicons name="time-outline" size={48} color={colors.mutedForeground} />
          <Text style={s.emptyText}>No activity recorded yet.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={s.item}>
          <View style={s.icon}>
            <Ionicons name={ACTION_ICON[item.action] ?? "ellipse-outline"} size={17} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.line1}>
              <Text style={s.userName}>{item.userName ?? "Someone"}</Text> {ACTION_LABEL[item.action] ?? item.action}
            </Text>
            <Text style={s.summary} numberOfLines={2}>{summarize(item)}</Text>
            <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>
      )}
    />
  );
}

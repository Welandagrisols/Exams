import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, useColorScheme, Alert, Modal, Pressable,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getRubricColor } from "@/lib/api";
import palette from "@/constants/colors";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";

type RankRow = {
  rank: number;
  totalMarks: number;
  totalMaxMarks: number;
  averagePercentage: number;
  overallGrade: string;
  student: { id: number; name: string; admissionNo: string };
};

type BroadcastResult = {
  messageId: number;
  sent: number;
  noPhone: number;
  failed: number;
  total: number;
  smsConfigured: boolean;
  errors?: string[];
};

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function RankingsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const [resultModal, setResultModal] = useState<BroadcastResult | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<RankRow[]>({
    queryKey: ["/rankings", examId],
    queryFn: () => apiFetch(`/rankings/${examId}`),
    enabled: !!examId,
  });

  // Fetch exam to get classId for permission check (usually already cached from exams screen)
  const { data: examData } = useQuery<{ id: number; classId: number | null }>({
    queryKey: ["/exams", examId],
    queryFn: () => apiFetch(`/exams/${examId}`),
    enabled: !!examId,
  });
  const { canWrite } = usePermissions(examData?.classId);

  const broadcast = useMutation<BroadcastResult, Error>({
    mutationFn: () => apiFetch(`/messages/broadcast-results/${examId}`, { method: "POST" }),
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResultModal(result);
    },
    onError: (err) => {
      Alert.alert("Error", err.message ?? "Could not send results.");
    },
  });

  const handleSend = () => {
    if (!data?.length) return;
    const count = data.length;
    Alert.alert(
      "Send Results to Parents",
      `This will send an SMS with exam results to parents of all ${count} student${count !== 1 ? "s" : ""} in this class.\n\nParents without a saved phone number will be skipped.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Now",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            broadcast.mutate();
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    sendBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    sendBarLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.mutedForeground,
      flex: 1,
    },
    sendBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    sendBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: "#fff",
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginVertical: 4,
      borderRadius: colors.radius,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rankBox: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.muted,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    rankText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 14,
      color: colors.foreground,
    },
    name: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.foreground,
    },
    adm: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    right: { marginLeft: "auto", alignItems: "flex-end", gap: 4 },
    pct: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: colors.foreground,
    },
    gradeBadge: {
      borderRadius: 5,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    gradeText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 11,
      color: "#fff",
    },
    empty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      padding: 40,
    },
    emptyText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 15,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    // Modal
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      padding: 28,
      width: "100%",
      maxWidth: 360,
      gap: 16,
    },
    modalTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 18,
      color: colors.foreground,
      textAlign: "center",
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    statBox: {
      alignItems: "center",
      gap: 4,
    },
    statValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 28,
    },
    statLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
    },
    notConfiguredNote: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 18,
    },
    dismissBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      padding: 14,
      alignItems: "center",
    },
    dismissBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: "#fff",
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={!data?.length ? { flex: 1 } : { paddingTop: 8, paddingBottom: 32 }}
        data={data ?? []}
        keyExtractor={(item) => String(item.student.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          data && data.length > 0 ? (
            <View style={styles.sendBar}>
              <Text style={styles.sendBarLabel}>
                {data.length} student{data.length !== 1 ? "s" : ""}
              </Text>
              {canWrite && <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSend}
                disabled={broadcast.isPending}
                activeOpacity={0.8}
              >
                {broadcast.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send-outline" size={15} color="#fff" />
                )}
                <Text style={styles.sendBtnText}>
                  {broadcast.isPending ? "Sending…" : "Send Results to Parents"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No rankings yet.{"\n"}Enter scores first.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.item,
              item.rank === 1 && { borderColor: "#f59e0b", borderWidth: 1.5 },
            ]}
            onPress={() => router.push(`/reports/${examId}/${item.student.id}`)}
            activeOpacity={0.75}
          >
            <View style={[
              styles.rankBox,
              item.rank <= 3 && { backgroundColor: item.rank === 1 ? "#fef3c7" : item.rank === 2 ? "#f3f4f6" : "#fff7ed" }
            ]}>
              <Text style={styles.rankText}>{MEDAL[item.rank] ?? item.rank}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.student.name}</Text>
              <Text style={styles.adm}>{item.student.admissionNo}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.pct}>{item.averagePercentage.toFixed(0)}%</Text>
              <View style={[styles.gradeBadge, { backgroundColor: getRubricColor(item.overallGrade) }]}>
                <Text style={styles.gradeText}>{item.overallGrade}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Result summary modal */}
      <Modal
        visible={!!resultModal}
        transparent
        animationType="fade"
        onRequestClose={() => setResultModal(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setResultModal(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Results Sent</Text>

            {resultModal && !resultModal.smsConfigured ? (
              <Text style={styles.notConfiguredNote}>
                SMS is not yet configured.{"\n"}Add your Africa's Talking credentials to start sending.{"\n\n"}
                The message record has been saved (ID #{resultModal.messageId}).
              </Text>
            ) : resultModal ? (
              <>
                <View style={styles.statRow}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: "#10b981" }]}>{resultModal.sent}</Text>
                    <Text style={styles.statLabel}>Sent</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: "#f59e0b" }]}>{resultModal.noPhone}</Text>
                    <Text style={styles.statLabel}>No phone</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: resultModal.failed > 0 ? "#ef4444" : colors.mutedForeground }]}>{resultModal.failed}</Text>
                    <Text style={styles.statLabel}>Failed</Text>
                  </View>
                </View>

                {resultModal.noPhone > 0 && (
                  <Text style={styles.notConfiguredNote}>
                    {resultModal.noPhone} parent{resultModal.noPhone !== 1 ? "s" : ""} skipped — no phone number saved for their child.
                  </Text>
                )}

                {resultModal.errors && resultModal.errors.length > 0 && (
                  <Text style={[styles.notConfiguredNote, { color: "#ef4444" }]}>
                    {resultModal.errors.slice(0, 3).join("\n")}
                    {resultModal.errors.length > 3 ? `\n…and ${resultModal.errors.length - 3} more` : ""}
                  </Text>
                )}
              </>
            ) : null}

            <TouchableOpacity style={styles.dismissBtn} onPress={() => setResultModal(null)}>
              <Text style={styles.dismissBtnText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

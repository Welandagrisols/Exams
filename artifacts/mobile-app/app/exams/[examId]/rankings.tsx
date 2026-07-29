import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, useColorScheme, Alert, Modal, Pressable,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [resultModal, setResultModal] = useState<BroadcastResult | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<RankRow[]>({
    queryKey: ["/rankings", examId],
    queryFn: () => apiFetch(`/rankings/${examId}`),
    enabled: !!examId,
  });

  // Fetch exam to get classId for permission check (usually already cached from exams screen)
  const { data: examData } = useQuery<{ id: number; classId: number | null; scoresApprovedAt: string | null; approvedByName: string | null }>({
    queryKey: ["/exams", examId],
    queryFn: () => apiFetch(`/exams/${examId}`),
    enabled: !!examId,
  });
  const { isAdmin, isStaff, canWrite } = usePermissions(examData?.classId);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const approveScores = useMutation<{ ok: boolean; scoresApprovedAt: string; approvedByName: string | null }, Error>({
    mutationFn: () => apiFetch(`/exams/${examId}/approve-scores`, { method: "POST" }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/exams", examId] });
    },
    onError: (err) => Alert.alert("Error", err.message ?? "Could not approve scores."),
  });

  const unapproveScores = useMutation<{ ok: boolean }, Error>({
    mutationFn: () => apiFetch(`/exams/${examId}/unapprove-scores`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/exams", examId] });
    },
    onError: (err) => Alert.alert("Error", err.message ?? "Could not unapprove scores."),
  });

  const confirmUnapprove = () => {
    Alert.alert(
      "Unapprove Scores",
      "This reopens scores for editing. You'll need to approve again before results can be sent to parents.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Unapprove", style: "destructive", onPress: () => unapproveScores.mutate() },
      ],
    );
  };

  const signAll = useMutation<{ ok: boolean; signedCount: number }, Error, string>({
    mutationFn: (title: string) => apiFetch(`/reports/${examId}/sign-all`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSignModalOpen(false);
      setShowCustomInput(false);
      setCustomTitle("");
      Alert.alert("Signed", `Applied your signature to ${result.signedCount} report${result.signedCount !== 1 ? "s" : ""}.`);
    },
    onError: (err) => {
      Alert.alert("Error", err.message ?? "Could not sign reports.");
    },
  });

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
    actionBtnRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    signBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    signBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.primary,
    },
    modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    sheetTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: colors.foreground, marginBottom: 4 },
    sheetSub: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, marginBottom: 16 },
    signChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
    signChipText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.foreground },
    sheetInput: {
      fontFamily: "Poppins_400Regular", fontSize: 14, color: colors.foreground,
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
    },
    cancelBtn: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
    cancelText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.mutedForeground },
    approvalBanner: {
      flexDirection: "row", alignItems: "center", gap: 10,
      marginHorizontal: 16, marginTop: 12, padding: 12,
      borderRadius: colors.radius, borderWidth: 1,
    },
    approvalIcon: {
      width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center",
    },
    approvalText: { fontFamily: "Poppins_600SemiBold", fontSize: 12.5 },
    approvalSub: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 1 },
    approvalActionBtn: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
    },
    approvalActionText: { fontFamily: "Poppins_600SemiBold", fontSize: 11.5 },
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
            <>
              <View style={[
                styles.approvalBanner,
                examData?.scoresApprovedAt
                  ? { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }
                  : { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
              ]}>
                <View style={[
                  styles.approvalIcon,
                  { backgroundColor: examData?.scoresApprovedAt ? "#dcfce7" : "#fef3c7" },
                ]}>
                  <Ionicons
                    name={examData?.scoresApprovedAt ? "checkmark-circle" : "time-outline"}
                    size={18}
                    color={examData?.scoresApprovedAt ? "#166534" : "#92400e"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.approvalText, { color: examData?.scoresApprovedAt ? "#166534" : "#92400e" }]}>
                    {examData?.scoresApprovedAt ? "Scores Approved" : "Scores Not Yet Approved"}
                  </Text>
                  <Text style={[styles.approvalSub, { color: examData?.scoresApprovedAt ? "#166534" : "#92400e" }]}>
                    {examData?.scoresApprovedAt
                      ? `${examData.approvedByName ? `by ${examData.approvedByName} · ` : ""}locked from further edits`
                      : "Scores can still be edited. Approve before sending results."}
                  </Text>
                </View>
                {isStaff && (
                  examData?.scoresApprovedAt ? (
                    <TouchableOpacity
                      style={[styles.approvalActionBtn, { borderColor: "#166534" }]}
                      onPress={confirmUnapprove}
                      disabled={unapproveScores.isPending}
                    >
                      {unapproveScores.isPending
                        ? <ActivityIndicator size="small" color="#166534" />
                        : <Text style={[styles.approvalActionText, { color: "#166534" }]}>Unapprove</Text>}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.approvalActionBtn, { borderColor: "#92400e" }]}
                      onPress={() => approveScores.mutate()}
                      disabled={approveScores.isPending}
                    >
                      {approveScores.isPending
                        ? <ActivityIndicator size="small" color="#92400e" />
                        : <Text style={[styles.approvalActionText, { color: "#92400e" }]}>Approve</Text>}
                    </TouchableOpacity>
                  )
                )}
              </View>

              <View style={styles.sendBar}>
                <Text style={styles.sendBarLabel}>
                  {data.length} student{data.length !== 1 ? "s" : ""}
                </Text>
                <View style={styles.actionBtnRow}>
                  {canWrite && (
                    <TouchableOpacity
                      style={styles.signBtn}
                      onPress={() => setSignModalOpen(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={15} color={colors.primary} />
                      <Text style={styles.signBtnText}>Sign All Reports</Text>
                    </TouchableOpacity>
                  )}
                  {isAdmin && <TouchableOpacity
                    style={[styles.sendBtn, !examData?.scoresApprovedAt && { opacity: 0.5 }]}
                    onPress={handleSend}
                    disabled={broadcast.isPending || !examData?.scoresApprovedAt}
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
                  </TouchableOpacity>}
                </View>
              </View>
            </>
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

      <Modal visible={signModalOpen} transparent animationType="slide" onRequestClose={() => setSignModalOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setSignModalOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Sign All Reports</Text>
            <Text style={styles.sheetSub}>
              Applies your saved signature to every student's report for this exam, under the title you choose.
            </Text>
            {!showCustomInput ? (
              <>
                {["Class Teacher", "Principal", "Deputy Principal"].map(title => (
                  <TouchableOpacity
                    key={title}
                    style={styles.signChip}
                    disabled={signAll.isPending}
                    onPress={() => signAll.mutate(title)}
                  >
                    <Text style={styles.signChipText}>{title}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.signChip} disabled={signAll.isPending} onPress={() => setShowCustomInput(true)}>
                  <Text style={styles.signChipText}>Custom…</Text>
                </TouchableOpacity>
                {signAll.isPending && <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />}
              </>
            ) : (
              <>
                <TextInput
                  style={styles.sheetInput}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder="e.g. Head of Department"
                  placeholderTextColor={colors.mutedForeground}
                />
                <TouchableOpacity
                  style={styles.signBtn}
                  disabled={signAll.isPending || !customTitle.trim()}
                  onPress={() => customTitle.trim() && signAll.mutate(customTitle.trim())}
                >
                  {signAll.isPending ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.signBtnText}>Sign as "{customTitle || "..."}"</Text>}
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setSignModalOpen(false); setShowCustomInput(false); setCustomTitle(""); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

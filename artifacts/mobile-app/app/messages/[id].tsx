import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, useColorScheme, Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";
import * as Haptics from "expo-haptics";

type Recipient = {
  id: number;
  studentId: number;
  studentName: string;
  parentName: string | null;
  parentPhone: string | null;
  feeBalance: string | null;
  smsSentAt: string | null;
};

type MessageDetail = {
  id: number;
  type: string;
  title: string;
  body: string;
  recipientCount: number;
  className: string | null;
  examName: string | null;
  recipients: Recipient[];
};

export default function MessageDetailScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const { id } = useLocalSearchParams<{ id: string }>();

  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<MessageDetail>(`/messages/${id}`)
      .then(setMessage)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const sendOne = async (recipientId: number) => {
    setSendingId(recipientId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await apiFetch(`/messages/${id}/send-sms`, {
        method: "POST",
        body: JSON.stringify({ recipientId }),
      });
      setMessage(prev => prev ? {
        ...prev,
        recipients: prev.recipients.map(r =>
          r.id === recipientId ? { ...r, smsSentAt: new Date().toISOString() } : r
        ),
      } : prev);
    } catch (err: any) {
      Alert.alert("SMS Failed", err.message);
    } finally {
      setSendingId(null);
    }
  };

  const sendAll = async () => {
    setSendingAll(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiFetch(`/messages/${id}/send-sms`, { method: "POST", body: JSON.stringify({}) });
      const updated = await apiFetch<MessageDetail>(`/messages/${id}`);
      setMessage(updated);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSendingAll(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerCard: {
      backgroundColor: colors.card,
      margin: 16,
      borderRadius: colors.radius,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: colors.foreground,
      marginBottom: 6,
    },
    body: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 20,
    },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.muted,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    chipText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
    },
    sendAllBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: colors.radius,
      padding: 14,
    },
    sendAllText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#fff",
    },
    sectionLabel: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.foreground,
      marginHorizontal: 16,
      marginBottom: 6,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 6,
      borderRadius: colors.radius,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    name: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.foreground,
    },
    phone: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    sentBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#10b981" + "20",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    sentText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 11,
      color: "#10b981",
    },
    sendBtn: {
      padding: 6,
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!message) return null;

  const withPhone = message.recipients.filter(r => r.parentPhone);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      data={message.recipients}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          <View style={styles.headerCard}>
            <Text style={styles.title}>{message.title}</Text>
            <Text style={styles.body} numberOfLines={4}>{message.body}</Text>
            <View style={styles.metaRow}>
              {message.className && (
                <View style={styles.chip}>
                  <Ionicons name="school-outline" size={11} color={colors.mutedForeground} />
                  <Text style={styles.chipText}>{message.className}</Text>
                </View>
              )}
              <View style={styles.chip}>
                <Ionicons name="people-outline" size={11} color={colors.mutedForeground} />
                <Text style={styles.chipText}>{message.recipientCount} recipients</Text>
              </View>
            </View>
          </View>

          {withPhone.length > 0 && (
            <TouchableOpacity style={styles.sendAllBtn} onPress={sendAll} disabled={sendingAll} activeOpacity={0.8}>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={styles.sendAllText}>
                {sendingAll ? "Sending…" : `Send All (${withPhone.length} SMS)`}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionLabel}>Recipients</Text>
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.studentName}</Text>
            <Text style={styles.phone}>{item.parentPhone ?? "No phone number"}</Text>
          </View>
          {item.smsSentAt ? (
            <View style={styles.sentBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#10b981" />
              <Text style={styles.sentText}>Sent</Text>
            </View>
          ) : item.parentPhone ? (
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => sendOne(item.id)}
              disabled={sendingId === item.id}
            >
              {sendingId === item.id
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="send-outline" size={20} color={colors.primary} />
              }
            </TouchableOpacity>
          ) : (
            <Ionicons name="ban-outline" size={18} color={colors.mutedForeground} />
          )}
        </View>
      )}
    />
  );
}

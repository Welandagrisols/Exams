import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, useColorScheme, Alert,
} from "react-native";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";
import * as Haptics from "expo-haptics";
import { usePermissions } from "@/hooks/usePermissions";

type Class = { id: number; name: string };

export default function ComposeScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const { canWrite } = usePermissions(classId);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("Dear Parent/Guardian,\n\n[Student Name] results:\n\nRegards,\nSchool Administration");
  const [classId, setClassId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  const { data: classes, isLoading } = useQuery<Class[]>({
    queryKey: ["/classes"],
    queryFn: () => apiFetch("/classes"),
  });

  const handleSend = async () => {
    if (!title.trim()) { Alert.alert("Required", "Please enter a subject."); return; }
    if (!body.trim()) { Alert.alert("Required", "Please enter a message body."); return; }
    if (!classId) { Alert.alert("Required", "Please select a class."); return; }
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const msg = await apiFetch<{ id: number }>("/messages", {
        method: "POST",
        body: JSON.stringify({
          type: "general",
          title,
          body,
          classId,
          studentIds: [],
        }),
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
    content: { padding: 16, paddingBottom: 48 },
    label: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.foreground,
      marginBottom: 6,
      marginTop: 14,
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      padding: 12,
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.foreground,
    },
    textArea: {
      minHeight: 160,
      textAlignVertical: "top",
    },
    classRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    classChip: {
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
    },
    classChipText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
    },
    sendBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      padding: 15,
      marginTop: 24,
    },
    sendBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#fff",
    },
    hint: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 4,
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Class *</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={styles.classRow}>
          {classes?.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={[
                styles.classChip,
                {
                  backgroundColor: classId === cls.id ? colors.primary : colors.card,
                  borderColor: classId === cls.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setClassId(cls.id)}
            >
              <Text style={[styles.classChipText, { color: classId === cls.id ? "#fff" : colors.foreground }]}>
                {cls.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Subject *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Term 1 Results"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={styles.label}>Message *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={body}
        onChangeText={setBody}
        multiline
        placeholderTextColor={colors.mutedForeground}
      />
      <Text style={styles.hint}>Use [Student Name] to personalise per student.</Text>

      {canWrite && (
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending} activeOpacity={0.8}>
          {sending
            ? <ActivityIndicator color="#fff" />
            : <><Ionicons name="save-outline" size={18} color="#fff" /><Text style={styles.sendBtnText}>Save & Continue</Text></>
          }
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

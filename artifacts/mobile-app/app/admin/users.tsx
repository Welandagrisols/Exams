import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, useColorScheme, Alert, Modal,
} from "react-native";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

type UserRow = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: "teacher" | "admin" | "principal" | "deputy";
  isActive: boolean;
};

const ROLES: UserRow["role"][] = ["teacher", "admin", "principal", "deputy"];

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
  admin: { bg: "#ede9fe", fg: "#5b21b6" },
  principal: { bg: "#dbeafe", fg: "#1e40af" },
  deputy: { bg: "#dcfce7", fg: "#166534" },
  teacher: { bg: "#f1f5f9", fg: "#475569" },
};

export default function UsersScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [pickerFor, setPickerFor] = useState<UserRow | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<UserRow[]>({
    queryKey: ["/users"],
    queryFn: () => apiFetch("/users"),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiFetch(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/users"] });
      setPickerFor(null);
    },
    onError: (err: any) => {
      Alert.alert("Could not change role", err.message ?? "Please try again.");
      setPickerFor(null);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/users"] }),
    onError: (err: any) => Alert.alert("Could not update account", err.message ?? "Please try again."),
  });

  const confirmToggleStatus = (item: UserRow) => {
    const name = [item.firstName, item.lastName].filter(Boolean).join(" ") || item.email || "this user";
    if (item.isActive) {
      Alert.alert(
        "Deactivate Account",
        `${name} will no longer be able to sign in or use the app. Their past classes, scores, signatures, and messages stay on record. You can reactivate them anytime.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Deactivate", style: "destructive", onPress: () => toggleStatus.mutate({ id: item.id, isActive: false }) },
        ],
      );
    } else {
      Alert.alert("Reactivate Account", `${name} will be able to sign in and use the app again.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Reactivate", onPress: () => toggleStatus.mutate({ id: item.id, isActive: true }) },
      ]);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    banner: {
      margin: 16, marginBottom: 4, padding: 12, borderRadius: colors.radius,
      backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border,
    },
    bannerText: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, lineHeight: 17 },
    item: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, marginHorizontal: 16, marginVertical: 5,
      borderRadius: colors.radius, padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    name: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.foreground },
    email: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    badgeText: { fontFamily: "Poppins_600SemiBold", fontSize: 11, textTransform: "capitalize" },
    youTag: { fontFamily: "Poppins_500Medium", fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
    inactiveTag: { fontFamily: "Poppins_600SemiBold", fontSize: 10, color: "#b91c1c", marginTop: 2 },
    statusBtn: { padding: 6, marginLeft: 4 },
    modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 36 },
    sheetTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: colors.foreground, marginBottom: 4 },
    sheetSub: { fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.mutedForeground, marginBottom: 14 },
    roleOpt: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    roleOptText: { fontFamily: "Poppins_500Medium", fontSize: 14, color: colors.foreground, textTransform: "capitalize" },
    cancelBtn: { marginTop: 14, alignItems: "center", paddingVertical: 12 },
    cancelText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.mutedForeground },
  });

  if (isLoading) {
    return <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.banner}>
        <Text style={s.bannerText}>
          {isAdmin
            ? "Tap a role badge to change it. You cannot change your own role — ask another admin."
            : "Only an admin can change roles. You can view the staff list here."}
        </Text>
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        renderItem={({ item }) => {
          const isSelf = item.id === user?.id;
          const displayName = [item.firstName, item.lastName].filter(Boolean).join(" ") || "Unnamed";
          const rc = ROLE_COLORS[item.role] ?? ROLE_COLORS.teacher;
          return (
            <View style={[s.item, !item.isActive && { opacity: 0.55 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{displayName}</Text>
                <Text style={s.email} numberOfLines={1}>{item.email ?? "—"}</Text>
                {isSelf && <Text style={s.youTag}>This is you</Text>}
                {!item.isActive && <Text style={s.inactiveTag}>Deactivated</Text>}
              </View>
              <TouchableOpacity
                style={[s.badge, { backgroundColor: rc.bg, opacity: isAdmin && !isSelf ? 1 : 0.7 }]}
                disabled={!isAdmin || isSelf}
                onPress={() => setPickerFor(item)}
              >
                <Text style={[s.badgeText, { color: rc.fg }]}>{item.role}</Text>
              </TouchableOpacity>
              {isAdmin && !isSelf && (
                <TouchableOpacity style={s.statusBtn} onPress={() => confirmToggleStatus(item)} disabled={toggleStatus.isPending}>
                  <Ionicons
                    name={item.isActive ? "person-remove-outline" : "person-add-outline"}
                    size={19}
                    color={item.isActive ? "#b91c1c" : "#166534"}
                  />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      <Modal visible={!!pickerFor} transparent animationType="slide" onRequestClose={() => setPickerFor(null)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setPickerFor(null)}>
          <TouchableOpacity activeOpacity={1} style={s.sheet}>
            <Text style={s.sheetTitle}>Change role</Text>
            <Text style={s.sheetSub}>
              {[pickerFor?.firstName, pickerFor?.lastName].filter(Boolean).join(" ") || pickerFor?.email}
            </Text>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r}
                style={s.roleOpt}
                disabled={changeRole.isPending}
                onPress={() => pickerFor && changeRole.mutate({ id: pickerFor.id, role: r })}
              >
                <Text style={s.roleOptText}>{r}</Text>
                {pickerFor?.role === r && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setPickerFor(null)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

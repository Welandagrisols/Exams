import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, useColorScheme, ScrollView,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import palette from "@/constants/colors";

type SearchResult = {
  students: { id: number; name: string; admissionNo: string; classId: number | null; className: string | null }[];
  classes: { id: number; name: string; year: number; term: number }[];
  exams: { id: number; name: string; classId: number; className: string | null; status: string }[];
  messages: { id: number; title: string; body: string; createdAt: string; classId: number | null; className: string | null }[];
};

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchScreen() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 300);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const { data, isFetching } = useQuery<SearchResult>({
    queryKey: ["/search", debouncedQuery],
    queryFn: () => apiFetch(`/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.trim().length >= 2,
  });

  const hasQuery = debouncedQuery.trim().length >= 2;
  const totalResults = data ? data.students.length + data.classes.length + data.exams.length + data.messages.length : 0;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchBar: {
      flexDirection: "row", alignItems: "center", gap: 8,
      margin: 16, marginBottom: 8,
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    searchInput: { flex: 1, fontFamily: "Poppins_400Regular", fontSize: 15, color: colors.foreground },
    sectionTitle: {
      fontFamily: "Poppins_600SemiBold", fontSize: 12, color: colors.mutedForeground,
      textTransform: "uppercase", letterSpacing: 0.5,
      marginHorizontal: 16, marginTop: 16, marginBottom: 6,
    },
    row: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: colors.card, marginHorizontal: 16, marginVertical: 4,
      borderRadius: colors.radius, padding: 13, borderWidth: 1, borderColor: colors.border,
    },
    rowIcon: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + "18",
      justifyContent: "center", alignItems: "center",
    },
    rowTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 13.5, color: colors.foreground },
    rowSub: { fontFamily: "Poppins_400Regular", fontSize: 11.5, color: colors.mutedForeground, marginTop: 1 },
    empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10, paddingHorizontal: 40 },
    emptyText: { fontFamily: "Poppins_500Medium", fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  });

  return (
    <View style={s.container}>
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          ref={inputRef}
          style={s.searchInput}
          placeholder="Search students, classes, exams, messages…"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {isFetching && <ActivityIndicator size="small" color={colors.primary} />}
        {!!query && !isFetching && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {!hasQuery ? (
        <View style={s.empty}>
          <Ionicons name="search-outline" size={44} color={colors.mutedForeground} />
          <Text style={s.emptyText}>Search for a student, class, exam, or message — by name, admission number, or (for messages) the date sent.</Text>
        </View>
      ) : totalResults === 0 && !isFetching ? (
        <View style={s.empty}>
          <Ionicons name="file-tray-outline" size={44} color={colors.mutedForeground} />
          <Text style={s.emptyText}>No results for "{debouncedQuery}".</Text>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          {data && data.students.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Students</Text>
              {data.students.map(st => (
                <TouchableOpacity key={`s-${st.id}`} style={s.row} onPress={() => st.classId && router.push(`/classes/${st.classId}/student-edit?studentId=${st.id}`)}>
                  <View style={s.rowIcon}><Ionicons name="person-outline" size={17} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{st.name}</Text>
                    <Text style={s.rowSub}>{st.admissionNo}{st.className ? ` · ${st.className}` : ""}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </>
          )}

          {data && data.classes.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Classes</Text>
              {data.classes.map(c => (
                <TouchableOpacity key={`c-${c.id}`} style={s.row} onPress={() => router.push(`/classes/${c.id}/students`)}>
                  <View style={s.rowIcon}><Ionicons name="school-outline" size={17} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{c.name}</Text>
                    <Text style={s.rowSub}>{c.year} · Term {c.term}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </>
          )}

          {data && data.exams.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Exams</Text>
              {data.exams.map(e => (
                <TouchableOpacity key={`e-${e.id}`} style={s.row} onPress={() => router.push(`/exams/${e.id}/rankings`)}>
                  <View style={s.rowIcon}><Ionicons name="document-text-outline" size={17} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{e.name}</Text>
                    <Text style={s.rowSub}>{e.className ?? "Unknown class"} · {e.status}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </>
          )}

          {data && data.messages.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Messages</Text>
              {data.messages.map(m => (
                <TouchableOpacity key={`m-${m.id}`} style={s.row} onPress={() => router.push(`/messages/${m.id}`)}>
                  <View style={s.rowIcon}><Ionicons name="chatbubble-outline" size={17} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle} numberOfLines={1}>{m.title}</Text>
                    <Text style={s.rowSub} numberOfLines={1}>
                      {new Date(m.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      {m.className ? ` · ${m.className}` : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

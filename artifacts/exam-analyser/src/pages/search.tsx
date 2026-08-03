import { Layout, Header } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/supabase";
import { Link } from "wouter";
import { Search, X, User, School, FileText, MessageSquare, ChevronRight, SearchX } from "lucide-react";

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

function ResultRow({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}

export default function GlobalSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 300);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const hasQuery = debouncedQuery.trim().length >= 2;

  const { data, isFetching } = useQuery<SearchResult>({
    queryKey: ["/search", debouncedQuery],
    queryFn: async () => {
      const res = await authFetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: hasQuery,
  });

  const totalResults = data ? data.students.length + data.classes.length + data.exams.length + data.messages.length : 0;

  return (
    <Layout>
      <Header title="Search" />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search students, classes, exams, messages…"
            className="pl-9 pr-9 h-11"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!hasQuery ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Search className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Search for a student, class, exam, or message — by name, admission number, or (for messages) the date sent.
            </p>
          </div>
        ) : totalResults === 0 && !isFetching ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <SearchX className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No results for "{debouncedQuery}".</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data && data.students.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Students</p>
                {data.students.map(st => (
                  <ResultRow
                    key={`s-${st.id}`}
                    href={st.classId ? `/classes/${st.classId}/students` : "#"}
                    icon={<User className="h-4 w-4 text-primary" />}
                    title={st.name}
                    subtitle={`${st.admissionNo}${st.className ? ` · ${st.className}` : ""}`}
                  />
                ))}
              </div>
            )}

            {data && data.classes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classes</p>
                {data.classes.map(c => (
                  <ResultRow
                    key={`c-${c.id}`}
                    href={`/classes/${c.id}/students`}
                    icon={<School className="h-4 w-4 text-primary" />}
                    title={c.name}
                    subtitle={`${c.year} · Term ${c.term}`}
                  />
                ))}
              </div>
            )}

            {data && data.exams.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exams</p>
                {data.exams.map(e => (
                  <ResultRow
                    key={`e-${e.id}`}
                    href={`/exams/${e.id}/rankings`}
                    icon={<FileText className="h-4 w-4 text-primary" />}
                    title={e.name}
                    subtitle={`${e.className ?? "Unknown class"} · ${e.status}`}
                  />
                ))}
              </div>
            )}

            {data && data.messages.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Messages</p>
                {data.messages.map(m => (
                  <ResultRow
                    key={`m-${m.id}`}
                    href={`/messages/${m.id}`}
                    icon={<MessageSquare className="h-4 w-4 text-primary" />}
                    title={m.title}
                    subtitle={`${new Date(m.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}${m.className ? ` · ${m.className}` : ""}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

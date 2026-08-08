import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";

export type UserRole = "teacher" | "admin" | "principal" | "deputy";

export interface UserProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: UserRole;
  assignedClassIds: number[];
  assignedClasses: { id: number; name: string }[];
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequestId = useRef(0);

  const fetchProfile = useCallback(async () => {
    const requestId = ++profileRequestId.current;
    setProfile(null);
    try {
      const data = await apiFetch<UserProfile>("/me");
      if (requestId === profileRequestId.current) {
        setProfile(data);
      }
    } catch {
      // API not reachable or not yet migrated — leave profile null. Do not
      // retain a profile belonging to a previous session.
    }
  }, []);

  useEffect(() => {
    // Read the persisted session on startup and load its profile. The auth
    // listener below also handles INITIAL_SESSION and later sign-in events;
    // request IDs make either ordering safe without retaining stale profile
    // permissions.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session) {
        fetchProfile();
      }
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session) {
        fetchProfile();
      } else {
        profileRequestId.current += 1;
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    profileRequestId.current += 1;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

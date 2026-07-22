import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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

const API_URL = import.meta.env.VITE_API_URL ?? "";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: UserProfile = await res.json();
        setProfile(data);
      }
    } catch {
      // API not reachable yet — profile stays null
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.access_token) fetchProfile(session.access_token);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.access_token) {
        fetchProfile(session.access_token);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile: () => session?.access_token ? fetchProfile(session.access_token) : Promise.resolve() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Returns true if the current user has admin / principal / deputy role */
export function useIsStaff(): boolean {
  const { profile } = useAuth();
  return ["admin", "principal", "deputy"].includes(profile?.role ?? "");
}

/**
 * Returns true if the current user may perform write operations on a specific
 * class (enter scores, edit comments, print/share reports, send messages).
 * Staff (admin/principal/deputy) always return true.
 * A teacher returns true only for their assigned class.
 * Pass no classId to test staff-only access.
 */
export function useCanWrite(classId?: number | null): boolean {
  const { profile } = useAuth();
  const isStaff = ["admin", "principal", "deputy"].includes(profile?.role ?? "");
  if (isStaff) return true;
  if (classId == null) return false;
  return profile?.assignedClassIds.includes(classId) ?? false;
}

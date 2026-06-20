import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface ReplitUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  displayName?: string | null;
}

interface AuthContextValue {
  user: ReplitUser | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ReplitUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/user", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) {
          const claims = data.claims ?? data;
          setUser({
            id: claims.sub ?? data.id ?? "",
            email: claims.email ?? data.email ?? null,
            firstName: claims.first_name ?? data.firstName ?? null,
            lastName: claims.last_name ?? data.lastName ?? null,
            profileImageUrl: claims.profile_image_url ?? data.profileImageUrl ?? null,
            displayName: claims.name ?? data.displayName ?? null,
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signOut = () => {
    window.location.href = "/api/logout";
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

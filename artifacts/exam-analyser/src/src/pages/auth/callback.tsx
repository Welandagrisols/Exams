import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const navigatedRef = useRef(false);

  useEffect(() => {
    const go = (path: string) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      navigate(path);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        go("/");
      } else if (event === "SIGNED_OUT") {
        go("/login");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) go("/");
    });

    const timer = setTimeout(() => go("/login"), 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white text-sm">Signing you in…</p>
      </div>
    </div>
  );
}

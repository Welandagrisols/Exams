import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white text-sm">Signing you in…</p>
      </div>
    </div>
  );
}

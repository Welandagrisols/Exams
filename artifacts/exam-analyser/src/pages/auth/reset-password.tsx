import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); }
    else { setDone(true); setTimeout(() => navigate("/"), 2500); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-[#1e3a5f] flex items-center justify-center mb-1">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0121 21H3a12.083 12.083 0 012.84-10.422L12 14z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">EduMetrics</h1>
          <p className="text-sm text-gray-500">Set a new password</p>
        </div>
        <div className="w-full h-px bg-gray-100" />

        {done ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800">Password updated!</p>
            <p className="text-xs text-gray-500">Taking you to the dashboard…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              required
              minLength={6}
              autoComplete="new-password"
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition-colors"
            />
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              required
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition-colors"
            />
            <button
              type="submit"
              disabled={loading || password.length < 6 || !confirm}
              className="w-full bg-[#1e3a5f] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#163050] transition-colors disabled:opacity-60"
            >
              {loading ? "Saving…" : "Set new password"}
            </button>
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

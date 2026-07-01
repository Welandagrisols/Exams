import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Mode = "options" | "password" | "signup" | "email" | "email_sent" | "signup_sent";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setError(null); setMode("options"); setPassword(""); };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setError(error.message); setLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
    else if (data.session) {
      // Email confirmation disabled — user is already signed in
    } else {
      setMode("signup_sent"); setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
    else { setMode("email_sent"); setLoading(false); }
  };

  const Logo = () => (
    <div className="flex flex-col items-center gap-2">
      <div className="w-14 h-14 rounded-full bg-[#1e3a5f] flex items-center justify-center mb-1">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0121 21H3a12.083 12.083 0 012.84-10.422L12 14z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-[#1e3a5f]">EduMetrics</h1>
      <p className="text-sm text-gray-500">School Exam Management Portal</p>
    </div>
  );

  const BackBtn = ({ label = "← Back" }: { label?: string }) => (
    <button type="button" onClick={reset} className="text-xs text-gray-400 text-center hover:text-gray-600">{label}</button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm flex flex-col items-center gap-6">
        <Logo />
        <div className="w-full h-px bg-gray-100" />

        {mode === "signup_sent" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800">Check your email</p>
            <p className="text-xs text-gray-500">
              We sent a confirmation link to <span className="font-medium text-[#1e3a5f]">{email}</span>.<br />
              Click the link to verify your account and sign in.
            </p>
            <button onClick={reset} className="text-xs text-[#1e3a5f] underline mt-1">Use a different email</button>
          </div>
        )}

        {mode === "email_sent" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800">Check your email</p>
            <p className="text-xs text-gray-500">
              Sign-in link sent to <span className="font-medium text-[#1e3a5f]">{email}</span>.<br />
              Click the link in the email to log in.
            </p>
            <button onClick={reset} className="text-xs text-[#1e3a5f] underline mt-1">Use a different method</button>
          </div>
        )}

        {mode === "options" && (
          <div className="flex flex-col gap-3 w-full">
            <p className="text-sm text-gray-600 font-medium text-center">Sign in to your account</p>
            <button onClick={() => setMode("password")}
              className="w-full flex items-center justify-center gap-3 bg-[#1e3a5f] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#163050] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Sign in with password
            </button>
            <button onClick={() => setMode("signup")}
              className="w-full flex items-center justify-center gap-3 border border-[#1e3a5f] text-[#1e3a5f] rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#1e3a5f]/5 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Create an account
            </button>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <button onClick={handleGoogleSignIn} disabled={loading}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
              {loading
                ? <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                : <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
              }
              Continue with Google
            </button>
            <button onClick={() => setMode("email")}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email magic link
            </button>
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </div>
        )}

        {mode === "password" && (
          <form onSubmit={handlePasswordLogin} className="flex flex-col gap-3 w-full">
            <p className="text-sm text-gray-600 font-medium text-center">Sign in with password</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="teacher@school.edu" required autoFocus
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition-colors" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" required
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition-colors" />
            <button type="submit" disabled={loading || !email.trim() || !password}
              className="w-full bg-[#1e3a5f] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#163050] transition-colors disabled:opacity-60">
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <button type="button" onClick={() => setMode("signup")}
              className="text-xs text-[#1e3a5f] text-center hover:underline">
              Don't have an account? Create one
            </button>
            <BackBtn />
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="flex flex-col gap-3 w-full">
            <p className="text-sm text-gray-600 font-medium text-center">Create your account</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="teacher@school.edu" required autoFocus
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition-colors" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Choose a password (min 6 chars)" required minLength={6}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition-colors" />
            <button type="submit" disabled={loading || !email.trim() || password.length < 6}
              className="w-full bg-[#1e3a5f] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#163050] transition-colors disabled:opacity-60">
              {loading ? "Creating account…" : "Create account"}
            </button>
            <button type="button" onClick={() => setMode("password")}
              className="text-xs text-[#1e3a5f] text-center hover:underline">
              Already have an account? Sign in
            </button>
            <BackBtn />
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </form>
        )}

        {mode === "email" && (
          <form onSubmit={handleMagicLink} className="flex flex-col gap-3 w-full">
            <p className="text-sm text-gray-600 font-medium text-center">Enter your email</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="teacher@school.edu" required autoFocus
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition-colors" />
            <button type="submit" disabled={loading || !email.trim()}
              className="w-full bg-[#1e3a5f] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#163050] transition-colors disabled:opacity-60">
              {loading ? "Sending…" : "Send sign-in link"}
            </button>
            <BackBtn />
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </form>
        )}

        <p className="text-xs text-gray-400 text-center">For authorized school staff only</p>
      </div>
    </div>
  );
}

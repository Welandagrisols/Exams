export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
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
          <p className="text-sm text-gray-500">School Exam Management Portal</p>
        </div>

        <div className="w-full h-px bg-gray-100" />

        <div className="flex flex-col gap-3 w-full">
          <p className="text-sm text-gray-600 font-medium text-center">Sign in to your account</p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#1e3a5f] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#163050] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Log in
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">For authorized school staff only</p>
      </div>
    </div>
  );
}

import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, BookOpen, Settings, GraduationCap, MessageSquare, ChevronRight, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SIDEBAR_BG = "#1e3a5f";
const SIDEBAR_ACTIVE = "rgba(255,255,255,0.12)";
const SIDEBAR_ACTIVE_BORDER = "rgba(147,197,253,0.25)";
const SIDEBAR_TEXT = "#bfdbfe";
const SIDEBAR_SUBTEXT = "#93c5fd";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/classes", label: "Classes", icon: Users },
  { href: "/learning-areas", label: "Learning Areas", icon: BookOpen },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside
      className="hidden md:flex print:hidden flex-col w-64 flex-shrink-0 relative z-20"
      style={{ backgroundColor: SIDEBAR_BG }}
    >
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <GraduationCap className="h-7 w-7" style={{ color: SIDEBAR_SUBTEXT }} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white leading-tight">EduMetrics</h1>
          <p className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: SIDEBAR_SUBTEXT }}>School Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm"
              style={{
                backgroundColor: isActive ? SIDEBAR_ACTIVE : "transparent",
                color: isActive ? "white" : SIDEBAR_TEXT,
                border: isActive ? `1px solid ${SIDEBAR_ACTIVE_BORDER}` : "1px solid transparent",
              }}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-6 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm"
          style={{ color: SIDEBAR_TEXT }}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          Settings
        </Link>
        <div
          className="mt-4 pt-4 flex items-center gap-3 px-2"
          style={{ borderTop: `1px solid rgba(147,197,253,0.15)` }}
        >
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="text-white text-xs font-bold" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
              EM
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Admin</p>
            <p className="text-xs truncate" style={{ color: SIDEBAR_SUBTEXT }}>EduMetrics</p>
          </div>
          <LogOut className="h-4 w-4 flex-shrink-0 opacity-50" style={{ color: SIDEBAR_SUBTEXT }} />
        </div>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const [location] = useLocation();
  const items = [...NAV_ITEMS, { href: "/settings", label: "Settings", icon: Settings }];

  return (
    <nav className="md:hidden print:hidden fixed bottom-0 left-0 right-0 border-t bg-white pb-safe z-50 shadow-lg">
      <div className="flex justify-around items-center h-16 px-2">
        {items.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-[10px] font-semibold transition-colors"
              style={{ color: isActive ? SIDEBAR_BG : "#94a3b8" }}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Header({ title, breadcrumbs }: { title: string; breadcrumbs?: { label: string; href?: string }[] }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm h-16 flex items-center px-6">
      <div className="flex items-center gap-2">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <div className="flex items-center text-sm text-slate-500 hidden sm:flex">
            {breadcrumbs.map((bc, idx) => (
              <div key={idx} className="flex items-center">
                {bc.href ? (
                  <Link href={bc.href} className="hover:text-slate-800 transition-colors font-medium">{bc.label}</Link>
                ) : (
                  <span className="text-slate-800 font-semibold">{bc.label}</span>
                )}
                {idx < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 mx-1 text-slate-300" />}
              </div>
            ))}
          </div>
        ) : (
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h1>
        )}
        {(!breadcrumbs || !breadcrumbs.length) && null}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <h1 className="text-lg font-bold text-slate-800 tracking-tight sm:hidden">
            {breadcrumbs[breadcrumbs.length - 1].label}
          </h1>
        )}
      </div>
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col pb-16 md:pb-0 overflow-x-hidden min-w-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

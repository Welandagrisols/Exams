import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileText, Settings, BookOpen, Menu, X, ChevronRight, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/classes", label: "Classes", icon: Users },
  { href: "/learning-areas", label: "Learning Areas", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <BarChart className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">Elimu Analytics</span>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Elimu Analytics
      </div>
    </aside>
  );
}

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background pb-safe z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "fill-primary/20")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Header({ title, breadcrumbs }: { title: string, breadcrumbs?: { label: string, href?: string }[] }) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b h-14 flex items-center px-4 md:px-6">
      <div className="flex items-center gap-2">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <div className="flex items-center text-sm text-muted-foreground hidden sm:flex">
            {breadcrumbs.map((bc, idx) => (
              <div key={idx} className="flex items-center">
                {bc.href ? (
                  <Link href={bc.href} className="hover:text-foreground transition-colors">{bc.label}</Link>
                ) : (
                  <span className="text-foreground font-medium">{bc.label}</span>
                )}
                {idx < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 mx-1" />}
              </div>
            ))}
          </div>
        ) : (
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        )}
        {(!breadcrumbs || breadcrumbs.length === 0 || window.innerWidth < 640) && breadcrumbs?.length && (
           <h1 className="text-lg font-semibold tracking-tight sm:hidden">{breadcrumbs[breadcrumbs.length - 1].label}</h1>
        )}
      </div>
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full bg-muted/20">
      <Sidebar />
      <main className="flex-1 flex flex-col pb-16 md:pb-0 overflow-x-hidden relative">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

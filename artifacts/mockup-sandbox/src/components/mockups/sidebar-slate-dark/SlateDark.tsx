import React from "react";
import { LayoutDashboard, Users, BookOpen, Settings, Bell, Search, GraduationCap, Award, Calendar, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SIDEBAR_BG = "#1e293b";
const SIDEBAR_ACTIVE = "rgba(255,255,255,0.10)";
const SIDEBAR_TEXT = "#94a3b8";
const SIDEBAR_ACTIVE_TEXT = "#f1f5f9";
const SIDEBAR_BORDER = "rgba(148,163,184,0.15)";

const statCards = [
  { title: "Total Students", value: "20", icon: Users, gradient: "from-teal-400 to-emerald-500", shadow: "shadow-emerald-200" },
  { title: "Total Classes", value: "3", icon: LayoutDashboard, gradient: "from-blue-400 to-indigo-500", shadow: "shadow-indigo-200" },
  { title: "Total Exams", value: "3", icon: BookOpen, gradient: "from-violet-400 to-purple-500", shadow: "shadow-purple-200" },
  { title: "Top Score avg", value: "92%", icon: Award, gradient: "from-orange-400 to-amber-500", shadow: "shadow-amber-200" },
];

const recentExams = [
  { id: 1, name: "Term 1 Mid-Term", date: "Mar 15, 2024", status: "CLOSED", participants: 20, avgScore: "68%" },
  { id: 2, name: "Term 1 End-Term", date: "May 20, 2024", status: "CLOSED", participants: 20, avgScore: "72%" },
  { id: 3, name: "Term 2 Opener", date: "Aug 10, 2024", status: "ACTIVE", participants: 18, avgScore: "-" },
];

const topPerformers = [
  { id: 1, name: "Wanjiku Mwangi", marks: 460, avg: 92, grade: "EE2", color: "bg-pink-100 text-pink-700" },
  { id: 2, name: "Nancy Rono", marks: 445, avg: 89, grade: "EE1", color: "bg-blue-100 text-blue-700" },
  { id: 3, name: "Joyce Nyambeki", marks: 420, avg: 84, grade: "ME2", color: "bg-green-100 text-green-700" },
  { id: 4, name: "Amina Osman", marks: 415, avg: 83, grade: "ME2", color: "bg-purple-100 text-purple-700" },
  { id: 5, name: "George Kirimi", marks: 390, avg: 78, grade: "ME1", color: "bg-orange-100 text-orange-700" },
];

export function SlateDark() {
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }} className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');`}</style>

      <aside className="w-64 flex-shrink-0 flex flex-col relative z-20" style={{ backgroundColor: SIDEBAR_BG }}>
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <GraduationCap className="h-8 w-8 text-slate-200" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Elimu Analytics</h1>
            <p className="text-xs font-medium uppercase tracking-wider mt-0.5" style={{ color: SIDEBAR_TEXT }}>JSS Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {[
            { icon: LayoutDashboard, label: "Dashboard", active: true },
            { icon: Users, label: "Classes", active: false },
            { icon: BookOpen, label: "Learning Areas", active: false },
          ].map(({ icon: Icon, label, active }) => (
            <a key={label} href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors"
              style={{
                backgroundColor: active ? SIDEBAR_ACTIVE : "transparent",
                color: active ? SIDEBAR_ACTIVE_TEXT : SIDEBAR_TEXT,
                border: active ? `1px solid ${SIDEBAR_BORDER}` : "1px solid transparent"
              }}>
              <Icon className="h-5 w-5" />
              {label}
            </a>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors" style={{ color: SIDEBAR_TEXT }}>
            <Settings className="h-5 w-5" />
            Settings
          </a>
          <div className="mt-4 pt-4 flex items-center gap-3 px-4 pb-2" style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}>
            <Avatar className="h-10 w-10"><AvatarImage src="https://i.pravatar.cc/150?u=teacher" /><AvatarFallback className="text-white" style={{ backgroundColor: "#334155" }}>TR</AvatarFallback></Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">Teacher Jane</p>
              <p className="text-xs truncate" style={{ color: SIDEBAR_TEXT }}>Admin</p>
            </div>
            <button style={{ color: SIDEBAR_TEXT }}><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 px-8 flex items-center justify-between bg-white border-b border-slate-100 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Welcome back, Jane! 👋</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Here's what's happening across your classes today.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search students, exams..." className="pl-10 w-64 bg-slate-50 border-transparent rounded-full font-medium" />
            </div>
            <button className="relative p-2 text-slate-400 bg-slate-50 rounded-full hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="grid grid-cols-4 gap-6">
              {statCards.map((stat, i) => (
                <div key={i} className={"relative overflow-hidden rounded-3xl bg-gradient-to-br " + stat.gradient + " p-6 text-white shadow-xl " + stat.shadow}>
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10 flex justify-between items-start">
                    <div>
                      <p className="text-white/80 font-semibold mb-1">{stat.title}</p>
                      <h3 className="text-5xl font-extrabold tracking-tight">{stat.value}</h3>
                    </div>
                    <div className="bg-white/20 p-3 rounded-2xl"><stat.icon className="h-7 w-7 text-white" strokeWidth={2.5} /></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">Recent Exams</h3>
                  <Button variant="ghost" className="text-slate-600 font-semibold rounded-full">View All</Button>
                </div>
                {recentExams.map((exam) => (
                  <div key={exam.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-slate-800 text-lg leading-tight">{exam.name}</h4>
                      <Badge className={exam.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 border-0" : "bg-slate-100 text-slate-600 border-0"}>{exam.status}</Badge>
                    </div>
                    <div className="flex items-center text-sm text-slate-500 gap-4 mb-4">
                      <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{exam.date}</span>
                      <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{exam.participants}</span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <span className="text-sm font-semibold text-slate-600">Avg: <strong className="text-slate-800">{exam.avgScore}</strong></span>
                      <Button variant="outline" size="sm" className="rounded-full border-slate-200">Details <ChevronRight className="w-4 h-4 ml-1" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">Top Performers</h3>
                  <Button variant="ghost" className="text-slate-600 font-semibold rounded-full">Full Leaderboard</Button>
                </div>
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="w-16 font-bold text-slate-500 py-4">Rank</TableHead>
                        <TableHead className="font-bold text-slate-500 py-4">Student</TableHead>
                        <TableHead className="text-right font-bold text-slate-500 py-4">Marks</TableHead>
                        <TableHead className="text-right font-bold text-slate-500 py-4">Avg</TableHead>
                        <TableHead className="text-right font-bold text-slate-500 py-4 pr-6">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPerformers.map((student, i) => (
                        <TableRow key={student.id} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell className="font-bold py-4">
                            {i === 0 && <span className="text-2xl">🥇</span>}
                            {i === 1 && <span className="text-2xl">🥈</span>}
                            {i === 2 && <span className="text-2xl">🥉</span>}
                            {i > 2 && <span className="text-slate-400 pl-2 text-lg">{i + 1}</span>}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className={"w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm " + student.color}>
                                {student.name.split(" ").map(n => n[0]).join("")}
                              </div>
                              <span className="font-bold text-slate-800">{student.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-4"><span className="font-bold text-slate-700">{student.marks}</span><span className="text-slate-400 text-xs ml-1">/500</span></TableCell>
                          <TableCell className="text-right py-4 font-bold text-slate-700">{student.avg}%</TableCell>
                          <TableCell className="text-right py-4 pr-6">
                            <Badge className={"font-bold px-3 py-1 text-sm rounded-lg border-0 " + (student.grade.startsWith("E") ? "bg-emerald-500 text-white" : student.grade.startsWith("M") ? "bg-amber-400 text-white" : "bg-rose-500 text-white")}>
                              {student.grade}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

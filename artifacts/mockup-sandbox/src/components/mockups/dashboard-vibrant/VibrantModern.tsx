import React from "react";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Settings, 
  Bell, 
  Search, 
  GraduationCap, 
  Award, 
  Calendar,
  CheckCircle2,
  XCircle,
  MoreVertical,
  LogOut,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { stat } from "fs";

const statCards = [
  {
    title: "Total Students",
    value: "20",
    icon: Users,
    gradient: "from-teal-400 to-emerald-500",
    shadow: "shadow-emerald-200",
  },
  {
    title: "Total Classes",
    value: "3",
    icon: LayoutDashboard,
    gradient: "from-blue-400 to-indigo-500",
    shadow: "shadow-indigo-200",
  },
  {
    title: "Total Exams",
    value: "3",
    icon: BookOpen,
    gradient: "from-violet-400 to-purple-500",
    shadow: "shadow-purple-200",
  },
  {
    title: "Top Score avg",
    value: "92%",
    icon: Award,
    gradient: "from-orange-400 to-amber-500",
    shadow: "shadow-amber-200",
  },
];

const recentExams = [
  {
    id: 1,
    name: "Term 1 Mid-Term",
    date: "Mar 15, 2024",
    status: "CLOSED",
    participants: 20,
    avgScore: "68%",
  },
  {
    id: 2,
    name: "Term 1 End-Term",
    date: "May 20, 2024",
    status: "CLOSED",
    participants: 20,
    avgScore: "72%",
  },
  {
    id: 3,
    name: "Term 2 Opener",
    date: "Aug 10, 2024",
    status: "ACTIVE",
    participants: 18,
    avgScore: "-",
  },
];

const topPerformers = [
  {
    id: 1,
    name: "Wanjiku Mwangi",
    marks: 460,
    avg: 92,
    grade: "EE2",
    color: "bg-pink-100 text-pink-700",
  },
  {
    id: 2,
    name: "Nancy Rono",
    marks: 445,
    avg: 89,
    grade: "EE1",
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: 3,
    name: "Joyce Nyambeki",
    marks: 420,
    avg: 84,
    grade: "ME2",
    color: "bg-green-100 text-green-700",
  },
  {
    id: 4,
    name: "Amina Osman",
    marks: 415,
    avg: 83,
    grade: "ME2",
    color: "bg-purple-100 text-purple-700",
  },
  {
    id: 5,
    name: "George Kirimi",
    marks: 390,
    avg: 78,
    grade: "ME1",
    color: "bg-orange-100 text-orange-700",
  },
];

export function VibrantModern() {
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }} className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
      `}</style>
      
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col text-white transition-all duration-300 relative z-20" style={{ backgroundColor: "#006600" }}>
        <div className="p-6 flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl">
            <GraduationCap className="h-8 w-8" style={{ color: "#006600" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Elimu Analytics</h1>
            <p className="text-green-200 text-xs font-medium uppercase tracking-wider mt-0.5">JSS Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl font-semibold transition-colors border border-white/20 shadow-sm">
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-green-100 hover:bg-white/10 hover:text-white transition-colors">
            <Users className="h-5 w-5 opacity-80" />
            Classes
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-green-100 hover:bg-white/10 hover:text-white transition-colors">
            <BookOpen className="h-5 w-5 opacity-80" />
            Learning Areas
          </a>
        </nav>

        <div className="p-4 mt-auto">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-green-100 hover:bg-white/10 hover:text-white transition-colors">
            <Settings className="h-5 w-5 opacity-80" />
            Settings
          </a>
          <div className="mt-4 pt-4 border-t border-green-800/50 flex items-center gap-3 px-4 pb-2">
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarImage src="https://i.pravatar.cc/150?u=teacher" />
              <AvatarFallback className="bg-green-800 text-white">TR</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">Teacher Jane</p>
              <p className="text-xs text-green-200 truncate">Admin</p>
            </div>
            <button className="text-green-200 hover:text-white transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between bg-white border-b border-slate-100 shadow-sm z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Welcome back, Jane! 👋</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Here's what's happening across your classes today.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search students, exams..." 
                className="pl-10 w-64 bg-slate-50 border-transparent focus-visible:ring-emerald-500 rounded-full font-medium"
              />
            </div>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-full hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat, i) => (
                <div key={i} className={"relative overflow-hidden rounded-3xl bg-gradient-to-br " + stat.gradient + " p-6 text-white shadow-xl " + stat.shadow + " transform transition-transform hover:-translate-y-1"}>
                  {/* Decorative circles */}
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                  
                  <div className="relative z-10 flex justify-between items-start">
                    <div>
                      <p className="text-white/80 font-semibold mb-1">{stat.title}</p>
                      <h3 className="text-5xl font-extrabold tracking-tight">{stat.value}</h3>
                    </div>
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                      <stat.icon className="h-7 w-7 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Exams */}
              <div className="lg:col-span-1 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">Recent Exams</h3>
                  <Button variant="ghost" className="text-emerald-600 font-semibold hover:text-emerald-700 hover:bg-emerald-50 rounded-full">View All</Button>
                </div>
                
                <div className="space-y-4">
                  {recentExams.map((exam) => (
                    <div key={exam.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-slate-800 text-lg leading-tight">{exam.name}</h4>
                        <Badge variant={exam.status === "ACTIVE" ? "default" : "secondary"} 
                          className={`font-bold px-2.5 py-0.5 rounded-md ${
                            exam.status === 'ACTIVE' 
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-0'
                          }`}>
                          {exam.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center text-sm text-slate-500 font-medium mb-4 gap-4">
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {exam.date}</span>
                        <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {exam.participants}</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="text-sm font-semibold text-slate-600">
                          Avg: <span className="text-slate-800 font-bold">{exam.avgScore}</span>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-full font-bold border-slate-200 hover:bg-slate-50">
                          Details <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Performers */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">Top Performers</h3>
                  <Button variant="ghost" className="text-emerald-600 font-semibold hover:text-emerald-700 hover:bg-emerald-50 rounded-full">Full Leaderboard</Button>
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
                        <TableRow key={student.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-bold py-4">
                            {i === 0 && <span className="text-2xl">🥇</span>}
                            {i === 1 && <span className="text-2xl">🥈</span>}
                            {i === 2 && <span className="text-2xl">🥉</span>}
                            {i > 2 && <span className="text-slate-400 pl-2 text-lg">{i + 1}</span>}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${student.color}`}>
                                {student.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="font-bold text-slate-800">{student.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <span className="font-bold text-slate-700">{student.marks}</span>
                            <span className="text-slate-400 text-xs ml-1">/500</span>
                          </TableCell>
                          <TableCell className="text-right py-4 font-bold text-slate-700">
                            {student.avg}%
                          </TableCell>
                          <TableCell className="text-right py-4 pr-6">
                            <Badge className={`font-bold px-3 py-1 text-sm rounded-lg border-0 shadow-sm ${
                              student.grade.startsWith('E') ? 'bg-emerald-500 text-white hover:bg-emerald-600' :
                              student.grade.startsWith('M') ? 'bg-amber-400 text-white hover:bg-amber-500' :
                              'bg-rose-500 text-white hover:bg-rose-600'
                            }`}>
                              {student.grade}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* CBC Guide */}
                <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 flex items-start gap-4">
                  <div className="bg-indigo-100 p-2 rounded-xl mt-1">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-900 mb-1">CBC Grading System Guide</h4>
                    <p className="text-sm text-indigo-700 font-medium leading-relaxed">
                      <strong>EE</strong> (Exceeding Expectation), <strong>ME</strong> (Meeting Expectation), 
                      <strong>AE</strong> (Approaching Expectation), <strong>BE</strong> (Below Expectation). 
                      The suffix 1 or 2 indicates the upper or lower band of the grade.
                    </p>
                  </div>
                </div>
                
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}

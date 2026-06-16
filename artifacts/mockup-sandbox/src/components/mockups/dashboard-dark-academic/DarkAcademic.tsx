import React from "react";
import { BookOpen, Users, GraduationCap, LayoutDashboard, Settings, Bell, Search, Trophy, History } from "lucide-react";
import "./_group.css";

const MOCK_TOP_STUDENTS = [
  { id: 1, name: "Wanjiku Njoroge", marks: 485, avg: 97.0, grade: "EE2", trend: "+2" },
  { id: 2, name: "Ochieng Omondi", marks: 478, avg: 95.6, grade: "EE2", trend: "+1" },
  { id: 3, name: "Kamau Mwangi", marks: 462, avg: 92.4, grade: "EE1", trend: "-1" },
  { id: 4, name: "Otieno Ouma", marks: 445, avg: 89.0, grade: "EE1", trend: "0" },
  { id: 5, name: "Mutua Mumbua", marks: 420, avg: 84.0, grade: "ME2", trend: "+3" },
];

const MOCK_RECENT_EXAMS = [
  { id: 1, name: "Term 2 Mid-Term", date: "15 Oct 2024", status: "CLOSED", classes: 3 },
  { id: 2, name: "Term 2 End-Term", date: "28 Nov 2024", status: "ACTIVE", classes: 3 },
  { id: 3, name: "County Mock Exam", date: "05 Dec 2024", status: "UPCOMING", classes: 3 },
];

export function DarkAcademic() {
  return (
    <div className="dark-academic-theme min-h-screen flex bg-[#020617] text-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col relative z-10">
        <div className="p-6 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-3 text-amber-500">
            <BookOpen size={28} className="drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <h1 className="da-heading text-2xl font-bold tracking-wide text-amber-50">Elimu</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1 da-heading italic tracking-wider">ANALYTICS</p>
        </div>

        <nav className="flex-1 py-6 px-3 flex flex-col gap-2">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active />
          <NavItem icon={<Users size={18} />} label="Classes" />
          <NavItem icon={<GraduationCap size={18} />} label="Learning Areas" />
          <div className="my-4 border-t border-slate-800 mx-3"></div>
          <NavItem icon={<Settings size={18} />} label="Settings" />
        </nav>

        <div className="p-4 m-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center text-amber-500 da-heading text-xl font-bold">
              JSS
            </div>
            <div>
              <p className="text-sm font-medium">Nairobi Academy</p>
              <p className="text-xs text-slate-400">Term 2, 2024</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-slate-800/50 bg-[#020617]/80 backdrop-blur">
          <h2 className="da-heading text-2xl font-semibold text-slate-200">Institution Overview</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search students, classes..." 
                className="bg-slate-900 border border-slate-800 rounded-full pl-10 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500/50 w-64 transition-colors"
              />
            </div>
            <button className="text-slate-400 hover:text-amber-500 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_5px_rgba(245,158,11,1)]"></span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-8">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <StatCard title="Total Students" value="20" icon={<Users size={24} />} trend="+2 this term" />
            <StatCard title="Total Classes" value="3" icon={<LayoutDashboard size={24} />} trend="JSS 1, 2, 3" />
            <StatCard title="Total Exams" value="3" icon={<History size={24} />} trend="1 Active" />
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Top Performers */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="da-heading text-xl font-medium flex items-center gap-2">
                  <Trophy size={20} className="text-amber-500" /> 
                  Top Performers
                </h3>
                <span className="text-xs text-slate-400">Term 2 End-Term</span>
              </div>
              
              <div className="da-card rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-sm da-heading">
                      <th className="py-4 px-6 font-medium">Rank</th>
                      <th className="py-4 px-6 font-medium">Student Name</th>
                      <th className="py-4 px-6 font-medium text-right">Total Marks</th>
                      <th className="py-4 px-6 font-medium text-right">Avg %</th>
                      <th className="py-4 px-6 font-medium text-center">CBC Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {MOCK_TOP_STUDENTS.map((student, i) => (
                      <tr key={student.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="py-4 px-6 text-slate-500 da-mono">0{i + 1}</td>
                        <td className="py-4 px-6 font-medium text-slate-200 group-hover:text-amber-400 transition-colors">{student.name}</td>
                        <td className="py-4 px-6 text-right da-mono text-slate-300">{student.marks}</td>
                        <td className="py-4 px-6 text-right da-mono text-slate-300">{student.avg.toFixed(1)}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex px-3 py-1 rounded text-xs font-bold tracking-wider da-badge-${student.grade.toLowerCase()}`}>
                            {student.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Exams */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="da-heading text-xl font-medium">Recent Exams</h3>
                <button className="text-xs text-amber-500 hover:text-amber-400">View All</button>
              </div>

              <div className="flex flex-col gap-4">
                {MOCK_RECENT_EXAMS.map(exam => (
                  <div key={exam.id} className="da-card p-5 rounded-xl hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-slate-200">{exam.name}</h4>
                      <span className={`text-[10px] px-2 py-1 rounded font-bold tracking-wider ${
                        exam.status === 'ACTIVE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                        exam.status === 'CLOSED' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {exam.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                      <div className="text-xs text-slate-400">
                        <p>{exam.classes} Classes</p>
                      </div>
                      <div className="text-xs da-mono text-slate-500">{exam.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button 
      className={`da-nav-item flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-all border-l-2
        ${active 
          ? 'bg-slate-800/50 text-amber-500 border-amber-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]' 
          : 'text-slate-400 border-transparent hover:text-slate-200'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="da-stat-card rounded-xl p-6 border border-slate-800 shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-400 text-sm font-medium da-heading">{title}</h3>
        <div className="text-amber-500/80 p-2 bg-amber-500/10 rounded-lg">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-3">
        <p className="da-mono text-4xl font-light text-slate-100 tracking-tight">{value}</p>
        <span className="text-xs text-slate-500">{trend}</span>
      </div>
    </div>
  );
}

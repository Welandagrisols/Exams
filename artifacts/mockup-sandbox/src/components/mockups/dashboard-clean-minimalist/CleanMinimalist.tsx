import React from "react";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Settings,
  MoreHorizontal
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";

export function CleanMinimalist() {
  const stats = [
    { label: "Total Students", value: "20" },
    { label: "Total Classes", value: "3" },
    { label: "Total Exams", value: "3" }
  ];

  const recentExams = [
    { name: "Mid Term 1 - JSS 1", date: "Oct 12, 2023", status: "ACTIVE" },
    { name: "End Term 1 - JSS 2", date: "Jul 24, 2023", status: "CLOSED" },
    { name: "Mid Term 2 - JSS 3", date: "May 10, 2023", status: "CLOSED" },
  ];

  const topPerformers = [
    { rank: 1, name: "Wanjiku Mutua", marks: 450, avg: "90%", grade: "EE2" },
    { rank: 2, name: "Kamau Njoroge", marks: 435, avg: "87%", grade: "EE1" },
    { rank: 3, name: "Akinyi Omondi", marks: 420, avg: "84%", grade: "EE1" },
    { rank: 4, name: "Kipchoge Keino", marks: 400, avg: "80%", grade: "ME2" },
    { rank: 5, name: "Nyambura Mwangi", marks: 380, avg: "76%", grade: "ME1" },
  ];

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-white font-sans text-slate-900" style={{ fontFamily: 'Inter, sans-serif' }}>
        
        {/* Sidebar - Thin 64px icon-only rail */}
        <aside className="w-16 border-r border-slate-200 flex flex-col items-center py-6 bg-slate-50 shrink-0">
          <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-lg mb-8">
            E
          </div>
          
          <nav className="flex flex-col gap-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-2 text-emerald-600 bg-emerald-50 rounded-md">
                  <LayoutDashboard className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Dashboard</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <Users className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Classes</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <BookOpen className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Learning Areas</TooltipContent>
            </Tooltip>
          </nav>

          <div className="mt-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-10">
            
            <header className="mb-10">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-slate-500 mt-1">Elimu Analytics Overview</p>
            </header>

            {/* Stats Strip */}
            <div className="flex gap-16 border-b border-slate-200 pb-8 mb-12">
              {stats.map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-slate-500 text-sm uppercase tracking-wider mb-2">{stat.label}</span>
                  <span className="text-5xl font-bold tracking-tighter text-slate-900">{stat.value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              
              {/* Recent Exams */}
              <div className="lg:col-span-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-6">Recent Exams</h2>
                <div className="flex flex-col gap-6">
                  {recentExams.map((exam, i) => (
                    <div key={i} className="pl-4 border-l-2 border-emerald-600 py-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-slate-900">{exam.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                          exam.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {exam.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{exam.date}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Performers */}
              <div className="lg:col-span-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-6">Top Performers</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-12">#</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Student Name</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Marks</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Avg</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPerformers.map((student, i) => (
                        <tr key={i} className="even:bg-slate-50 group hover:bg-slate-100 transition-colors">
                          <td className="py-4 px-4 text-sm font-medium text-slate-400">{student.rank}</td>
                          <td className="py-4 px-4 text-sm font-medium text-slate-900">{student.name}</td>
                          <td className="py-4 px-4 text-sm text-slate-600 text-right">{student.marks}</td>
                          <td className="py-4 px-4 text-sm text-slate-600 text-right">{student.avg}</td>
                          <td className="py-4 px-4 text-right">
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded">
                              {student.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

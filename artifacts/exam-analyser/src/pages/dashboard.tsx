import { useGetDashboard } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Users, BookOpen, FileText, Award, Calendar, ChevronRight } from "lucide-react";

const STAT_CARDS = [
  { key: "totalStudents", label: "Total Students", icon: Users, gradient: "from-teal-400 to-emerald-500", shadow: "shadow-emerald-200" },
  { key: "totalClasses", label: "Total Classes", icon: BookOpen, gradient: "from-blue-400 to-indigo-500", shadow: "shadow-indigo-200" },
  { key: "totalExams", label: "Total Exams", icon: FileText, gradient: "from-violet-400 to-purple-500", shadow: "shadow-purple-200" },
  { key: "topPerformers", label: "Top Performers", icon: Award, gradient: "from-orange-400 to-amber-500", shadow: "shadow-amber-200" },
] as const;

const AVATAR_COLORS = [
  "bg-pink-100 text-pink-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
];

function gradeColor(grade: string) {
  if (grade.startsWith("EE")) return "bg-emerald-500 text-white border-0";
  if (grade.startsWith("ME")) return "bg-amber-400 text-white border-0";
  if (grade.startsWith("AE")) return "bg-orange-500 text-white border-0";
  return "bg-rose-500 text-white border-0";
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  const statValues: Record<string, number> = {
    totalStudents: dashboard?.totalStudents ?? 0,
    totalClasses: dashboard?.totalClasses ?? 0,
    totalExams: dashboard?.totalExams ?? 0,
    topPerformers: dashboard?.topPerformers?.length ?? 0,
  };

  return (
    <Layout>
      <Header title="Dashboard" />
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {STAT_CARDS.map(({ key, label, icon: Icon, gradient, shadow }) => (
              <div
                key={key}
                className={"relative overflow-hidden rounded-2xl bg-gradient-to-br " + gradient + " p-4 md:p-6 text-white shadow-lg " + shadow}
              >
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-white/80 text-xs font-semibold leading-tight">{label}</p>
                    <div className="bg-white/20 p-1.5 rounded-lg flex-shrink-0">
                      <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="h-8 w-10 bg-white/20 rounded animate-pulse" />
                  ) : (
                    <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">{statValues[key]}</h3>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

            {/* Recent Exams */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-bold text-slate-800">Recent Exams</h3>
                <Link href="/classes">
                  <Button variant="ghost" className="text-blue-600 font-semibold rounded-full text-sm px-3 h-8">View All</Button>
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
                </div>
              ) : dashboard?.recentExams && dashboard.recentExams.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.recentExams.map(exam => (
                    <Link key={exam.id} href={`/exams/${exam.id}/analytics`}>
                      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-slate-800 text-sm leading-tight pr-2 line-clamp-2">{exam.name}</h4>
                          <Badge className={exam.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700 border-0 font-bold text-[10px] shrink-0"
                            : "bg-slate-100 text-slate-600 border-0 font-bold text-[10px] shrink-0 uppercase"
                          }>{exam.status}</Badge>
                        </div>
                        <div className="flex items-center text-xs text-slate-500 gap-2 mb-2">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{exam.className}</span>
                          <span>· Term {exam.term}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                          <span className="text-xs font-medium text-slate-400">Year {exam.year}</span>
                          <span className="flex items-center gap-0.5 text-xs font-semibold text-blue-600">
                            Details <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center text-slate-500 text-sm">
                  No recent exams found.
                </div>
              )}
            </div>

            {/* Top Performers */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-bold text-slate-800">Top Performers</h3>
                <span className="text-xs text-slate-400 font-medium">Most recent exam</span>
              </div>

              {isLoading ? (
                <Skeleton className="h-64 w-full rounded-3xl" />
              ) : dashboard?.topPerformers && dashboard.topPerformers.length > 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  {dashboard.topPerformers.map((performer, i) => (
                    <div key={performer.student.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      {/* Medal / rank */}
                      <div className="w-8 text-center flex-shrink-0">
                        {i === 0 && <span className="text-xl leading-none">🥇</span>}
                        {i === 1 && <span className="text-xl leading-none">🥈</span>}
                        {i === 2 && <span className="text-xl leading-none">🥉</span>}
                        {i > 2 && <span className="text-slate-400 font-bold text-sm">{i + 1}</span>}
                      </div>

                      {/* Avatar */}
                      <div className={"w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 " + AVATAR_COLORS[i % AVATAR_COLORS.length]}>
                        {initials(performer.student.name)}
                      </div>

                      {/* Name + class — takes remaining space */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{performer.student.name}</p>
                        <p className="text-xs text-slate-400 truncate">{performer.student.className}</p>
                      </div>

                      {/* Average — hidden on very small screens */}
                      <div className="hidden sm:block text-right flex-shrink-0">
                        <p className="font-bold text-slate-700 text-sm">{Math.round(performer.averagePercentage)}%</p>
                        <p className="text-xs text-slate-400">{performer.totalMarks}/{performer.totalMaxMarks}</p>
                      </div>

                      {/* Grade badge */}
                      <Badge className={"font-bold px-2 py-0.5 text-xs rounded-lg flex-shrink-0 " + gradeColor(performer.overallGrade)}>
                        {performer.overallGrade}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center text-slate-500 text-sm">
                  No top performers yet. Add scores to an exam to see rankings.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

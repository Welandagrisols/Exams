import { useGetDashboard } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Users, BookOpen, FileText, Award, Calendar, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
      <div className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {STAT_CARDS.map(({ key, label, icon: Icon, gradient, shadow }) => (
              <div
                key={key}
                className={"relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br " + gradient + " p-5 md:p-6 text-white shadow-xl " + shadow}
              >
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2 md:mb-3">
                    <p className="text-white/80 text-xs md:text-sm font-semibold">{label}</p>
                    <div className="bg-white/20 p-1.5 md:p-2 rounded-xl">
                      <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="h-8 w-12 bg-white/20 rounded animate-pulse" />
                  ) : (
                    <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight">{statValues[key]}</h3>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

            {/* Recent Exams */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Recent Exams</h3>
                <Link href="/classes">
                  <Button variant="ghost" className="text-blue-600 font-semibold rounded-full text-sm px-3 h-8">View All</Button>
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
                </div>
              ) : dashboard?.recentExams && dashboard.recentExams.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.recentExams.map(exam => (
                    <Link key={exam.id} href={`/exams/${exam.id}/analytics`}>
                      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800 text-base leading-tight pr-2">{exam.name}</h4>
                          <Badge className={exam.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700 border-0 font-bold text-xs shrink-0"
                            : "bg-slate-100 text-slate-600 border-0 font-bold text-xs shrink-0"
                          }>{exam.status}</Badge>
                        </div>
                        <div className="flex items-center text-xs text-slate-500 gap-3 mb-3">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{exam.className}</span>
                          <span>Term {exam.term}</span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                          <span className="text-xs font-medium text-slate-500">Year {exam.year}</span>
                          <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">
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
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Top Performers</h3>
                <span className="text-xs text-slate-400 font-medium">Most recent exam</span>
              </div>

              {isLoading ? (
                <Skeleton className="h-64 w-full rounded-3xl" />
              ) : dashboard?.topPerformers && dashboard.topPerformers.length > 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/60">
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="w-14 font-bold text-slate-500 py-3 text-xs uppercase tracking-wide">Rank</TableHead>
                        <TableHead className="font-bold text-slate-500 py-3 text-xs uppercase tracking-wide">Student</TableHead>
                        <TableHead className="text-right font-bold text-slate-500 py-3 text-xs uppercase tracking-wide">Marks</TableHead>
                        <TableHead className="text-right font-bold text-slate-500 py-3 text-xs uppercase tracking-wide">Avg</TableHead>
                        <TableHead className="text-right font-bold text-slate-500 py-3 pr-5 text-xs uppercase tracking-wide">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboard.topPerformers.map((performer, i) => (
                        <TableRow key={performer.student.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-3 pl-4">
                            {i === 0 && <span className="text-xl">🥇</span>}
                            {i === 1 && <span className="text-xl">🥈</span>}
                            {i === 2 && <span className="text-xl">🥉</span>}
                            {i > 2 && <span className="text-slate-400 font-bold text-sm pl-1">{i + 1}</span>}
                          </TableCell>
                          <TableCell className="py-3">
                            <Link href={`/reports/${/* examId */0}/${performer.student.id}`}>
                              <div className="flex items-center gap-2.5 cursor-pointer">
                                <div className={"w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 " + AVATAR_COLORS[i % AVATAR_COLORS.length]}>
                                  {initials(performer.student.name)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{performer.student.name}</p>
                                  <p className="text-xs text-slate-400">{performer.student.className}</p>
                                </div>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <span className="font-bold text-slate-700 text-sm">{performer.totalMarks}</span>
                            <span className="text-slate-400 text-xs ml-1">/{performer.totalMaxMarks}</span>
                          </TableCell>
                          <TableCell className="text-right py-3 font-bold text-slate-700 text-sm">
                            {Math.round(performer.averagePercentage)}%
                          </TableCell>
                          <TableCell className="text-right py-3 pr-5">
                            <Badge className={"font-bold px-2.5 py-0.5 text-xs rounded-lg " + gradeColor(performer.overallGrade)}>
                              {performer.overallGrade}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center text-slate-500 text-sm">
                  No top performers available yet. Add scores to an exam to see rankings.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

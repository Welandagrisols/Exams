import { useMemo } from "react";
import { useGetDashboard } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Users, BookOpen, FileText, BarChart2, Calendar, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

const STAT_CARDS = [
  { key: "totalStudents", label: "Total Students", icon: Users, gradient: "from-teal-400 to-emerald-500", shadow: "shadow-emerald-200" },
  { key: "totalClasses", label: "Total Classes", icon: BookOpen, gradient: "from-blue-400 to-indigo-500", shadow: "shadow-indigo-200" },
  { key: "totalExams", label: "Total Exams", icon: FileText, gradient: "from-violet-400 to-purple-500", shadow: "shadow-purple-200" },
  { key: "totalActive", label: "Active Exams", icon: BarChart2, gradient: "from-orange-400 to-amber-500", shadow: "shadow-amber-200" },
] as const;

function gradeColor(grade: string | null | undefined) {
  if (!grade) return "bg-slate-100 text-slate-500 border-0";
  if (grade.startsWith("EE")) return "bg-emerald-500 text-white border-0";
  if (grade.startsWith("ME")) return "bg-amber-400 text-white border-0";
  if (grade.startsWith("AE")) return "bg-orange-500 text-white border-0";
  return "bg-rose-500 text-white border-0";
}

function gradePillColor(key: string) {
  if (key === "EE") return "bg-emerald-100 text-emerald-700 font-bold";
  if (key === "ME") return "bg-amber-100 text-amber-700 font-bold";
  if (key === "AE") return "bg-orange-100 text-orange-700 font-bold";
  return "bg-rose-100 text-rose-700 font-bold";
}

function TrendIcon({ sparkline }: { sparkline: { average: number }[] }) {
  if (sparkline.length < 2) return <Minus className="w-4 h-4 text-slate-300" />;
  const last = sparkline[sparkline.length - 1].average;
  const prev = sparkline[sparkline.length - 2].average;
  const diff = last - prev;
  if (diff > 1) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (diff < -1) return <TrendingDown className="w-4 h-4 text-rose-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

function TrendDiff({ sparkline }: { sparkline: { average: number }[] }) {
  if (sparkline.length < 2) return <span className="text-xs text-slate-400">—</span>;
  const last = sparkline[sparkline.length - 1].average;
  const prev = sparkline[sparkline.length - 2].average;
  const diff = Math.round((last - prev) * 10) / 10;
  if (diff > 0) return <span className="text-xs font-semibold text-emerald-600">+{diff}%</span>;
  if (diff < 0) return <span className="text-xs font-semibold text-rose-500">{diff}%</span>;
  return <span className="text-xs text-slate-400">→ flat</span>;
}

/* ─── Skeleton shapes ─────────────────────────────────────────────────────── */

function StatCardSkeleton({ gradient, shadow }: { gradient: string; shadow: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 md:p-6 shadow-lg", gradient, shadow)}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="h-3 w-20 bg-white/30 rounded animate-pulse" />
          <div className="bg-white/20 p-1.5 rounded-lg w-7 h-7 animate-pulse" />
        </div>
        <div className="h-8 w-12 bg-white/30 rounded animate-pulse" />
      </div>
    </div>
  );
}

function ClassSnapshotSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      {/* Header row */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="text-right space-y-1.5">
          <Skeleton className="h-7 w-14 ml-auto" />
          <Skeleton className="h-3 w-10 ml-auto" />
        </div>
      </div>
      {/* Sparkline placeholder */}
      <div className="px-2 h-16 flex items-end gap-1 pb-2">
        {[40, 60, 45, 70, 55, 80, 65].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-100 rounded-t animate-pulse"
            style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      {/* Grade pills */}
      <div className="px-5 pt-2 pb-3 flex gap-2">
        {[16, 12, 10].map((w, i) => (
          <Skeleton key={i} className="h-5 rounded-full" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      {/* Top student */}
      <div className="px-5 py-2.5 border-t border-slate-50 flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-5 w-10 rounded-lg" />
      </div>
      {/* Footer */}
      <div className="mt-auto grid grid-cols-2 border-t border-slate-50 divide-x divide-slate-50">
        <div className="py-3 flex justify-center"><Skeleton className="h-3.5 w-14" /></div>
        <div className="py-3 flex justify-center"><Skeleton className="h-3.5 w-16" /></div>
      </div>
    </div>
  );
}

function ExamCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-14 rounded-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {STAT_CARDS.map(({ key, gradient, shadow }) => (
            <StatCardSkeleton key={key} gradient={gradient} shadow={shadow} />
          ))}
        </div>

        {/* Class snapshots */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <ClassSnapshotSkeleton key={i} />)}
          </div>
        </div>

        {/* Recent exams */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <ExamCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  const activeExams = dashboard?.recentExams?.filter(e => e.status === "ACTIVE").length ?? 0;

  const statValues: Record<string, number> = {
    totalStudents: dashboard?.totalStudents ?? 0,
    totalClasses: dashboard?.totalClasses ?? 0,
    totalExams: dashboard?.totalExams ?? 0,
    totalActive: activeExams,
  };

  return (
    <Layout>
      <Header title="Dashboard" />

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {STAT_CARDS.map(({ key, label, icon: Icon, gradient, shadow }) => (
                <div key={key} className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 md:p-6 text-white shadow-lg", gradient, shadow)}>
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-white/80 text-xs font-semibold leading-tight">{label}</p>
                      <div className="bg-white/20 p-1.5 rounded-lg flex-shrink-0">
                        <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                    <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">{statValues[key]}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Class Snapshots */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-800">Class Performance</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Latest exam average · trend across all exams</p>
                </div>
                <Link href="/classes">
                  <Button variant="ghost" className="text-blue-600 font-semibold rounded-full text-sm px-3 h-8">All Classes</Button>
                </Link>
              </div>

              {dashboard?.classSnapshots && dashboard.classSnapshots.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboard.classSnapshots.map(snap => {
                    const hasData = snap.sparkline.length > 0;
                    const grades = snap.latestGrades;
                    const totalGraded = (grades?.EE ?? 0) + (grades?.ME ?? 0) + (grades?.AE ?? 0) + (grades?.BE ?? 0);

                    return (
                      <div key={snap.classId} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800 text-lg leading-tight">{snap.className}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">{snap.studentCount} students</p>
                          </div>
                          <div className="text-right">
                            {hasData ? (
                              <>
                                <p className="text-2xl font-extrabold text-slate-800">{snap.latestAverage}%</p>
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  <TrendIcon sparkline={snap.sparkline} />
                                  <TrendDiff sparkline={snap.sparkline} />
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-slate-400 font-medium">No data yet</p>
                            )}
                          </div>
                        </div>

                        <div className="px-2 h-16">
                          {hasData ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={snap.sparkline} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                                <Tooltip
                                  formatter={(v: number) => [`${v}%`, "Avg"]}
                                  labelFormatter={(_: unknown, payload: { payload?: { examName?: string } }[]) => payload?.[0]?.payload?.examName ?? ""}
                                  contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="average"
                                  stroke="#1e3a5f"
                                  strokeWidth={2.5}
                                  dot={{ r: 3.5, fill: "#1e3a5f", strokeWidth: 2, stroke: "white" }}
                                  activeDot={{ r: 5 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <p className="text-xs text-slate-300">No exams scored yet</p>
                            </div>
                          )}
                        </div>

                        {hasData && totalGraded > 0 && (
                          <div className="px-5 pt-2 pb-3 flex gap-2 flex-wrap">
                            {(["EE", "ME", "AE", "BE"] as const).map(g => (
                              grades[g] > 0 && (
                                <span key={g} className={cn("text-xs px-2 py-0.5 rounded-full", gradePillColor(g))}>
                                  {g} · {grades[g]}
                                </span>
                              )
                            ))}
                          </div>
                        )}

                        {snap.topStudentName && (
                          <div className="px-5 py-2 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base leading-none">🏅</span>
                              <span className="text-xs font-semibold text-slate-600 truncate">{snap.topStudentName}</span>
                            </div>
                            {snap.topStudentGrade && (
                              <Badge className={cn("font-bold px-2 py-0.5 text-xs rounded-lg flex-shrink-0", gradeColor(snap.topStudentGrade))}>
                                {snap.topStudentGrade}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="mt-auto grid grid-cols-2 border-t border-slate-50 divide-x divide-slate-50">
                          <Link href={`/trends/class/${snap.classId}`} className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                            <TrendingUp className="w-3.5 h-3.5" /> Trends
                          </Link>
                          {snap.latestExamId ? (
                            <Link href={`/exams/${snap.latestExamId}/analytics`} className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                              <BarChart2 className="w-3.5 h-3.5" /> Analytics <ChevronRight className="w-3 h-3" />
                            </Link>
                          ) : (
                            <Link href={`/classes/${snap.classId}/exams`} className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                              <BookOpen className="w-3.5 h-3.5" /> Exams
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center text-slate-500 text-sm">
                  No classes yet. <Link href="/classes" className="text-blue-600 font-semibold hover:underline">Add a class to get started.</Link>
                </div>
              )}
            </div>

            {/* Recent Exams */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base md:text-lg font-bold text-slate-800">Recent Exams</h3>
                <Link href="/classes">
                  <Button variant="ghost" className="text-blue-600 font-semibold rounded-full text-sm px-3 h-8">View All</Button>
                </Link>
              </div>

              {dashboard?.recentExams && dashboard.recentExams.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dashboard.recentExams.map(exam => (
                    <Link key={exam.id} href={`/exams/${exam.id}/analytics`}>
                      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={exam.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700 border-0 font-bold text-[10px] shrink-0 uppercase"
                              : "bg-slate-100 text-slate-500 border-0 font-bold text-[10px] shrink-0 uppercase"
                            }>{exam.status}</Badge>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight truncate">{exam.name}</h4>
                          <div className="flex items-center text-xs text-slate-400 gap-2 mt-1">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{exam.className}</span>
                            <span>· T{exam.term} {exam.year}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
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

          </div>
        </div>
      )}
    </Layout>
  );
}

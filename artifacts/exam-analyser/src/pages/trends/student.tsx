import { useGetStudentTrends } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useRoute, Link } from "wouter";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart,
} from "recharts";

const SUBJECT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

function gradeColor(grade: string) {
  if (grade.startsWith("EE")) return "bg-emerald-500 text-white border-0";
  if (grade.startsWith("ME")) return "bg-amber-400 text-white border-0";
  if (grade.startsWith("AE")) return "bg-orange-500 text-white border-0";
  return "bg-rose-500 text-white border-0";
}

type View = "overall" | "subjects";

export default function StudentTrendsPage() {
  const [, params] = useRoute("/trends/student/:studentId");
  const studentId = parseInt(params?.studentId || "0");
  const [view, setView] = useState<View>("overall");

  const { data, isLoading } = useGetStudentTrends(studentId, { query: { enabled: !!studentId } });

  const chartData = data?.exams.map(e => {
    const point: Record<string, string | number> = {
      label: `T${e.term} ${e.year}`,
      examId: e.examId,
      examName: e.examName,
      Overall: Math.round(e.averagePercentage),
    };
    for (const s of e.subjects) {
      point[s.abbreviation] = Math.round(s.percentage);
    }
    return point;
  }) ?? [];

  const subjectKeys = data?.exams[0]?.subjects.map(s => s.abbreviation) ?? [];
  const hasData = chartData.length >= 1;

  return (
    <Layout>
      <Header
        title="Student Trends"
        breadcrumbs={[
          { label: data?.student.name ?? `Student ${studentId}`, href: "#" },
          { label: "Performance History" },
        ]}
      />

      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Student summary card */}
          {data && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                {data.student.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">{data.student.name}</h2>
                <p className="text-sm text-slate-500">{data.student.className} · Adm: {data.student.admissionNo}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-400 font-medium">Exams recorded</p>
                <p className="text-2xl font-extrabold text-slate-800">{data.exams.length}</p>
              </div>
            </div>
          )}

          {/* Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("overall")}
              className={"px-4 py-2 rounded-full text-sm font-semibold transition-all " +
                (view === "overall" ? "bg-[#1e3a5f] text-white shadow" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}
            >
              Overall Progress
            </button>
            <button
              onClick={() => setView("subjects")}
              className={"px-4 py-2 rounded-full text-sm font-semibold transition-all " +
                (view === "subjects" ? "bg-[#1e3a5f] text-white shadow" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}
            >
              By Subject
            </button>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">
              {view === "overall" ? "Overall Average — Exam by Exam" : "Subject Performance — Exam by Exam"}
            </h2>
            <p className="text-sm text-slate-500 mb-6">Showing % scores across all recorded exams</p>

            {isLoading ? (
              <Skeleton className="h-72 w-full rounded-2xl" />
            ) : !hasData ? (
              <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
                No exam scores recorded yet for this student.
              </div>
            ) : view === "overall" ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                  <defs>
                    <linearGradient id="overallGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Average"]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.examName ?? label}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4" />
                  <Area
                    type="monotone"
                    dataKey="Overall"
                    stroke="#1e3a5f"
                    strokeWidth={3}
                    fill="url(#overallGrad)"
                    dot={{ r: 5, fill: "#1e3a5f", strokeWidth: 2, stroke: "white" }}
                    activeDot={{ r: 7 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.examName ?? label}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4" />
                  {subjectKeys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2, stroke: "white" }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Per-exam history table */}
          {hasData && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50">
                <h3 className="font-bold text-slate-800">Exam History</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {data?.exams.map(e => (
                  <div key={e.examId} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/reports/${e.examId}/${studentId}`} className="font-bold text-slate-800 hover:text-blue-600 transition-colors text-sm truncate block">
                        {e.examName}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">Term {e.term} · {e.year}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-slate-700 text-sm">{e.averagePercentage}%</p>
                      <p className="text-xs text-slate-400">{e.totalMarks}/{e.totalMaxMarks}</p>
                    </div>
                    <Badge className={"font-bold px-2.5 py-0.5 text-xs rounded-lg flex-shrink-0 " + gradeColor(e.overallGrade)}>
                      {e.overallGrade}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

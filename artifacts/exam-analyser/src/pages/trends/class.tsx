import { useGetClassTrends, useListClasses } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoute, Link } from "wouter";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

const SUBJECT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

function shortExamLabel(name: string, term: number, year: number) {
  const shortened = name.replace(/examination/i, "Exam").replace(/end[\s-]term/i, "End").replace(/mid[\s-]term/i, "Mid").replace(/opener/i, "Opener");
  return `T${term} ${shortened.split(" ").slice(0, 3).join(" ")}`;
}

type View = "overall" | "subjects";

export default function ClassTrendsPage() {
  const [, params] = useRoute("/trends/class/:classId");
  const classId = parseInt(params?.classId || "0");
  const [view, setView] = useState<View>("overall");

  const { data, isLoading } = useGetClassTrends(classId, { query: { enabled: !!classId } });
  const { data: classes } = useListClasses();
  const cls = classes?.find(c => c.id === classId);

  const chartData = data?.exams.map(e => {
    const point: Record<string, string | number> = {
      label: shortExamLabel(e.examName, e.term, e.year),
      examId: e.examId,
      Overall: Math.round(e.classAverage),
    };
    for (const la of e.learningAreas) {
      point[la.abbreviation] = Math.round(la.average);
    }
    return point;
  }) ?? [];

  const subjectKeys = data?.exams[0]?.learningAreas.map(la => la.abbreviation) ?? [];

  const hasData = chartData.length >= 1;

  return (
    <Layout>
      <Header
        title="Class Trends"
        breadcrumbs={[
          { label: "Classes", href: "/classes" },
          { label: cls?.name ?? `Class ${classId}` },
          { label: "Trends" },
        ]}
      />

      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("overall")}
              className={"px-4 py-2 rounded-full text-sm font-semibold transition-all " +
                (view === "overall" ? "bg-[#1e3a5f] text-white shadow" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}
            >
              Overall Average
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
              {view === "overall" ? "Class Average Across Exams" : "Per-Subject Averages Across Exams"}
            </h2>
            <p className="text-sm text-slate-500 mb-6">Showing % average scores — all exams for {data?.className}</p>

            {isLoading ? (
              <Skeleton className="h-72 w-full rounded-2xl" />
            ) : !hasData ? (
              <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
                No exam scores recorded yet for this class.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4" />
                  {view === "overall" ? (
                    <Line
                      type="monotone"
                      dataKey="Overall"
                      stroke="#1e3a5f"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#1e3a5f", strokeWidth: 2, stroke: "white" }}
                      activeDot={{ r: 7 }}
                    />
                  ) : (
                    subjectKeys.map((key, i) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2, stroke: "white" }}
                        activeDot={{ r: 6 }}
                      />
                    ))
                  )}
                  {view === "subjects" && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Per-exam summary table */}
          {hasData && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50">
                <h3 className="font-bold text-slate-800">Exam Summary</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/60 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-6 py-3 text-left font-bold">Exam</th>
                      <th className="px-4 py-3 text-center font-bold">Term</th>
                      <th className="px-4 py-3 text-center font-bold">Year</th>
                      <th className="px-4 py-3 text-right font-bold">Class Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.exams.map(e => (
                      <tr key={e.examId} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <Link href={`/exams/${e.examId}/analytics`} className="font-semibold text-blue-600 hover:underline">
                            {e.examName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">Term {e.term}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{e.year}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{e.classAverage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

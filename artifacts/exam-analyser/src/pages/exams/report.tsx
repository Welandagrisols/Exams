import { useGetReport, useUpdateReport, getGetReportQueryKey, useGetSchool } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { getRubricColor, formatDate, getRubricHexColor } from "@/lib/utils";
import { Printer, Save, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell,
  LineChart, Line, Legend, Tooltip, ComposedChart, Area,
} from 'recharts';
import { authFetch } from "@/lib/supabase";

export default function StudentReport() {
  const [, params] = useRoute("/reports/:examId/:studentId");
  const examId = parseInt(params?.examId || "0");
  const studentId = parseInt(params?.studentId || "0");
  
  const { data: report, isLoading } = useGetReport(examId, studentId, { 
    query: { enabled: !!examId && !!studentId, queryKey: getGetReportQueryKey(examId, studentId) } 
  });

  const { data: school } = useGetSchool();

  // Fetch full historical trends to power the performance trajectory graph
  const { data: trends } = useQuery({
    queryKey: ["trends", "student", studentId],
    queryFn: async () => {
      const res = await authFetch(`/api/trends/student/${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch trends");
      return res.json();
    },
    enabled: !!studentId,
  });
  
  const [teacherComment, setTeacherComment] = useState("");
  const [principalComment, setPrincipalComment] = useState("");
  const initRef = useRef(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateReport = useUpdateReport();

  useEffect(() => {
    if (report && !initRef.current) {
      setTeacherComment(report.teacherComment || "");
      setPrincipalComment(report.principalComment || "");
      initRef.current = true;
    }
  }, [report]);

  const handleSaveComments = async () => {
    try {
      await updateReport.mutateAsync({
        examId,
        studentId,
        data: { teacherComment, principalComment }
      });
      toast({ title: "Comments saved successfully" });
      queryClient.setQueryData(getGetReportQueryKey(examId, studentId), (old: any) => 
        old ? { ...old, teacherComment, principalComment } : old
      );
    } catch (error) {
      toast({ title: "Failed to save comments", variant: "destructive" });
    }
  };

  // Build trend chart data from historical exams
  const trendData = (trends?.exams ?? []).map((e: any) => ({
    label: `T${e.term} ${e.year}`,
    student: Math.round(e.averagePercentage * 10) / 10,
    class: e.classAverage != null ? Math.round(e.classAverage * 10) / 10 : null,
  }));

  if (isLoading) {
    return (
      <Layout>
        <Header title="Student Report" />
        <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-4">
          <Skeleton className="h-[800px] w-full" />
        </div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout>
        <Header title="Student Report" />
        <div className="p-4 md:p-8 max-w-4xl mx-auto w-full text-center py-20 text-muted-foreground">
          Report not found.
        </div>
      </Layout>
    );
  }

  const photoUrl = report.student.photoUrl;

  return (
    <Layout>
      <Header 
        title="Student Report" 
        breadcrumbs={[
          { label: "Rankings", href: `/exams/${examId}/rankings` },
          { label: report.student.name }
        ]}
      />
      
      <div className="p-4 md:p-8 max-w-4xl mx-auto w-full pb-20 print:p-0 print:max-w-none">
        
        <div className="flex justify-end mb-6 print:hidden gap-3">
          <Button variant="outline" asChild>
            <a href={`/trends/student/${studentId}`}>
              <TrendingUp className="w-4 h-4 mr-2" /> View Trends
            </a>
          </Button>
          <Button variant="outline" onClick={handleSaveComments} disabled={updateReport.isPending}>
            {updateReport.isPending ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Comments</>}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print Report
          </Button>
        </div>

        {/* Report Card */}
        <div className="bg-white text-black print:text-black border rounded-xl print:rounded-none print:border-none shadow-sm print:shadow-none overflow-hidden report-container">
          
          {/* Header */}
          <div className="p-6 md:p-10 border-b text-center space-y-2 bg-slate-50 print:bg-transparent">
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900">{report.school.name}</h1>
            {report.school.address && <p className="text-slate-600 font-medium">{report.school.address}</p>}
            {report.school.motto && <p className="text-primary font-bold italic tracking-wide mt-2">"{report.school.motto}"</p>}
            
            <div className="mt-8 pt-6 border-t-2 border-slate-200">
              <h2 className="text-2xl font-bold uppercase tracking-wider text-slate-800">Termly Performance Report</h2>
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-3 font-medium text-slate-700">
                <span><strong className="text-slate-900">EXAM:</strong> {report.exam.name}</span>
                <span><strong className="text-slate-900">TERM:</strong> {report.exam.term}</span>
                <span><strong className="text-slate-900">YEAR:</strong> {report.exam.year}</span>
                {(() => {
                  const t = report.exam.term;
                  const start = t === 1 ? school?.term1StartDate : t === 2 ? school?.term2StartDate : school?.term3StartDate;
                  const end   = t === 1 ? school?.term1EndDate   : t === 2 ? school?.term2EndDate   : school?.term3EndDate;
                  if (!start && !end) return null;
                  return (
                    <span>
                      <strong className="text-slate-900">TERM DATES:</strong>{" "}
                      {start ? formatDate(start) : "—"}&nbsp;–&nbsp;{end ? formatDate(end) : "—"}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Student Info — with passport photo slot */}
          <div className="p-6 md:px-10 py-6 border-b bg-white flex gap-6">
            {/* Photo slot */}
            <div className="flex-shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={report.student.name}
                  className="w-24 h-28 object-cover rounded border-2 border-slate-200 bg-slate-50"
                />
              ) : (
                <div className="w-24 h-28 border-2 border-dashed border-slate-300 rounded bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-center">
                  <svg className="w-8 h-8 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs font-medium">Photo</span>
                </div>
              )}
            </div>

            {/* Student fields */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
              <div>
                <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Student Name</div>
                <div className="font-bold text-lg text-slate-900">{report.student.name}</div>
              </div>
              <div>
                <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Admission No</div>
                <div className="font-bold text-lg text-slate-900">{report.student.admissionNo}</div>
              </div>
              <div>
                <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Class</div>
                <div className="font-bold text-lg text-slate-900">{report.student.className}</div>
              </div>
              <div>
                <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Class Rank</div>
                <div className="font-bold text-lg text-slate-900">
                  {report.rank} <span className="text-slate-500 text-sm font-medium">out of {report.classSize}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Marks Table */}
          <div className="p-6 md:px-10 bg-white">
            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center border-b pb-2">Academic Performance</h3>
            <table className="w-full text-sm border-collapse border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="border border-slate-200 px-4 py-3 text-left">Learning Area</th>
                  <th className="border border-slate-200 px-4 py-3 text-center">Marks</th>
                  <th className="border border-slate-200 px-4 py-3 text-center">%</th>
                  <th className="border border-slate-200 px-4 py-3 text-center">CBC Grade</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {report.subjects.map(sub => (
                  <tr key={sub.learningAreaId} className="even:bg-slate-50">
                    <td className="border border-slate-200 px-4 py-2.5 font-semibold">{sub.learningAreaName}</td>
                    <td className="border border-slate-200 px-4 py-2.5 text-center font-mono">
                      {sub.marks} <span className="text-slate-400 text-xs">/ {sub.maxMarks}</span>
                    </td>
                    <td className="border border-slate-200 px-4 py-2.5 text-center font-mono font-medium">
                      {sub.percentage.toFixed(0)}%
                    </td>
                    <td className="border border-slate-200 px-4 py-2.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${getRubricColor(sub.rubricGrade)}`}>
                        {sub.rubricGrade}
                      </span>
                    </td>
                  </tr>
                ))}
                
                {/* Total Row */}
                <tr className="bg-slate-800 text-white font-bold text-base">
                  <td className="border border-slate-700 px-4 py-3 uppercase tracking-wider">Overall Performance</td>
                  <td className="border border-slate-700 px-4 py-3 text-center font-mono">
                    {report.totalMarks} <span className="text-slate-400 text-sm">/ {report.totalMaxMarks}</span>
                  </td>
                  <td className="border border-slate-700 px-4 py-3 text-center font-mono text-amber-400">
                    {report.averagePercentage.toFixed(1)}%
                  </td>
                  <td className="border border-slate-700 px-4 py-3 text-center text-amber-400">
                    {report.overallGrade}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Subject bar chart — screen only */}
          <div className="px-6 md:px-10 pb-4 print:hidden">
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.subjects} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="abbreviation" tickLine={false} axisLine={false} fontSize={10} tick={{fill: '#64748b'}} />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} tick={{fill: '#64748b'}} domain={[0, 100]} />
                  <Bar dataKey="percentage" radius={[2, 2, 0, 0]} maxBarSize={40}>
                    {report.subjects.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getRubricHexColor(entry.rubricGrade)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Trajectory — student vs class average across all terms/grades */}
          {trendData.length > 1 && (
            <div className="px-6 md:px-10 pb-6 border-t pt-6">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                Performance Trajectory — Grade 7 to 9
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} tick={{fill: '#64748b'}} />
                    <YAxis tickLine={false} axisLine={false} fontSize={10} tick={{fill: '#64748b'}} domain={[0, 100]} />
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value}%`, name === "student" ? report.student.name : "Class Average"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend
                      formatter={(value) => value === "student" ? report.student.name : "Class Average"}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    {/* Class average — shaded area */}
                    {trendData.some((d: any) => d.class != null) && (
                      <Area
                        type="monotone"
                        dataKey="class"
                        fill="#e2e8f0"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        dot={false}
                        name="class"
                        connectNulls
                      />
                    )}
                    {/* Student line */}
                    <Line
                      type="monotone"
                      dataKey="student"
                      stroke="#1e3a5f"
                      strokeWidth={2.5}
                      dot={{ fill: "#1e3a5f", r: 4 }}
                      activeDot={{ r: 6 }}
                      name="student"
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-400 mt-1 text-center">
                Tracks average % across all terms — solid line is {report.student.name}, shaded area is class average
              </p>
            </div>
          )}

          {/* Printable performance trajectory */}
          {trendData.length > 1 && (
            <div className="hidden print:block px-10 pb-6 border-t pt-4">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Performance Trajectory</div>
              <table className="w-full text-xs border-collapse border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-200 px-3 py-1.5 text-left">Term</th>
                    <th className="border border-slate-200 px-3 py-1.5 text-center">Student %</th>
                    <th className="border border-slate-200 px-3 py-1.5 text-center">Class Avg %</th>
                  </tr>
                </thead>
                <tbody>
                  {trendData.map((row: any) => (
                    <tr key={row.label} className="even:bg-slate-50">
                      <td className="border border-slate-200 px-3 py-1.5 font-medium">{row.label}</td>
                      <td className="border border-slate-200 px-3 py-1.5 text-center font-mono">{row.student}%</td>
                      <td className="border border-slate-200 px-3 py-1.5 text-center font-mono text-slate-500">
                        {row.class != null ? `${row.class}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Comments Section */}
          <div className="p-6 md:px-10 py-6 border-t bg-slate-50 space-y-6 print:bg-transparent">
            
            <div>
              <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">Class Teacher's Remarks</div>
              <div className="print:hidden">
                <Textarea 
                  value={teacherComment}
                  onChange={(e) => setTeacherComment(e.target.value)}
                  placeholder="Enter remarks..."
                  className="bg-white border-slate-200 focus-visible:ring-slate-400 resize-none"
                  rows={3}
                />
              </div>
              <div className="hidden print:block min-h-[60px] border-b border-dashed border-slate-400 pb-2 text-slate-800 font-medium italic">
                {teacherComment || "........................................................................................................"}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">Principal's Remarks</div>
              <div className="print:hidden">
                <Textarea 
                  value={principalComment}
                  onChange={(e) => setPrincipalComment(e.target.value)}
                  placeholder="Enter remarks..."
                  className="bg-white border-slate-200 focus-visible:ring-slate-400 resize-none"
                  rows={3}
                />
              </div>
              <div className="hidden print:block min-h-[60px] border-b border-dashed border-slate-400 pb-2 text-slate-800 font-medium italic">
                {principalComment || "........................................................................................................"}
              </div>
              <div className="hidden print:block mt-6 text-slate-800 text-sm font-bold uppercase tracking-wider text-right">
                Signature & Stamp: ............................
              </div>
            </div>

          </div>

          {/* Footer Dates */}
          {(() => {
            const t = report.exam.term;
            const termStart = t === 1 ? school?.term1StartDate : t === 2 ? school?.term2StartDate : school?.term3StartDate;
            const termEnd   = t === 1 ? school?.term1EndDate   : t === 2 ? school?.term2EndDate   : school?.term3EndDate;
            const openLabel  = termStart ? "Term Opens" : "Opening Date";
            const closeLabel = termEnd   ? "Term Closes" : "Closing Date";
            const openVal    = termStart ? formatDate(termStart) : formatDate(report.exam.openingDate);
            const closeVal   = termEnd   ? formatDate(termEnd)   : formatDate(report.exam.closingDate);
            return (
              <div className="p-6 md:px-10 bg-slate-800 text-slate-300 text-sm font-medium flex justify-between print:bg-transparent print:text-slate-600 print:border-t">
                <div>
                  <span className="uppercase tracking-wider text-xs opacity-70 block mb-0.5">{closeLabel}</span>
                  <span className="text-white print:text-slate-900">{closeVal}</span>
                </div>
                {(termStart || termEnd) && (
                  <div className="text-center">
                    <span className="uppercase tracking-wider text-xs opacity-70 block mb-0.5">Term {t}</span>
                    <span className="text-white print:text-slate-900 text-xs">
                      {termStart ? formatDate(termStart) : "—"} – {termEnd ? formatDate(termEnd) : "—"}
                    </span>
                  </div>
                )}
                <div className="text-right">
                  <span className="uppercase tracking-wider text-xs opacity-70 block mb-0.5">{openLabel}</span>
                  <span className="text-white print:text-slate-900">{openVal}</span>
                </div>
              </div>
            );
          })()}

        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden; }
          .report-container, .report-container * { visibility: visible; }
          .report-container { position: absolute; left: 0; top: 0; width: 100%; }
          .bg-slate-800  { background-color: #1e293b !important; color: white !important; }
          .bg-slate-100  { background-color: #f1f5f9 !important; }
          .bg-slate-50   { background-color: #f8fafc !important; }
          .bg-green-100  { background-color: #dcfce7 !important; color: #166534 !important; }
          .text-green-800 { color: #166534 !important; }
          .bg-blue-100   { background-color: #dbeafe !important; color: #1e40af !important; }
          .text-blue-800  { color: #1e40af !important; }
          .bg-amber-100  { background-color: #fef3c7 !important; color: #92400e !important; }
          .text-amber-800 { color: #92400e !important; }
          .text-amber-400 { color: #f59e0b !important; }
          .bg-red-100    { background-color: #fee2e2 !important; color: #991b1b !important; }
          .text-red-800   { color: #991b1b !important; }
        }
      `}} />
    </Layout>
  );
}

import { useGetReport, useUpdateReport, getGetReportQueryKey } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { getRubricColor, formatDate, getRubricHexColor } from "@/lib/utils";
import { Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

export default function StudentReport() {
  const [, params] = useRoute("/reports/:examId/:studentId");
  const examId = parseInt(params?.examId || "0");
  const studentId = parseInt(params?.studentId || "0");
  
  const { data: report, isLoading } = useGetReport(examId, studentId, { 
    query: { enabled: !!examId && !!studentId, queryKey: getGetReportQueryKey(examId, studentId) } 
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
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div className="p-6 md:px-10 py-6 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 border-b bg-white">
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
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${getRubricColor(sub.rubricGrade)} print:border print:bg-transparent`}>
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

          {/* Chart */}
          <div className="px-6 md:px-10 pb-6 print:hidden">
             <div className="h-48 w-full">
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
          <div className="p-6 md:px-10 bg-slate-800 text-slate-300 text-sm font-medium flex justify-between print:bg-transparent print:text-slate-600 print:border-t">
            <div>
              <span className="uppercase tracking-wider text-xs opacity-70 block mb-0.5">Closing Date</span>
              <span className="text-white print:text-slate-900">{formatDate(report.exam.closingDate)}</span>
            </div>
            <div className="text-right">
              <span className="uppercase tracking-wider text-xs opacity-70 block mb-0.5">Opening Date</span>
              <span className="text-white print:text-slate-900">{formatDate(report.exam.openingDate)}</span>
            </div>
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .report-container, .report-container * {
            visibility: visible;
          }
          .report-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* Print exact colors for badges */
          .bg-green-100 { background-color: #dcfce7 !important; border-color: #bbf7d0 !important; color: #166534 !important; }
          .bg-blue-100 { background-color: #dbeafe !important; border-color: #bfdbfe !important; color: #1e40af !important; }
          .bg-amber-100 { background-color: #fef3c7 !important; border-color: #fde68a !important; color: #92400e !important; }
          .bg-red-100 { background-color: #fee2e2 !important; border-color: #fecaca !important; color: #991b1b !important; }
          .bg-slate-800 { background-color: #1e293b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .text-white { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />
    </Layout>
  );
}

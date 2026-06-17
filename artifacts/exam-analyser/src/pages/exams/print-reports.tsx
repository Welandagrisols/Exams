import { useRoute } from "wouter";
import { useEffect, useState } from "react";
import { getRubricColor, formatDate } from "@/lib/utils";
import { Printer, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Subject = {
  learningAreaId: number;
  learningAreaName: string;
  abbreviation: string;
  marks: number;
  maxMarks: number;
  rubricGrade: string;
  percentage: number;
};

type Report = {
  student: { id: number; name: string; admissionNo: string; className: string; gender: string | null };
  exam: { id: number; name: string; term: number; year: number; closingDate: string | null; openingDate: string | null };
  school: { name: string; address: string | null; motto: string | null };
  subjects: Subject[];
  totalMarks: number;
  totalMaxMarks: number;
  averagePercentage: number;
  overallGrade: string;
  rank: number;
  classSize: number;
  teacherComment: string | null;
  principalComment: string | null;
};

function ReportCard({ report }: { report: Report }) {
  return (
    <div className="bg-white text-black border rounded-xl print:rounded-none print:border-none shadow-sm print:shadow-none overflow-hidden report-card">
      <div className="p-6 md:p-10 border-b text-center space-y-2 bg-slate-50 print:bg-white">
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

      <div className="p-6 md:px-10 bg-white">
        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide mb-4 border-b pb-2">Academic Performance</h3>
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

      <div className="p-6 md:px-10 py-6 border-t bg-slate-50 print:bg-white space-y-6">
        <div>
          <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">Class Teacher's Remarks</div>
          <div className="min-h-[60px] border-b border-dashed border-slate-400 pb-2 text-slate-800 font-medium italic">
            {report.teacherComment || "........................................................................................................"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">Principal's Remarks</div>
          <div className="min-h-[60px] border-b border-dashed border-slate-400 pb-2 text-slate-800 font-medium italic">
            {report.principalComment || "........................................................................................................"}
          </div>
          <div className="mt-6 text-slate-800 text-sm font-bold uppercase tracking-wider text-right">
            Signature & Stamp: ............................
          </div>
        </div>
      </div>

      <div className="p-6 md:px-10 bg-slate-800 print:bg-white text-slate-300 print:text-slate-600 text-sm font-medium flex justify-between print:border-t">
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
  );
}

export default function PrintAllReports() {
  const [, params] = useRoute("/exams/:examId/print-reports");
  const examId = parseInt(params?.examId || "0");

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    if (!examId) return;
    fetch(`/api/reports/${examId}/all`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setReports(data);
        else setError(data.error ?? "Failed to load reports");
      })
      .catch(() => setError("Failed to load reports"))
      .finally(() => setLoading(false));
  }, [examId]);

  useEffect(() => {
    if (!loading && reports.length > 0 && !printed) {
      setPrinted(true);
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [loading, reports, printed]);

  return (
    <div>
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <span className="text-muted-foreground text-sm">|</span>
          {loading
            ? <span className="text-sm text-muted-foreground">Loading reports…</span>
            : <span className="text-sm font-medium">{reports.length} report{reports.length !== 1 ? "s" : ""} — sorted by rank</span>
          }
        </div>
        <Button onClick={() => window.print()} disabled={loading || reports.length === 0} className="gap-2">
          <Printer className="h-4 w-4" /> Print All Reports
        </Button>
      </div>

      {loading && (
        <div className="print:hidden flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-base font-medium">Loading all student reports…</p>
          <p className="text-sm">This may take a few seconds</p>
        </div>
      )}

      {error && (
        <div className="print:hidden flex items-center justify-center min-h-[60vh] text-red-500">
          {error}
        </div>
      )}

      {!loading && reports.length === 0 && !error && (
        <div className="print:hidden flex items-center justify-center min-h-[60vh] text-muted-foreground">
          No reports found. Make sure scores have been entered for this exam.
        </div>
      )}

      {/* All report cards — one per page when printed */}
      <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto print:p-0 print:max-w-none print:space-y-0">
        {reports.map((report, i) => (
          <div key={report.student.id} className={i < reports.length - 1 ? "print:break-after-page" : ""}>
            <ReportCard report={report} />
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .report-card, .report-card * { visibility: visible; }
          .bg-slate-800 { background-color: #1e293b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .text-white { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-green-100 { background-color: #dcfce7 !important; color: #166534 !important; }
          .bg-blue-100 { background-color: #dbeafe !important; color: #1e40af !important; }
          .bg-amber-100 { background-color: #fef3c7 !important; color: #92400e !important; }
          .bg-red-100 { background-color: #fee2e2 !important; color: #991b1b !important; }
        }
      `}} />
    </div>
  );
}

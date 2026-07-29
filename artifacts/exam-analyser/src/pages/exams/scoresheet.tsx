import { useGetExam, useListStudents, useListLearningAreas, getGetExamQueryKey } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function ScoreSheet() {
  const [, params] = useRoute("/exams/:examId/scoresheet");
  const examId = parseInt(params?.examId || "0");
  const [, navigate] = useLocation();

  const { data: exam, isLoading: loadingExam } = useGetExam(examId, { query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) } });
  const { data: students, isLoading: loadingStudents } = useListStudents(exam?.classId ? { classId: exam.classId } : undefined, { query: { enabled: !!exam?.classId } });
  const { data: subjects, isLoading: loadingSubjects } = useListLearningAreas();

  const isLoading = loadingExam || loadingStudents || loadingSubjects;

  return (
    <>
      {/* Print toolbar — hidden when printing */}
      <div className="print:hidden bg-background border-b p-4 flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/exams/${examId}/scores`)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Score Entry
        </Button>
        <div className="text-center">
          <h1 className="font-bold text-lg">Score Sheet</h1>
          {exam && <p className="text-sm text-muted-foreground">{exam.name} — {exam.className}</p>}
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Print Sheet
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 space-y-4 print:hidden">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      ) : (
        <div className="p-4 md:p-8 print:p-4 max-w-[297mm] mx-auto">
          {/* Sheet header */}
          <div className="text-center mb-6 print:mb-4">
            <h1 className="text-2xl font-bold print:text-xl uppercase tracking-wide">CLASS SCORE SHEET</h1>
            <div className="mt-2 grid grid-cols-3 text-sm gap-4 max-w-2xl mx-auto">
              <div className="text-left"><span className="font-semibold">Class:</span> <span className="underline">{exam?.className}</span></div>
              <div className="text-center"><span className="font-semibold">Exam:</span> <span className="underline">{exam?.name}</span></div>
              <div className="text-right"><span className="font-semibold">Term {exam?.term}, {exam?.year}</span></div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-4 p-3 border rounded text-xs text-muted-foreground print:text-black print:border-gray-400 bg-muted/30 print:bg-transparent">
            <strong>Instructions for teachers:</strong> Each subject teacher fills their column only. Write marks in the blank cells. Leave blank if absent. Class teacher collects and scans/photographs for upload.
          </div>

          {/* Score table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm print:text-xs">
              <thead>
                <tr>
                  <th className="border border-gray-400 px-2 py-2 bg-gray-100 print:bg-gray-200 text-left w-8">#</th>
                  <th className="border border-gray-400 px-2 py-2 bg-gray-100 print:bg-gray-200 text-left min-w-[160px]">Student Name</th>
                  <th className="border border-gray-400 px-2 py-2 bg-gray-100 print:bg-gray-200 text-center w-20">Adm No</th>
                  {subjects?.map(sub => (
                    <th key={sub.id} className="border border-gray-400 px-1 py-2 bg-gray-100 print:bg-gray-200 text-center min-w-[52px]">
                      <div className="font-bold">{sub.abbreviation}</div>
                      <div className="text-[10px] font-normal text-gray-500">/{sub.maxMarks}</div>
                    </th>
                  ))}
                  <th className="border border-gray-400 px-2 py-2 bg-gray-100 print:bg-gray-200 text-center w-16">Total</th>
                  <th className="border border-gray-400 px-2 py-2 bg-gray-100 print:bg-gray-200 text-center w-20">Remarks</th>
                </tr>
                {/* Subject teacher signature row */}
                <tr>
                  <td className="border border-gray-400 px-2 py-1 text-[10px] text-gray-400 bg-gray-50 print:bg-transparent" colSpan={3}>Subject Teacher Sign →</td>
                  {subjects?.map(sub => (
                    <td key={sub.id} className="border border-gray-400 px-1 py-3 bg-gray-50 print:bg-transparent"></td>
                  ))}
                  <td className="border border-gray-400" colSpan={2}></td>
                </tr>
              </thead>
              <tbody>
                {students?.map((student, idx) => (
                  <tr key={student.id} className={idx % 2 === 0 ? "" : "bg-gray-50/50 print:bg-transparent"}>
                    <td className="border border-gray-400 px-2 py-3 text-center text-gray-500">{idx + 1}</td>
                    <td className="border border-gray-400 px-2 py-3 font-medium">{student.name}</td>
                    <td className="border border-gray-400 px-2 py-3 text-center font-mono text-[11px]">{student.admissionNo}</td>
                    {subjects?.map(sub => (
                      <td key={sub.id} className="border border-gray-400 px-1 py-3 text-center min-h-[32px]"></td>
                    ))}
                    <td className="border border-gray-400 px-2 py-3"></td>
                    <td className="border border-gray-400 px-2 py-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-6 grid grid-cols-3 gap-8 text-sm print:mt-4">
            <div className="space-y-1">
              <div className="border-b border-gray-400 pb-4"></div>
              <div className="text-xs text-gray-500">Class Teacher Signature</div>
            </div>
            <div className="space-y-1">
              <div className="border-b border-gray-400 pb-4"></div>
              <div className="text-xs text-gray-500">Date Completed</div>
            </div>
            <div className="space-y-1">
              <div className="border-b border-gray-400 pb-4"></div>
              <div className="text-xs text-gray-500">Deputy Principal Signature</div>
            </div>
          </div>
          <div className="mt-6 text-center text-[10px] text-gray-400 print:block hidden">Printed by EduMetrics</div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}

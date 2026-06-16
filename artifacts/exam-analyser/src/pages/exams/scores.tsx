import { useGetExam, useListStudents, useListLearningAreas, useListScores, useUpsertScores, getGetExamQueryKey, getListScoresQueryKey } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Save, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export default function ExamScores() {
  const [, params] = useRoute("/exams/:examId/scores");
  const examId = parseInt(params?.examId || "0");
  
  const { data: exam, isLoading: isLoadingExam } = useGetExam(examId, { query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) } });
  const { data: students, isLoading: isLoadingStudents } = useListStudents(exam?.classId ? { classId: exam.classId } : undefined, { query: { enabled: !!exam?.classId } });
  const { data: subjects, isLoading: isLoadingSubjects } = useListLearningAreas();
  const { data: scores, isLoading: isLoadingScores } = useListScores({ examId }, { query: { enabled: !!examId, queryKey: getListScoresQueryKey({ examId }) } });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const upsertScores = useUpsertScores();

  // Local state for score entry
  const [localScores, setLocalScores] = useState<Record<number, Record<number, string>>>({});
  const [savingRow, setSavingRow] = useState<number | null>(null);

  const initRef = useRef(false);

  useEffect(() => {
    if (scores && students && subjects && !initRef.current) {
      const initial: Record<number, Record<number, string>> = {};
      students.forEach(s => {
        initial[s.id] = {};
        subjects.forEach(sub => {
          const score = scores.find(sc => sc.studentId === s.id && sc.learningAreaId === sub.id);
          initial[s.id][sub.id] = score ? String(score.marks) : "";
        });
      });
      setLocalScores(initial);
      initRef.current = true;
    }
  }, [scores, students, subjects]);

  const handleScoreChange = (studentId: number, subjectId: number, value: string) => {
    setLocalScores(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: value
      }
    }));
  };

  const handleSaveStudent = async (studentId: number) => {
    const studentScores = localScores[studentId];
    if (!studentScores) return;

    const payload = {
      studentId,
      examId,
      scores: Object.entries(studentScores)
        .filter(([_, val]) => val.trim() !== "")
        .map(([subId, val]) => ({
          learningAreaId: parseInt(subId),
          marks: Number(val)
        }))
    };

    setSavingRow(studentId);
    try {
      await upsertScores.mutateAsync({ data: payload });
      toast({ title: "Scores saved" });
      queryClient.invalidateQueries({ queryKey: getListScoresQueryKey({ examId }) });
    } catch (error) {
      toast({ title: "Failed to save scores", variant: "destructive" });
    } finally {
      setSavingRow(null);
    }
  };

  const isLoading = isLoadingExam || isLoadingStudents || isLoadingSubjects || isLoadingScores;

  return (
    <Layout>
      <Header 
        title="Score Entry" 
        breadcrumbs={[
          { label: "Exams", href: exam ? `/classes/${exam.classId}/exams` : "#" },
          { label: exam?.name || "Loading...", href: `/exams/${examId}/analytics` },
          { label: "Scores" }
        ]}
      />
      <div className="p-4 md:p-6 mx-auto w-full max-w-[1600px]">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Data Entry</h2>
            <p className="text-muted-foreground text-sm">Enter marks for each learning area. Changes must be saved per student.</p>
          </div>
          <div className="bg-muted px-4 py-2 rounded-md hidden sm:block">
            <span className="text-sm font-medium">Status: </span>
            <span className="text-sm uppercase font-bold ml-2 text-primary">{exam?.status || 'Unknown'}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !students?.length ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No students in this class</h3>
            <p className="text-muted-foreground mt-1">Add students to the class before entering scores.</p>
          </div>
        ) : !subjects?.length ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No learning areas configured</h3>
            <p className="text-muted-foreground mt-1">Configure subjects in Settings to enter scores.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-card border rounded-xl overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="px-4 py-3 sticky left-0 bg-muted/90 backdrop-blur z-10 w-48">Student Name</th>
                    {subjects.map(sub => (
                      <th key={sub.id} className="px-3 py-3 whitespace-nowrap text-center" title={`${sub.name} (Max ${sub.maxMarks})`}>
                        {sub.abbreviation}
                        <div className="text-[10px] opacity-70 font-normal">/{sub.maxMarks}</div>
                      </th>
                    ))}
                    <th className="px-4 py-3 sticky right-0 bg-muted/90 backdrop-blur z-10 w-24 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-muted/30 group">
                      <td className="px-4 py-3 sticky left-0 bg-card group-hover:bg-muted/50 z-10 font-medium whitespace-nowrap truncate max-w-xs">
                        {student.name}
                      </td>
                      {subjects.map(sub => {
                        const val = localScores[student.id]?.[sub.id] || "";
                        const max = sub.maxMarks;
                        const isOver = val !== "" && Number(val) > max;
                        
                        return (
                          <td key={sub.id} className="px-1 py-2 text-center min-w-[80px]">
                            <Input
                              type="number"
                              min="0"
                              max={max}
                              className={cn("h-9 text-center px-1 font-mono", isOver && "border-red-500 text-red-600 focus-visible:ring-red-500")}
                              value={val}
                              onChange={(e) => handleScoreChange(student.id, sub.id, e.target.value)}
                              disabled={exam?.status === 'closed'}
                            />
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 sticky right-0 bg-card group-hover:bg-muted/50 z-10 text-center">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="w-full hover:bg-primary/10 hover:text-primary"
                          disabled={exam?.status === 'closed' || savingRow === student.id}
                          onClick={() => handleSaveStudent(student.id)}
                        >
                          {savingRow === student.id ? <Skeleton className="h-4 w-4 rounded-full" /> : <Save className="w-4 h-4" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Accordion View */}
            <div className="lg:hidden space-y-4">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {students.map(student => (
                  <AccordionItem value={`student-${student.id}`} key={student.id} className="bg-card border rounded-lg overflow-hidden px-1">
                    <AccordionTrigger className="px-3 py-4 hover:no-underline flex gap-3">
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-base">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.admissionNo}</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-4 pt-1">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        {subjects.map(sub => {
                          const val = localScores[student.id]?.[sub.id] || "";
                          const max = sub.maxMarks;
                          const isOver = val !== "" && Number(val) > max;
                          return (
                            <div key={sub.id} className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground flex justify-between">
                                <span>{sub.abbreviation}</span>
                                <span className="opacity-70">/{max}</span>
                              </label>
                              <Input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className={cn("h-11 text-center font-mono text-base", isOver && "border-red-500 text-red-600")}
                                value={val}
                                onChange={(e) => handleScoreChange(student.id, sub.id, e.target.value)}
                                disabled={exam?.status === 'closed'}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <Button 
                        className="w-full h-11" 
                        disabled={exam?.status === 'closed' || savingRow === student.id}
                        onClick={() => handleSaveStudent(student.id)}
                      >
                        {savingRow === student.id ? "Saving..." : "Save Student Scores"}
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

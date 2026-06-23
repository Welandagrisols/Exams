import { useGetRankings, useGetExam, getGetRankingsQueryKey, getGetExamQueryKey } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { useRoute, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { getRubricColor } from "@/lib/utils";
import { FileText, Trophy, TrendingUp, Printer, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";

export default function ExamRankings() {
  const [, params] = useRoute("/exams/:examId/rankings");
  const examId = parseInt(params?.examId || "0");

  const { data: exam } = useGetExam(examId, { query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) } });
  const { data: rankings, isLoading } = useGetRankings(examId, { query: { enabled: !!examId, queryKey: getGetRankingsQueryKey(examId) } });

  const [selected, setSelected] = useState<Set<number>>(new Set());

  const allIds = rankings?.map(r => r.student.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = useCallback(() => {
    if (allSelected || someSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }, [allIds, allSelected, someSelected]);

  const toggleOne = useCallback((id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const printAllUrl = `/exams/${examId}/print-reports`;
  const printSelectedUrl = selected.size > 0
    ? `/exams/${examId}/print-reports?students=${[...selected].join(",")}`
    : null;

  return (
    <Layout>
      <Header
        title="Class Rankings"
        breadcrumbs={[
          { label: "Exams", href: exam ? `/classes/${exam.classId}/exams` : "#" },
          { label: exam?.name || "Loading...", href: `/exams/${examId}/scores` },
          { label: "Rankings" }
        ]}
      />

      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">

        {rankings && rankings.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {selected.size > 0
                ? <span className="font-medium text-foreground">{selected.size} student{selected.size !== 1 ? "s" : ""} selected</span>
                : <span>Select students to print specific reports</span>
              }
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && printSelectedUrl && (
                <Button variant="outline" asChild className="gap-2">
                  <a href={printSelectedUrl} target="_blank" rel="noopener noreferrer">
                    <Printer className="h-4 w-4" /> Print Selected ({selected.size})
                  </a>
                </Button>
              )}
              <Button asChild className="gap-2">
                <a href={printAllUrl} target="_blank" rel="noopener noreferrer">
                  <Printer className="h-4 w-4" /> Print All Reports
                </a>
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !rankings?.length ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No rankings available</h3>
            <p className="text-muted-foreground mt-1">Enter scores to generate class rankings.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="px-4 py-4 w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                        className={someSelected ? "data-[state=unchecked]:bg-primary/20" : ""}
                      />
                    </th>
                    <th className="px-4 py-4 w-16 text-center">Rank</th>
                    <th className="px-4 py-4">Student</th>
                    <th className="px-4 py-4 text-center">Total Marks</th>
                    <th className="px-4 py-4 text-center">Avg %</th>
                    <th className="px-4 py-4 text-center">Grade</th>
                    <th className="px-4 py-4 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rankings.map((row) => {
                    const isChecked = selected.has(row.student.id);
                    return (
                      <tr
                        key={row.student.id}
                        className={cn(
                          "group hover:bg-muted/30 transition-colors cursor-pointer",
                          isChecked && "bg-primary/5",
                          !isChecked && row.rank === 1 && "bg-amber-50/50 dark:bg-amber-900/10",
                          !isChecked && row.rank === 2 && "bg-slate-50/50 dark:bg-slate-800/20",
                          !isChecked && row.rank === 3 && "bg-orange-50/30 dark:bg-orange-900/10"
                        )}
                        onClick={() => toggleOne(row.student.id)}
                      >
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleOne(row.student.id)}
                            aria-label={`Select ${row.student.name}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold mx-auto",
                            row.rank === 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400" :
                            row.rank === 2 ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
                            row.rank === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400" :
                            "text-muted-foreground bg-secondary/50"
                          )}>
                            {row.rank}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-base">{row.student.name}</div>
                          <div className="text-xs text-muted-foreground">{row.student.admissionNo}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          <span className="font-bold text-base">{row.totalMarks}</span>
                          <span className="text-muted-foreground text-xs">/{row.totalMaxMarks}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-medium">
                          {row.averagePercentage.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold ${getRubricColor(row.overallGrade)}`}>
                            {row.overallGrade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/trends/student/${row.student.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors text-slate-400" title="View trends">
                              <TrendingUp className="w-4 h-4" />
                            </Link>
                            <Link href={`/reports/${examId}/${row.student.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                              <FileText className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

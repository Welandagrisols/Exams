import { useGetRankings, useGetExam, getGetRankingsQueryKey, getGetExamQueryKey } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { useRoute, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { getRubricColor } from "@/lib/utils";
import { FileText, Trophy, TrendingUp, Printer, ShieldCheck, ShieldOff, PenLine, Send, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useCanWrite, useIsStaff, useIsAdmin } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ExamApproval = {
  id: number;
  classId: number | null;
  scoresApprovedAt: string | null;
  approvedByName: string | null;
};

type BroadcastResult = {
  messageId: number;
  sent: number;
  noPhone: number;
  failed: number;
  total: number;
  smsConfigured: boolean;
  errors?: string[];
};

export default function ExamRankings() {
  const [, params] = useRoute("/exams/:examId/rankings");
  const examId = parseInt(params?.examId || "0");

  const { data: exam } = useGetExam(examId, { query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) } });
  const { data: rankings, isLoading } = useGetRankings(examId, { query: { enabled: !!examId, queryKey: getGetRankingsQueryKey(examId) } });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // scoresApprovedAt/approvedByName aren't in the generated client's response
  // schema yet, so fetch them directly — same approach the mobile app uses.
  const { data: approval } = useQuery<ExamApproval>({
    queryKey: ["exam-approval", examId],
    queryFn: async () => {
      const res = await authFetch(`/api/exams/${examId}`);
      if (!res.ok) throw new Error("Failed to load exam");
      return res.json();
    },
    enabled: !!examId,
  });

  const isStaff = useIsStaff();
  const isAdmin = useIsAdmin();
  const canWrite = useCanWrite(approval?.classId ?? (exam as any)?.classId);

  const [signOpen, setSignOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);

  const invalidateApproval = () => queryClient.invalidateQueries({ queryKey: ["exam-approval", examId] });

  const approveScores = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/exams/${examId}/approve-scores`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not approve scores.");
      return res.json();
    },
    onSuccess: () => { invalidateApproval(); toast({ title: "Scores approved" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const unapproveScores = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/exams/${examId}/unapprove-scores`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not unapprove scores.");
      return res.json();
    },
    onSuccess: () => { invalidateApproval(); toast({ title: "Scores unapproved — reopened for editing" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const signAll = useMutation({
    mutationFn: async (title: string) => {
      const res = await authFetch(`/api/reports/${examId}/sign-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not sign reports.");
      return res.json() as Promise<{ ok: boolean; signedCount: number }>;
    },
    onSuccess: (result) => {
      setSignOpen(false);
      setCustomTitle("");
      toast({ title: "Signed", description: `Applied your signature to ${result.signedCount} report${result.signedCount !== 1 ? "s" : ""}.` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const broadcast = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/messages/broadcast-results/${examId}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not send results.");
      return res.json() as Promise<BroadcastResult>;
    },
    onSuccess: (result) => setBroadcastResult(result),
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleUnapprove = () => {
    if (window.confirm("This reopens scores for editing. You'll need to approve again before results can be sent to parents. Continue?")) {
      unapproveScores.mutate();
    }
  };

  const handleBroadcast = () => {
    const count = rankings?.length ?? 0;
    if (window.confirm(`This will send an SMS with exam results to parents of all ${count} student${count !== 1 ? "s" : ""} in this class.\n\nParents without a saved phone number will be skipped. Continue?`)) {
      broadcast.mutate();
    }
  };

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

        {rankings && rankings.length > 0 && (isStaff || canWrite) && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm">
                  {approval?.scoresApprovedAt ? (
                    <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-400 font-medium">
                      <ShieldCheck className="h-4 w-4" />
                      Scores approved{approval.approvedByName ? ` by ${approval.approvedByName}` : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                      <ShieldOff className="h-4 w-4" />
                      Scores not yet approved
                    </span>
                  )}
                </div>

                {isStaff && (
                  approval?.scoresApprovedAt ? (
                    <Button variant="outline" size="sm" onClick={handleUnapprove} disabled={unapproveScores.isPending} className="gap-2">
                      {unapproveScores.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                      Unapprove
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => approveScores.mutate()} disabled={approveScores.isPending} className="gap-2">
                      {approveScores.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      Approve Scores
                    </Button>
                  )
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {canWrite && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <PenLine className="h-4 w-4" /> Sign All Reports <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {["Class Teacher", "Principal", "Deputy Principal"].map(title => (
                        <DropdownMenuItem key={title} onClick={() => signAll.mutate(title)}>
                          Sign as {title}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setSignOpen(true)}>Custom title…</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBroadcast}
                    disabled={!approval?.scoresApprovedAt || broadcast.isPending}
                    title={!approval?.scoresApprovedAt ? "Approve scores first" : undefined}
                    className="gap-2"
                  >
                    {broadcast.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Results to Parents
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={signOpen} onOpenChange={setSignOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign all reports</DialogTitle>
              <DialogDescription>Enter the title to sign as (e.g. "Head of Department").</DialogDescription>
            </DialogHeader>
            <Input value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="Title" autoFocus />
            <DialogFooter>
              <Button variant="outline" onClick={() => setSignOpen(false)}>Cancel</Button>
              <Button disabled={!customTitle.trim() || signAll.isPending} onClick={() => signAll.mutate(customTitle.trim())} className="gap-2">
                {signAll.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign as "{customTitle || "…"}"
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!broadcastResult} onOpenChange={(open) => !open && setBroadcastResult(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Results Sent</DialogTitle>
            </DialogHeader>
            {broadcastResult && (
              <div className="space-y-2 text-sm">
                {!broadcastResult.smsConfigured && (
                  <p className="text-amber-600 dark:text-amber-400">SMS is not yet configured. Add your Africa's Talking credentials to start sending.</p>
                )}
                <p>Sent to <strong>{broadcastResult.sent}</strong> of {broadcastResult.total} parents.</p>
                {broadcastResult.noPhone > 0 && <p className="text-muted-foreground">{broadcastResult.noPhone} skipped — no phone number on file.</p>}
                {broadcastResult.failed > 0 && <p className="text-destructive">{broadcastResult.failed} failed to send.</p>}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setBroadcastResult(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {rankings && rankings.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {selected.size > 0
                ? <span className="font-medium text-foreground">{selected.size} student{selected.size !== 1 ? "s" : ""} selected</span>
                : <span>{canWrite ? "Select students to print specific reports" : "View reports by clicking the report icon"}</span>
              }
            </div>
            {canWrite && (
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
            )}
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

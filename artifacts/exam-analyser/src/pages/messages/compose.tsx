import { Layout, Header } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useListClasses, useListStudents } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/supabase";
import {
  Send, Users, FileText, ChevronDown, ChevronUp, AlertCircle,
  Camera, Upload, Loader2, ScanLine, Pencil, CheckCircle2, XCircle,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Exam = { id: number; name: string; term: number; year: number };
type FeeEntry = {
  studentId: number | null;
  studentName: string;
  admissionNo: string;
  balance: string;
  matched: boolean;
  selected: boolean;
};

const DEFAULT_FEE_BODY =
  `Dear Parent/Guardian,\n\nThis is to inform you that [Student Name] has an outstanding fee balance of Ksh [Fee Balance].\n\nPlease clear the balance at the earliest convenience to avoid disruption of studies.\n\nThank you,\nSchool Administration`;

export default function ComposeMessage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [msgType, setMsgType] = useState<"general" | "fee_arrears">("general");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [classId, setClassId] = useState<string>("");
  const [selectAll, setSelectAll] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [examId, setExamId] = useState<string>("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [sending, setSending] = useState(false);

  const [feeEntries, setFeeEntries] = useState<FeeEntry[]>([]);
  const [feeScanning, setFeeScanning] = useState(false);
  const [feeImagePreview, setFeeImagePreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const { data: classes } = useListClasses();
  const { data: students, isLoading: studentsLoading } = useListStudents(
    { classId: classId ? parseInt(classId) : undefined },
    { query: { enabled: !!classId } }
  );

  useEffect(() => {
    if (students) {
      if (selectAll) setSelectedStudentIds(students.map(s => s.id));
      else setSelectedStudentIds([]);
    }
  }, [students, selectAll]);

  useEffect(() => {
    if (!classId) { setExams([]); return; }
    fetch(`/api/classes/${classId}/exams`)
      .then(r => r.json())
      .then(setExams)
      .catch(() => {});
  }, [classId]);

  useEffect(() => {
    if (msgType === "fee_arrears" && !body) setBody(DEFAULT_FEE_BODY);
    if (msgType === "general") {
      setFeeEntries([]);
      setFeeImagePreview(null);
    }
  }, [msgType]);

  const toggleStudent = (id: number) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleFeeEntry = (idx: number) => {
    setFeeEntries(prev => prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e));
  };

  const updateBalance = (idx: number, val: string) => {
    setFeeEntries(prev => prev.map((e, i) => i === idx ? { ...e, balance: val } : e));
  };

  const studentsNoContact = (students ?? []).filter(s =>
    selectedStudentIds.includes(s.id) && !s.parentPhone && !s.parentEmail
  );

  const feeSelected = feeEntries.filter(e => e.selected && e.matched && e.studentId);

  const handleFeeImageCapture = async (file: File) => {
    const url = URL.createObjectURL(file);
    setFeeImagePreview(url);
    setFeeScanning(true);
    setFeeEntries([]);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await authFetch("/api/ocr/fee-arrears", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      const entries: FeeEntry[] = (data.entries ?? []).map((e: any) => ({
        ...e,
        selected: !!e.matched,
      }));
      setFeeEntries(entries);
      if (entries.length === 0) {
        toast({ title: "No fee arrears found in the image", description: "Try a clearer photo of the fee statement." });
      } else {
        const matched = entries.filter(e => e.matched).length;
        toast({ title: `Found ${entries.length} entries`, description: `${matched} matched to students in the system.` });
      }
      if (!title) setTitle("Fee Arrears Notice");
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally {
      setFeeScanning(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFeeImageCapture(file);
    e.target.value = "";
  };

  const handleSend = async () => {
    if (!title.trim()) { toast({ title: "Please enter a subject", variant: "destructive" }); return; }
    if (!body.trim()) { toast({ title: "Please enter a message body", variant: "destructive" }); return; }

    setSending(true);
    try {
      let payload: any;

      if (msgType === "fee_arrears") {
        if (feeSelected.length === 0) {
          toast({ title: "No matched recipients selected", variant: "destructive" });
          setSending(false);
          return;
        }
        payload = {
          type: "fee_arrears",
          title,
          body,
          feeData: feeSelected.map(e => ({ studentId: e.studentId, balance: e.balance })),
        };
      } else {
        if (selectedStudentIds.length === 0) {
          toast({ title: "Select at least one recipient", variant: "destructive" });
          setSending(false);
          return;
        }
        payload = {
          type: "general",
          title,
          body,
          classId: classId || null,
          examId: examId || null,
          studentIds: selectedStudentIds,
        };
      }

      const res = await authFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const msg = await res.json();
      toast({ title: "Message saved!", description: "Open it to send to each parent." });
      navigate(`/messages/${msg.id}`);
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <Header title="Compose Message" breadcrumbs={[{ label: "Messages", href: "/messages" }, { label: "Compose" }]} />
      <div className="p-4 md:p-6 max-w-3xl mx-auto w-full space-y-6">

        {/* Type selector */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={msgType === "general" ? "default" : "outline"}
            className="gap-2"
            onClick={() => setMsgType("general")}
          >
            <Users className="h-4 w-4" /> General Message
          </Button>
          <Button
            type="button"
            variant={msgType === "fee_arrears" ? "default" : "outline"}
            className="gap-2"
            onClick={() => setMsgType("fee_arrears")}
          >
            <Receipt className="h-4 w-4" /> Fee Arrears
          </Button>
        </div>

        {/* ── GENERAL FLOW ── */}
        {msgType === "general" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" /> Recipients
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={classId} onValueChange={v => { setClassId(v); setExamId(""); setSelectAll(true); }}>
                      <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                      <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {classId && (
                    <div className="space-y-2">
                      <Label>Students</Label>
                      <div className="flex gap-2">
                        <Button type="button" variant={selectAll ? "default" : "outline"} size="sm"
                          onClick={() => { setSelectAll(true); setShowStudentPicker(false); }}>All Parents</Button>
                        <Button type="button" variant={!selectAll ? "default" : "outline"} size="sm"
                          onClick={() => { setSelectAll(false); setShowStudentPicker(true); }}>Select Students</Button>
                      </div>
                    </div>
                  )}
                </div>

                {classId && !selectAll && (
                  <div>
                    <button type="button" className="flex items-center gap-2 text-sm text-primary hover:underline mb-2"
                      onClick={() => setShowStudentPicker(v => !v)}>
                      {showStudentPicker ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {selectedStudentIds.length} of {students?.length ?? "…"} students selected
                    </button>
                    {showStudentPicker && (
                      <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                        {studentsLoading
                          ? [1, 2, 3].map(i => <Skeleton key={i} className="h-10 mx-3 my-1" />)
                          : students?.map(s => (
                              <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/40">
                                <Checkbox checked={selectedStudentIds.includes(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{s.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {s.parentPhone || s.parentEmail || <span className="text-orange-500">No contact info</span>}
                                  </div>
                                </div>
                              </label>
                            ))
                        }
                      </div>
                    )}
                  </div>
                )}

                {classId && students && (
                  <div className="text-sm text-muted-foreground">
                    {selectedStudentIds.length} recipient{selectedStudentIds.length !== 1 ? "s" : ""} selected
                    {studentsNoContact.length > 0 && (
                      <span className="ml-2 text-orange-500 inline-flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> {studentsNoContact.length} have no parent contact info
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {classId && exams.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-primary" /> Attach Report (optional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Include a link to student reports from this exam</Label>
                    <Select value={examId} onValueChange={setExamId}>
                      <SelectTrigger><SelectValue placeholder="No report attached" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No report</SelectItem>
                        {exams.map(e => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name} — Term {e.term}, {e.year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      A personalised report link will be added to each parent's message automatically.
                      When sending via SMS, the marks are formatted as: <strong>Eng:76, Kisw:80, Math:54…</strong>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ── FEE ARREARS FLOW ── */}
        {msgType === "fee_arrears" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScanLine className="h-4 w-4 text-primary" /> Scan Fee Statement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Take a photo or upload a printed fee statement / balance sheet. The AI will extract student names and outstanding balances automatically.
              </p>

              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="outline" className="gap-2" onClick={() => cameraRef.current?.click()} disabled={feeScanning}>
                  <Camera className="h-4 w-4" /> Take Photo
                </Button>
                <Button type="button" variant="outline" className="gap-2" onClick={() => galleryRef.current?.click()} disabled={feeScanning}>
                  <Upload className="h-4 w-4" /> Upload Image
                </Button>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />
                <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
              </div>

              {feeScanning && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Scanning for fee arrears…
                </div>
              )}

              {feeImagePreview && !feeScanning && (
                <img src={feeImagePreview} alt="Fee statement" className="rounded-lg border max-h-48 object-contain" />
              )}

              {feeEntries.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Extracted Entries — review and edit before sending</Label>
                    <span className="text-xs text-muted-foreground">{feeSelected.length} selected</span>
                  </div>
                  <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                    {feeEntries.map((entry, idx) => (
                      <div key={idx} className={cn(
                        "flex items-center gap-3 px-4 py-2.5",
                        !entry.matched && "opacity-60 bg-orange-50 dark:bg-orange-950/20"
                      )}>
                        <Checkbox
                          checked={entry.selected && entry.matched}
                          disabled={!entry.matched}
                          onCheckedChange={() => toggleFeeEntry(idx)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{entry.studentName}</span>
                            {entry.matched
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                              : <XCircle className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                            }
                          </div>
                          {entry.admissionNo && <div className="text-xs text-muted-foreground">{entry.admissionNo}</div>}
                          {!entry.matched && <div className="text-xs text-orange-500">Not found in student records</div>}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Ksh</span>
                          <Input
                            value={entry.balance}
                            onChange={e => updateBalance(idx, e.target.value)}
                            className="w-24 h-7 text-sm text-right"
                            disabled={!entry.matched}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {feeEntries.some(e => !e.matched) && (
                    <p className="text-xs text-orange-500 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Students marked with ✗ were not found in the system and will be skipped.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── MESSAGE CONTENT ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder={msgType === "fee_arrears" ? "Fee Arrears Notice — Term 1 2025" : "e.g. Term 1 Results — Grade 7 Blue"}
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea
                placeholder={msgType === "fee_arrears" ? DEFAULT_FEE_BODY : `Dear Parent/Guardian,\n\nWe are pleased to share the results for Term 1...\n\nRegards,\nThe Class Teacher`}
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Use <strong>[Student Name]</strong> to personalise per student.
                {msgType === "fee_arrears" && <> Use <strong>[Fee Balance]</strong> to insert each student's balance amount.</>}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => navigate("/messages")}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending || (msgType === "general" ? selectedStudentIds.length === 0 : feeSelected.length === 0)}
            className="gap-2"
          >
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Send className="h-4 w-4" /> Save & Continue</>}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

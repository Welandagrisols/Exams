import { Layout, Header } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useListClasses, useListStudents } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Send, Users, FileText, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Exam = { id: number; name: string; term: number; year: number };

export default function ComposeMessage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [classId, setClassId] = useState<string>("");
  const [selectAll, setSelectAll] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [examId, setExamId] = useState<string>("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [sending, setSending] = useState(false);

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

  const toggleStudent = (id: number) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const studentsNoContact = (students ?? []).filter(s =>
    selectedStudentIds.includes(s.id) && !s.parentPhone && !s.parentEmail
  );

  const handleSend = async () => {
    if (!title.trim()) { toast({ title: "Please enter a subject", variant: "destructive" }); return; }
    if (!body.trim()) { toast({ title: "Please enter a message body", variant: "destructive" }); return; }
    if (selectedStudentIds.length === 0) { toast({ title: "Select at least one recipient", variant: "destructive" }); return; }

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          classId: classId || null,
          examId: examId || null,
          studentIds: selectedStudentIds,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const msg = await res.json();
      toast({ title: "Message saved!", description: "Open it to send to each parent via WhatsApp or email." });
      navigate(`/messages/${msg.id}`);
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <Header title="Compose Message" breadcrumbs={[{ label: "Messages", href: "/messages" }, { label: "Compose" }]} />
      <div className="p-4 md:p-6 max-w-3xl mx-auto w-full space-y-6">

        {/* Recipients */}
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
                    <Button
                      type="button" variant={selectAll ? "default" : "outline"} size="sm"
                      onClick={() => { setSelectAll(true); setShowStudentPicker(false); }}
                    >All Parents</Button>
                    <Button
                      type="button" variant={!selectAll ? "default" : "outline"} size="sm"
                      onClick={() => { setSelectAll(false); setShowStudentPicker(true); }}
                    >Select Students</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Individual student picker */}
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
                            <Checkbox
                              checked={selectedStudentIds.includes(s.id)}
                              onCheckedChange={() => toggleStudent(s.id)}
                            />
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

            {/* Summary */}
            {classId && students && (
              <div className="text-sm text-muted-foreground">
                {selectedStudentIds.length} recipient{selectedStudentIds.length !== 1 ? "s" : ""} selected
                {studentsNoContact.length > 0 && (
                  <span className="ml-2 text-orange-500 flex items-center gap-1 inline-flex">
                    <AlertCircle className="h-3.5 w-3.5" /> {studentsNoContact.length} have no parent contact info
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Optional: Attach Report */}
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
                <p className="text-xs text-muted-foreground">A personalised report link will be added to each parent's message automatically.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Message Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="e.g. Term 1 Results — Grade 7 Blue"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea
                placeholder={`Dear Parent/Guardian,\n\nWe are pleased to share the results for Term 1...\n\nRegards,\nThe Class Teacher`}
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Use <strong>[Student Name]</strong> anywhere in your message — it will be replaced with each student's name when you send.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => navigate("/messages")}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || selectedStudentIds.length === 0} className="gap-2">
            {sending ? "Saving…" : <><Send className="h-4 w-4" /> Save & Continue</>}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

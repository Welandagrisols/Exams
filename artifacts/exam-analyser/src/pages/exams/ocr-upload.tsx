import { Layout, Header } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetExam, useUpsertScores, getGetExamQueryKey } from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { useState, useRef } from "react";
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, Sparkles, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/supabase";

type OcrMark = { learningAreaId: number; subjectName: string; maxMarks: number; marks: number | null };
type OcrRow = { studentId: number | null; studentName: string; admissionNo: string; marks: OcrMark[] };
type OcrResult = { examId: number; examName: string; className: string; scores: OcrRow[] };

export default function OcrUpload() {
  const [, params] = useRoute("/exams/:examId/ocr-upload");
  const examId = parseInt(params?.examId || "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exam } = useGetExam(examId, { query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) } });
  const upsertScores = useUpsertScores();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [editedMarks, setEditedMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFile(file);
    setResult(null);
    setSaved(false);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await authFetch(`/api/exams/${examId}/ocr-upload`, { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
        throw new Error(body.error ?? `Server error (${res.status})`);
      }
      const data: OcrResult = await res.json();
      setResult(data);
      // Init editable marks
      const init: Record<string, string> = {};
      data.scores.forEach(row => {
        row.marks.forEach(m => {
          init[`${row.studentId}-${m.learningAreaId}`] = m.marks != null ? String(m.marks) : "";
        });
      });
      setEditedMarks(init);
    } catch (err: any) {
      toast({ title: "OCR failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const students = result.scores
        .filter(row => row.studentId)
        .map(row => ({
          studentId: row.studentId!,
          scores: row.marks
            .map(m => ({ learningAreaId: m.learningAreaId, marks: parseFloat(editedMarks[`${row.studentId}-${m.learningAreaId}`] ?? "") }))
            .filter(s => !isNaN(s.marks) && s.marks >= 0),
        }))
        .filter(s => s.scores.length > 0);

      if (students.length === 0) {
        toast({ title: "Nothing to save", description: "No matched students have valid marks entered.", variant: "destructive" });
        return;
      }

      const res = await authFetch(`/api/scores/bulk`, {
        method: "POST",
        body: JSON.stringify({ examId, students }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(body.error ?? "Save failed");
      }
      const { saved: count, errors } = await res.json();
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: getGetExamQueryKey(examId) });
      toast({ title: `${count} mark${count !== 1 ? "s" : ""} saved successfully!` });
      if (errors?.length) console.warn("Partial save errors:", errors);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Layout>
      <Header
        title="OCR Score Upload"
        breadcrumbs={[
          { label: "Exams", href: exam ? `/classes/${exam.classId}/exams` : "#" },
          { label: exam?.name ?? "Loading...", href: `/exams/${examId}/scores` },
          { label: "OCR Upload" },
        ]}
      />
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6">

        {saved ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Marks Saved!</h2>
              <p className="text-muted-foreground">All scores have been recorded in the system.</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => { setSaved(false); setResult(null); setFile(null); setPreview(null); }}>Upload Another Sheet</Button>
                <Button onClick={() => navigate(`/exams/${examId}/analytics`)}>View Analytics <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Upload area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" /> Upload Score Sheet Photo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary/50",
                    preview ? "border-primary/40 bg-primary/5" : "border-muted-foreground/25"
                  )}
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                >
                  {preview ? (
                    <img src={preview} alt="Score sheet" className="max-h-64 mx-auto rounded-lg object-contain" />
                  ) : (
                    <div className="space-y-3">
                      <Camera className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                      <div>
                        <p className="font-medium">Drop photo here or click to upload from gallery</p>
                        <p className="text-sm text-muted-foreground mt-1">JPG, PNG, WEBP • Max 20MB</p>
                      </div>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="gap-2" onClick={() => cameraRef.current?.click()}>
                    <Camera className="h-4 w-4" /> Take Photo
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4" /> Upload from Gallery
                  </Button>
                </div>

                {file && !result && (
                  <Button onClick={handleProcess} disabled={loading} className="gap-2 w-full md:w-auto">
                    {loading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading marks with AI…</>
                      : <><Sparkles className="h-4 w-4" /> Process with AI</>
                    }
                  </Button>
                )}

                {loading && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Gemini AI is reading every mark from your score sheet. This takes 10–20 seconds…</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Review table */}
            {result && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Review Extracted Marks</CardTitle>
                    <span className="text-sm text-muted-foreground">{result.className} — {result.examName}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Check every cell. Correct any mis-reads before saving. Cells highlighted in yellow were left blank by AI.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium sticky left-0 bg-muted/90">Student</th>
                          {result.scores[0]?.marks.map(m => (
                            <th key={m.learningAreaId} className="px-2 py-2 text-center font-medium whitespace-nowrap">
                              {m.subjectName}<div className="text-[10px] font-normal text-muted-foreground">/{m.maxMarks}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {result.scores.map(row => (
                          <tr key={row.studentId ?? row.studentName} className={cn("hover:bg-muted/20", !row.studentId && "opacity-50")}>
                            <td className="px-3 py-2 sticky left-0 bg-card font-medium whitespace-nowrap">
                              <div>{row.studentName}</div>
                              <div className="text-xs text-muted-foreground">{row.admissionNo}</div>
                              {!row.studentId && <div className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Not matched</div>}
                            </td>
                            {row.marks.map(m => {
                              const key = `${row.studentId}-${m.learningAreaId}`;
                              const val = editedMarks[key] ?? "";
                              const isBlank = val === "";
                              const isOver = val !== "" && parseFloat(val) > m.maxMarks;
                              return (
                                <td key={m.learningAreaId} className="px-1 py-1.5 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={m.maxMarks}
                                    value={val}
                                    onChange={e => setEditedMarks(prev => ({ ...prev, [key]: e.target.value }))}
                                    disabled={!row.studentId}
                                    className={cn(
                                      "h-8 w-16 text-center font-mono text-xs mx-auto",
                                      isBlank && "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300",
                                      isOver && "border-red-400 text-red-600"
                                    )}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
                      {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><CheckCircle className="h-4 w-4" /> Confirm & Save All Marks</>}
                    </Button>
                    <Button variant="outline" onClick={() => { setResult(null); setFile(null); setPreview(null); }}>Start Over</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

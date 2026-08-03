import { Layout, Header } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListClasses, useListStudents, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useState, useRef } from "react";
import { authFetch } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Camera, Upload, Loader2, Sparkles, CheckCircle, Receipt } from "lucide-react";

type FeeEntry = {
  studentId: number | null;
  studentName: string;
  admissionNo: string;
  balance: string;
  matched: boolean;
};

type FeeArrearsResult = { entries: FeeEntry[] };

export default function FeeBalances() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return (
    <Layout>
      <Header title="Fee Balances" breadcrumbs={[{ label: "Fees", href: "/fees/reminders" }, { label: "Update Balances" }]} />
      <div className="p-4 md:p-6 max-w-3xl mx-auto w-full space-y-6">
        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="scan">Scan a Fee Sheet</TabsTrigger>
            <TabsTrigger value="manual">Enter Manually</TabsTrigger>
          </TabsList>
          <TabsContent value="scan" className="mt-6">
            <ScanMode toast={toast} queryClient={queryClient} />
          </TabsContent>
          <TabsContent value="manual" className="mt-6">
            <ManualMode toast={toast} queryClient={queryClient} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function ScanMode({ toast, queryClient }: { toast: ReturnType<typeof useToast>["toast"]; queryClient: ReturnType<typeof useQueryClient> }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [entries, setEntries] = useState<FeeEntry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ count: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setEntries(null);
    setSaved(null);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await authFetch("/api/ocr/fee-arrears", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Server error (${res.status})`);
      const data: FeeArrearsResult = await res.json();
      setEntries(data.entries);
    } catch (err: any) {
      toast({ title: "OCR failed", description: err.message ?? "Could not read the fee sheet.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const updateBalance = (index: number, value: string) => {
    setEntries(prev => prev ? prev.map((e, i) => i === index ? { ...e, balance: value } : e) : prev);
  };

  const handleSaveAll = async () => {
    if (!entries) return;
    const matchedEntries = entries.filter(e => e.matched && e.studentId && e.balance !== "" && !isNaN(parseFloat(e.balance)));
    if (matchedEntries.length === 0) {
      toast({ title: "Nothing to save", description: "No matched students with a valid balance were found.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch("/api/students/fee-balances/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: matchedEntries.map(e => ({ studentId: e.studentId, feeBalance: e.balance })) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to save balances.");
      const result: { updated: number } = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/students"] });
      setSaved({ count: result.updated });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center gap-3 text-center py-10">
          <CheckCircle className="h-14 w-14 text-green-500" />
          <p className="text-lg font-semibold">{saved.count} fee balance{saved.count === 1 ? "" : "s"} saved</p>
          <p className="text-sm text-muted-foreground">Balances are now stored on each student and ready for reminders.</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => { setSaved(null); setEntries(null); setFile(null); setPreview(null); }}>Scan Another</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photograph or upload a fee sheet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A handwritten or printed fee statement, ledger, or arrears list. AI will extract each student's balance and match them to your student records.
          </p>

          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg min-h-[180px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
              preview ? "border-transparent" : "border-muted-foreground/30 hover:border-muted-foreground/50"
            )}
            onClick={() => fileRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Fee sheet preview" className="max-h-64 object-contain rounded-lg" />
            ) : (
              <>
                <Receipt className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload, or drag an image here</p>
              </>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => cameraRef.current?.click()}>
              <Camera className="h-4 w-4" /> Take Photo
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Choose File
            </Button>
          </div>

          {file && !entries && (
            <Button className="w-full gap-2" onClick={handleProcess} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {processing ? "Reading sheet…" : "Process with AI"}
            </Button>
          )}
          {processing && <p className="text-xs text-muted-foreground text-center">This may take 20–30 seconds…</p>}
        </CardContent>
      </Card>

      {entries && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Review Extracted Balances
              <span className="text-sm font-normal text-muted-foreground">{entries.length} row{entries.length === 1 ? "" : "s"} found</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Only matched students (green) can be saved. Fix any misread balance before saving.</p>
            <div className="divide-y">
              {entries.map((entry, i) => (
                <div key={i} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{entry.studentName || "(no name)"}</div>
                    <div className="text-xs text-muted-foreground">Adm. No. {entry.admissionNo || "—"}</div>
                  </div>
                  <Input
                    type="number"
                    className="w-28"
                    value={entry.balance}
                    disabled={!entry.matched}
                    onChange={e => updateBalance(i, e.target.value)}
                  />
                  {entry.matched
                    ? <span className="text-xs text-green-600 font-medium w-20 text-right">Matched</span>
                    : <span className="text-xs text-destructive font-medium w-20 text-right">Not found</span>}
                </div>
              ))}
            </div>
            <Button className="w-full gap-2" onClick={handleSaveAll} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {saving ? "Saving…" : `Save ${entries.filter(e => e.matched).length} Matched Balance${entries.filter(e => e.matched).length === 1 ? "" : "s"}`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ManualMode({ toast, queryClient }: { toast: ReturnType<typeof useToast>["toast"]; queryClient: ReturnType<typeof useQueryClient> }) {
  const { data: classes } = useListClasses();
  const [classId, setClassId] = useState<string>("");
  const { data: students, isLoading } = useListStudents(
    classId ? { classId: parseInt(classId) } : undefined,
    { query: { enabled: !!classId, queryKey: getListStudentsQueryKey({ classId: parseInt(classId || "0") }) } }
  );
  const [edited, setEdited] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const valueFor = (studentId: number, current: string | null | undefined) => edited[studentId] ?? current ?? "";

  const handleSave = async () => {
    const updates = Object.entries(edited)
      .filter(([, v]) => v !== "" && !isNaN(parseFloat(v)))
      .map(([studentId, v]) => ({ studentId: parseInt(studentId), feeBalance: v }));
    if (updates.length === 0) {
      toast({ title: "Nothing to save", description: "Enter at least one balance.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch("/api/students/fee-balances/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates, classId: parseInt(classId) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to save balances.");
      const result: { updated: number } = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/students"] });
      toast({ title: `${result.updated} balance${result.updated === 1 ? "" : "s"} saved` });
      setEdited({});
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Enter balances for a class</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
          <SelectContent>
            {classes?.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading && <p className="text-sm text-muted-foreground">Loading students…</p>}

        {students && students.length > 0 && (
          <>
            <div className="divide-y">
              {students.map(s => (
                <div key={s.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">Adm. No. {s.admissionNo}</div>
                  </div>
                  <Input
                    type="number"
                    className="w-32"
                    placeholder="0"
                    value={valueFor(s.id, s.feeBalance)}
                    onChange={e => setEdited(prev => ({ ...prev, [s.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Balances"}
            </Button>
          </>
        )}

        {students && students.length === 0 && (
          <p className="text-sm text-muted-foreground">No students in this class yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

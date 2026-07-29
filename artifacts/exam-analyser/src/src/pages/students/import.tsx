import { Layout, Header } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useListClasses } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle, Download, ArrowRight,
  Loader2, Camera, Sparkles, ScanLine, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { authFetch } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PreviewRow = {
  rowIndex: number;
  name: string;
  admissionNo: string;
  gender: string | null;
  dateOfBirth: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  nationality: string | null;
  notes: string | null;
  valid: boolean;
};

type PreviewResult = {
  className: string;
  rows: PreviewRow[];
  total: number;
  valid: number;
};

type ScanResult = {
  students: PreviewRow[];
  total: number;
  valid: number;
};

export default function ImportStudents() {
  const [, navigate] = useLocation();
  const { data: classes } = useListClasses();
  const { toast } = useToast();

  const [classId, setClassId] = useState<string>("");
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanImporting, setScanImporting] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setPreview(null); setDone(null); }
  };

  const handlePreview = async () => {
    if (!file || !classId) return;
    setLoading(true);
    setPreview(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("classId", classId);
      const res = await authFetch("/api/students/import/preview", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error);
      setPreview(await res.json());
    } catch (err: any) {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleConfirm = async (rows: PreviewRow[]) => {
    if (!classId) return;
    setImporting(true);
    try {
      const res = await authFetch("/api/students/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: parseInt(classId), rows: rows.filter(r => r.valid) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const result = await res.json();
      setDone(result);
      toast({ title: `Imported ${result.created} students successfully` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally { setImporting(false); }
  };

  const handleScanConfirm = async () => {
    if (!scanResult || !classId) return;
    setScanImporting(true);
    try {
      const res = await authFetch("/api/students/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: parseInt(classId), rows: scanResult.students.filter(r => r.valid) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const result = await res.json();
      setDone(result);
      toast({ title: `Imported ${result.created} students successfully` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally { setScanImporting(false); }
  };

  const handleScanImage = (f: File) => {
    setScanFile(f);
    setScanResult(null);
    const reader = new FileReader();
    reader.onload = e => setScanPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleScanProcess = async () => {
    if (!scanFile) return;
    setScanLoading(true);
    setScanResult(null);
    try {
      const form = new FormData();
      form.append("image", scanFile);
      const res = await authFetch("/api/ocr/student-list", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error);
      const data: ScanResult = await res.json();
      setScanResult(data);
      toast({ title: `Found ${data.valid} students`, description: "Review and correct before importing." });
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally { setScanLoading(false); }
  };

  const downloadTemplate = () => {
    const headers = ["Full Name", "Admission No", "Gender", "Date of Birth", "Parent Name", "Parent Phone", "Parent Email", "Nationality", "Notes"];
    const example = ["Jane Doe", "ADM-001", "F", "2010-03-15", "John Doe", "+254712345678", "parent@email.com", "Kenyan", ""];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "students_import_template.csv"; a.click();
  };

  const resetAll = () => {
    setDone(null); setPreview(null); setFile(null); setClassId("");
    setScanResult(null); setScanFile(null); setScanPreview(null);
  };

  const StudentTable = ({ rows }: { rows: PreviewRow[] }) => (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="px-3 py-2 text-left font-medium">Full Name</th>
            <th className="px-3 py-2 text-left font-medium">Adm No</th>
            <th className="px-3 py-2 text-left font-medium">Gender</th>
            <th className="px-3 py-2 text-left font-medium">Parent Name</th>
            <th className="px-3 py-2 text-left font-medium">Parent Phone</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, i) => (
            <tr key={row.rowIndex} className={cn("hover:bg-muted/30", !row.valid && "bg-red-50/50 dark:bg-red-950/10")}>
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2 font-medium">{row.name || <span className="text-red-500 italic">missing</span>}</td>
              <td className="px-3 py-2 font-mono text-xs">{row.admissionNo || <span className="text-muted-foreground">—</span>}</td>
              <td className="px-3 py-2">{row.gender === "M" ? "Male" : row.gender === "F" ? "Female" : "—"}</td>
              <td className="px-3 py-2">{row.parentName || "—"}</td>
              <td className="px-3 py-2">{row.parentPhone || "—"}</td>
              <td className="px-3 py-2">
                {row.valid
                  ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="h-3 w-3" /> Valid</span>
                  : <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle className="h-3 w-3" /> Invalid</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (done) {
    return (
      <Layout>
        <Header title="Import Students" breadcrumbs={[{ label: "Classes", href: "/classes" }, { label: "Import Students" }]} />
        <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Import Complete</h2>
              <p className="text-muted-foreground">{done.created} students added · {done.skipped} skipped (duplicates)</p>
              <div className="flex gap-3 justify-center mt-4">
                <Button variant="outline" onClick={resetAll}>Import More</Button>
                <Button onClick={() => navigate(`/classes/${classId}/students`)}>View Students <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Import Students" breadcrumbs={[{ label: "Classes", href: "/classes" }, { label: "Import Students" }]} />
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">

        {/* Class selector always visible */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Class *</label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select a class" /></SelectTrigger>
                <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="photo">
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="photo" className="gap-2"><Camera className="h-4 w-4" /> Scan Photo</TabsTrigger>
            <TabsTrigger value="excel" className="gap-2"><FileSpreadsheet className="h-4 w-4" /> Excel / CSV</TabsTrigger>
          </TabsList>

          {/* ── PHOTO SCAN TAB ── */}
          <TabsContent value="photo" className="space-y-5 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Take a photo of your student list or class register
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  AI reads every row and extracts all students at once — works with handwritten or printed lists.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary/50",
                    scanPreview ? "border-primary/40 bg-primary/5" : "border-muted-foreground/25"
                  )}
                  onClick={() => galleryRef.current?.click()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleScanImage(f); }}
                  onDragOver={e => e.preventDefault()}
                >
                  {scanPreview ? (
                    <img src={scanPreview} alt="Student list" className="max-h-64 mx-auto rounded-lg object-contain" />
                  ) : (
                    <div className="space-y-3">
                      <ScanLine className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                      <div>
                        <p className="font-medium">Drop photo here or click to select</p>
                        <p className="text-sm text-muted-foreground mt-1">JPG, PNG, WEBP · Max 20MB</p>
                      </div>
                    </div>
                  )}
                </div>

                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleScanImage(f); e.target.value = ""; }} />
                <input ref={galleryRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleScanImage(f); e.target.value = ""; }} />

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="gap-2" onClick={() => cameraRef.current?.click()} disabled={scanLoading}>
                    <Camera className="h-4 w-4" /> Take Photo
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" onClick={() => galleryRef.current?.click()} disabled={scanLoading}>
                    <Upload className="h-4 w-4" /> Upload from Gallery
                  </Button>
                  {scanFile && !scanResult && (
                    <Button className="gap-2" onClick={handleScanProcess} disabled={scanLoading || !classId}>
                      {scanLoading
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading list with AI…</>
                        : <><Sparkles className="h-4 w-4" /> Extract Students</>}
                    </Button>
                  )}
                </div>

                {!classId && scanFile && (
                  <p className="text-sm text-amber-600 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Please select a class above before extracting.
                  </p>
                )}

                {scanLoading && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    AI is reading every student from your list — this takes 10–20 seconds…
                  </div>
                )}
              </CardContent>
            </Card>

            {scanResult && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base">Review Extracted Students</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      <span className="text-green-600 font-semibold">{scanResult.valid} valid</span>
                      {scanResult.total - scanResult.valid > 0 && <> · <span className="text-red-500">{scanResult.total - scanResult.valid} invalid</span></>}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Check every row. Correct any mis-reads before importing.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StudentTable rows={scanResult.students} />
                  <div className="flex flex-wrap gap-3">
                    {scanResult.valid > 0 && (
                      <Button onClick={handleScanConfirm} disabled={scanImporting} className="gap-2">
                        {scanImporting
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                          : <>Import {scanResult.valid} Students <ArrowRight className="h-4 w-4" /></>}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => { setScanResult(null); setScanFile(null); setScanPreview(null); }}>
                      Scan Another Photo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── EXCEL / CSV TAB ── */}
          <TabsContent value="excel" className="space-y-5 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                  Download Template & Fill In
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Download the CSV template, fill in your students, then upload it below.
                  Required columns: <strong>Full Name</strong>, <strong>Admission No</strong>.
                </p>
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" /> Download Template (.csv)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                  Upload File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors",
                    file && "border-primary/40 bg-primary/5"
                  )}
                  onClick={() => fileRef.current?.click()}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                      <span className="font-medium truncate max-w-xs">{file.name}</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <span>Click to upload .xlsx or .csv</span>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={handlePreview} disabled={!file || !classId || loading} className="gap-2">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : "Preview Import"}
                  </Button>
                </div>
                {!classId && file && (
                  <p className="text-sm text-amber-600 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Please select a class above first.
                  </p>
                )}
              </CardContent>
            </Card>

            {preview && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                      Review & Confirm
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                      <span className="text-green-600 font-semibold">{preview.valid} valid</span> · {preview.total - preview.valid} invalid
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StudentTable rows={preview.rows} />
                  {preview.valid > 0 && (
                    <Button onClick={() => handleConfirm(preview.rows)} disabled={importing} className="gap-2">
                      {importing
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                        : <>Import {preview.valid} Students <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

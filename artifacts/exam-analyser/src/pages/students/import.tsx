import { Layout, Header } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListClasses } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

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

export default function ImportStudents() {
  const [, navigate] = useLocation();
  const { data: classes } = useListClasses();
  const [classId, setClassId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      const res = await fetch("/api/students/import/preview", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error);
      setPreview(await res.json());
    } catch (err: any) {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!preview || !classId) return;
    setImporting(true);
    try {
      const res = await fetch("/api/students/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: parseInt(classId), rows: preview.rows.filter(r => r.valid) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const result = await res.json();
      setDone(result);
      toast({ title: `Imported ${result.created} students successfully` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    const headers = ["Full Name", "Admission No", "Gender", "Date of Birth", "Parent Name", "Parent Phone", "Parent Email", "Nationality", "Notes"];
    const example = ["Jane Doe", "ADM-001", "F", "2010-03-15", "John Doe", "+254712345678", "parent@email.com", "Kenyan", ""];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "students_import_template.csv"; a.click();
  };

  return (
    <Layout>
      <Header title="Import Students" breadcrumbs={[{ label: "Classes", href: "/classes" }, { label: "Import Students" }]} />
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">

        {done ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Import Complete</h2>
              <p className="text-muted-foreground">{done.created} students added · {done.skipped} skipped (duplicates)</p>
              <div className="flex gap-3 justify-center mt-4">
                <Button variant="outline" onClick={() => { setDone(null); setPreview(null); setFile(null); setClassId(""); }}>Import Another</Button>
                <Button onClick={() => navigate(`/classes/${classId}/students`)}>View Students <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Step 1 */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>Download Template & Fill In</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Download the Excel/CSV template, fill in your students' details, then upload it below. Required columns: <strong>Full Name</strong>, <strong>Admission No</strong>.</p>
                <Button variant="outline" onClick={downloadTemplate} className="gap-2"><Download className="h-4 w-4" /> Download Template (.csv)</Button>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>Select Class & Upload File</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Class</label>
                    <Select value={classId} onValueChange={setClassId}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Excel or CSV File</label>
                    <div
                      className={cn("border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors", file && "border-primary/40 bg-primary/5")}
                      onClick={() => fileRef.current?.click()}
                    >
                      {file ? (
                        <div className="flex items-center justify-center gap-2 text-sm"><FileSpreadsheet className="h-4 w-4 text-primary" /><span className="font-medium truncate max-w-xs">{file.name}</span></div>
                      ) : (
                        <div className="text-muted-foreground text-sm"><Upload className="h-6 w-6 mx-auto mb-1 opacity-50" /><span>Click to upload .xlsx or .csv</span></div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                  </div>
                </div>
                <Button onClick={handlePreview} disabled={!file || !classId || loading} className="gap-2">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <>Preview Import</>}
                </Button>
              </CardContent>
            </Card>

            {/* Step 3 - Preview */}
            {preview && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>Review & Confirm</CardTitle>
                    <div className="text-sm text-muted-foreground"><span className="text-green-600 font-semibold">{preview.valid} valid</span> · {preview.total - preview.valid} invalid</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        {preview.rows.map(row => (
                          <tr key={row.rowIndex} className={cn("hover:bg-muted/30", !row.valid && "bg-red-50/50 dark:bg-red-950/10")}>
                            <td className="px-3 py-2 text-muted-foreground">{row.rowIndex + 1}</td>
                            <td className="px-3 py-2 font-medium">{row.name || <span className="text-red-500 italic">missing</span>}</td>
                            <td className="px-3 py-2 font-mono text-xs">{row.admissionNo || <span className="text-red-500 italic">missing</span>}</td>
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
                  {preview.valid > 0 && (
                    <Button onClick={handleConfirm} disabled={importing} className="gap-2">
                      {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</> : <>Import {preview.valid} Students <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

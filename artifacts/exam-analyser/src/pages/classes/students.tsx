import { useListStudents, useCreateStudent, useDeleteStudent, useGetClass, getListStudentsQueryKey, getGetClassQueryKey } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, User, Trash2, Upload, Phone, ChevronDown, ChevronUp, Camera, Sparkles, Loader2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  admissionNo: z.string().min(1, "Admission number is required"),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  parentEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  nationality: z.string().optional(),
  notes: z.string().optional(),
});

export default function Students() {
  const [, params] = useRoute("/classes/:classId/students");
  const classId = parseInt(params?.classId || "0");
  const [, navigate] = useLocation();

  const { data: cls } = useGetClass(classId, { query: { enabled: !!classId, queryKey: getGetClassQueryKey(classId) } });
  const { data: students, isLoading } = useListStudents({ classId }, { query: { enabled: !!classId, queryKey: getListStudentsQueryKey({ classId }) } });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const scanFileRef = useRef<HTMLInputElement>(null);
  const scanCameraRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  function closeDialog() {
    setIsDialogOpen(false);
    setShowExtra(false);
    setOcrPreview(null);
    setOcrLoading(false);
    form.reset();
  }

  const createStudent = useCreateStudent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey({ classId }) });
        closeDialog();
        toast({ title: "Student added successfully" });
      },
      onError: () => { toast({ title: "Failed to add student", variant: "destructive" }); }
    }
  });

  const deleteStudent = useDeleteStudent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey({ classId }) });
        toast({ title: "Student removed" });
      },
      onError: () => { toast({ title: "Failed to remove student", variant: "destructive" }); }
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", admissionNo: "", gender: "M", dateOfBirth: "", parentName: "", parentPhone: "", parentEmail: "", nationality: "Kenyan", notes: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createStudent.mutate({ data: { ...values, classId, parentEmail: values.parentEmail || undefined } });
  }

  async function handleOcrScan(file: File) {
    setOcrLoading(true);
    const reader = new FileReader();
    reader.onload = e => setOcrPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/ocr/student", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      if (data.name) form.setValue("name", data.name);
      if (data.admissionNo) form.setValue("admissionNo", data.admissionNo);
      if (data.gender === "M" || data.gender === "F") form.setValue("gender", data.gender);
      if (data.dateOfBirth) form.setValue("dateOfBirth", data.dateOfBirth);
      if (data.parentName) { form.setValue("parentName", data.parentName); setShowExtra(true); }
      if (data.parentPhone) { form.setValue("parentPhone", data.parentPhone); setShowExtra(true); }
      if (data.parentEmail) { form.setValue("parentEmail", data.parentEmail); setShowExtra(true); }
      if (data.nationality) form.setValue("nationality", data.nationality);
      if (data.notes) form.setValue("notes", data.notes);
      toast({ title: "Form scanned!", description: "Fields pre-filled. Review and correct as needed." });
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
      setOcrPreview(null);
    } finally {
      setOcrLoading(false);
    }
  }

  return (
    <Layout>
      <Header
        title="Students"
        breadcrumbs={[{ label: "Classes", href: "/classes" }, { label: cls?.name || "Loading...", href: `/classes/${classId}/students` }, { label: "Students" }]}
      />
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <p className="text-muted-foreground text-sm">Manage students in {cls?.name || "this class"}.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/students/import?classId=${classId}`)} className="gap-2">
              <Upload className="w-4 h-4" /> Import Excel
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={open => { if (!open) closeDialog(); else setIsDialogOpen(true); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Student</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>

                {/* OCR Scan Section */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Scan a registration form or admission card
                    </div>
                    {ocrPreview && (
                      <button type="button" onClick={() => setOcrPreview(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {ocrPreview ? (
                    <img src={ocrPreview} alt="Scanned form" className="max-h-32 rounded-md object-contain mx-auto" />
                  ) : (
                    <p className="text-xs text-muted-foreground">AI will read the photo and fill in the fields below automatically.</p>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={ocrLoading} onClick={() => scanCameraRef.current?.click()}>
                      {ocrLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                      Take Photo
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={ocrLoading} onClick={() => scanFileRef.current?.click()}>
                      {ocrLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload Image
                    </Button>
                  </div>
                  {ocrLoading && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" /> Reading form with AI…
                    </p>
                  )}
                  <input ref={scanCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleOcrScan(f); e.target.value = ""; }} />
                  <input ref={scanFileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleOcrScan(f); e.target.value = ""; }} />
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Core fields */}
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="admissionNo" render={({ field }) => (
                      <FormItem><FormLabel>Admission Number *</FormLabel><FormControl><Input placeholder="ADM-001" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem><FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem></SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                        <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    {/* Toggle extra fields */}
                    <button type="button" onClick={() => setShowExtra(v => !v)}
                      className="flex items-center gap-2 text-sm text-primary hover:underline w-full">
                      {showExtra ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {showExtra ? "Hide" : "Add"} parent & contact details
                    </button>

                    {showExtra && (
                      <div className="space-y-4 pt-2 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="parentName" render={({ field }) => (
                            <FormItem><FormLabel>Parent / Guardian Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="parentPhone" render={({ field }) => (
                            <FormItem><FormLabel>Parent Phone</FormLabel><FormControl><Input placeholder="+254712345678" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="parentEmail" render={({ field }) => (
                          <FormItem><FormLabel>Parent Email</FormLabel><FormControl><Input type="email" placeholder="parent@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="nationality" render={({ field }) => (
                            <FormItem><FormLabel>Nationality</FormLabel><FormControl><Input placeholder="Kenyan" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="notes" render={({ field }) => (
                          <FormItem><FormLabel>Notes</FormLabel><FormControl><Input placeholder="Any special notes..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={createStudent.isPending}>
                      {createStudent.isPending ? "Adding..." : "Add Student"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : students?.length ? (
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="divide-y">
              {students.map(student => (
                <div key={student.id}>
                  <div
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-secondary text-secondary-foreground p-2 rounded-full">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.admissionNo} · {student.gender === 'M' ? 'Male' : student.gender === 'F' ? 'Female' : ''}
                          {student.parentPhone && <span className="ml-2 inline-flex items-center gap-1"><Phone className="h-3 w-3" />{student.parentPhone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedStudent === student.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={e => e.stopPropagation()}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Student</AlertDialogTitle>
                            <AlertDialogDescription>This will remove {student.name} and delete all their exam scores.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteStudent.mutate({ id: student.id })}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Expanded biodata */}
                  {expandedStudent === student.id && (
                    <div className="px-4 pb-4 bg-muted/20 border-t">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-sm">
                        <div><div className="text-xs text-muted-foreground mb-0.5">Date of Birth</div><div className="font-medium">{student.dateOfBirth || "—"}</div></div>
                        <div><div className="text-xs text-muted-foreground mb-0.5">Nationality</div><div className="font-medium">{student.nationality || "—"}</div></div>
                        <div><div className="text-xs text-muted-foreground mb-0.5">Parent / Guardian</div><div className="font-medium">{student.parentName || "—"}</div></div>
                        <div><div className="text-xs text-muted-foreground mb-0.5">Parent Phone</div><div className="font-medium">{student.parentPhone || "—"}</div></div>
                        <div><div className="text-xs text-muted-foreground mb-0.5">Parent Email</div><div className="font-medium">{student.parentEmail || "—"}</div></div>
                        {student.notes && <div className="col-span-2 md:col-span-3"><div className="text-xs text-muted-foreground mb-0.5">Notes</div><div className="font-medium">{student.notes}</div></div>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No students yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">Add students manually or import from Excel.</p>
            <Button variant="outline" onClick={() => navigate(`/students/import?classId=${classId}`)} className="gap-2">
              <Upload className="w-4 h-4" /> Import from Excel
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

import { useListClasses } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { authFetch } from "@/lib/supabase";
import { CheckSquare, Square, FileText, Users, CheckCircle2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Exam name is required"),
  year: z.coerce.number().min(2000, "Valid year required"),
  term: z.coerce.number().min(1).max(3),
  openingDate: z.string().optional(),
  closingDate: z.string().optional(),
  status: z.enum(["draft", "active", "closed"]).default("draft"),
});

export default function BulkCreateExam() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: classes, isLoading } = useListClasses();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ className: string; id: number }[] | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      year: new Date().getFullYear(),
      term: 1,
      status: "draft",
      openingDate: "",
      closingDate: "",
    },
  });

  function toggleAll() {
    if (!classes) return;
    if (selectedIds.size === classes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(classes.map(c => c.id)));
    }
  }

  function toggle(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (selectedIds.size === 0) {
      toast({ title: "Select at least one class", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/api/exams/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          openingDate: values.openingDate || undefined,
          closingDate: values.closingDate || undefined,
          classIds: Array.from(selectedIds),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create exams");
      }
      const data = await res.json();
      setCreated(data.exams.map((e: any) => ({ className: e.className, id: e.id })));
      toast({ title: `${data.count} exam${data.count !== 1 ? "s" : ""} created successfully` });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <Layout>
        <Header
          title="Bulk Exam Created"
          breadcrumbs={[{ label: "Classes", href: "/classes" }, { label: "Bulk Create Exam" }]}
        />
        <div className="p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-1">{created.length} Exam{created.length !== 1 ? "s" : ""} Created</h2>
            <p className="text-muted-foreground mb-6">"{form.getValues("name")}" has been set up for the selected classes.</p>
          </div>

          <Card>
            <CardContent className="p-0 divide-y">
              {created.map((e, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary p-2 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{e.className}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/classes/${created.find(c => c.id === e.id)?.id}/exams`)}>
                    View Exams
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/classes")}>
              Back to Classes
            </Button>
            <Button className="flex-1" onClick={() => { setCreated(null); form.reset(); setSelectedIds(new Set()); }}>
              Create Another
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header
        title="Bulk Create Exam"
        breadcrumbs={[{ label: "Classes", href: "/classes" }, { label: "Bulk Create Exam" }]}
      />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
        <p className="text-muted-foreground text-sm">
          Define the exam once and apply it to multiple classes at the same time.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Exam details */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Exam Details</h3>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Name</FormLabel>
                    <FormControl><Input placeholder="End of Term 1 2025" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="year" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="term" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Term</FormLabel>
                      <FormControl><Input type="number" min="1" max="3" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="openingDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Date <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="closingDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closing Date <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft (Setup)</SelectItem>
                        <SelectItem value="active">Active (Data Entry)</SelectItem>
                        <SelectItem value="closed">Closed (Published)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Class selection */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Apply to Classes</h3>
                  {classes && classes.length > 0 && (
                    <button type="button" onClick={toggleAll} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                      {selectedIds.size === classes.length
                        ? <><CheckSquare className="w-4 h-4" /> Deselect All</>
                        : <><Square className="w-4 h-4" /> Select All</>
                      }
                    </button>
                  )}
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : classes?.length ? (
                  <div className="space-y-2">
                    {classes.map(cls => (
                      <label
                        key={cls.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedIds.has(cls.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={selectedIds.has(cls.id)}
                          onCheckedChange={() => toggle(cls.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{cls.name}</div>
                          <div className="text-xs text-muted-foreground">{cls.year} · Term {cls.term}</div>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          {cls.studentCount ?? 0}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No classes found. Create classes first.</p>
                )}

                {selectedIds.size > 0 && (
                  <p className="text-sm text-primary font-medium pt-1">
                    {selectedIds.size} class{selectedIds.size !== 1 ? "es" : ""} selected
                  </p>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" size="lg" disabled={submitting || selectedIds.size === 0}>
              {submitting
                ? "Creating exams…"
                : selectedIds.size > 0
                  ? `Create Exam for ${selectedIds.size} Class${selectedIds.size !== 1 ? "es" : ""}`
                  : "Select at least one class"
              }
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}

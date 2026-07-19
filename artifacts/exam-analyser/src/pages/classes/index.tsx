import { useListClasses, useCreateClass, useDeleteClass, getListClassesQueryKey } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, BookOpen, TrendingUp, Trash2, Layers, UserCog, Check } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authFetch } from "@/lib/supabase";
import { useIsStaff } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  year: z.coerce.number().min(2000, "Valid year required"),
  term: z.coerce.number().min(1).max(3, "Term must be 1, 2, or 3"),
  classTeacherName: z.string().optional(),
});

type AppUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
};

function displayName(u: AppUser) {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return full || u.email || u.id.slice(0, 8);
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-rose-100 text-rose-700 border-rose-200",
  principal: "bg-purple-100 text-purple-700 border-purple-200",
  deputy: "bg-indigo-100 text-indigo-700 border-indigo-200",
  teacher: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Classes() {
  const { data: classes, isLoading } = useListClasses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignClass, setAssignClass] = useState<{ id: number; name: string; teacherId?: string | null } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const isStaff = useIsStaff();

  // ── Users list for assign-teacher dialog ──
  const { data: users = [] } = useQuery<AppUser[]>({
    queryKey: ["/api/users"],
    queryFn: () => authFetch("/api/users").then(r => r.json()),
    enabled: isStaff,
    staleTime: 60_000,
  });

  // ── Assign teacher mutation ──
  const assignTeacher = useMutation({
    mutationFn: ({ classId, userId }: { classId: number; userId: string | null }) =>
      authFetch(`/api/classes/${classId}/teacher`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
      setAssignClass(null);
      setSelectedUserId(null);
      setUserSearch("");
      toast({ title: "Class teacher updated" });
    },
    onError: () => toast({ title: "Failed to update class teacher", variant: "destructive" }),
  });

  // ── Create class ──
  const createClass = useCreateClass({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
        setIsDialogOpen(false);
        toast({ title: "Class created successfully" });
        form.reset();
      },
      onError: () => toast({ title: "Failed to create class", variant: "destructive" }),
    }
  });

  // ── Delete class ──
  const deleteClass = useDeleteClass({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
        toast({ title: "Class deleted" });
      },
      onError: () => toast({ title: "Failed to delete class", variant: "destructive" }),
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", year: new Date().getFullYear(), term: 1, classTeacherName: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createClass.mutate({ data: values });
  }

  function openAssignDialog(cls: { id: number; name: string; teacherId?: string | null }) {
    setAssignClass(cls);
    setSelectedUserId(cls.teacherId ?? null);
    setUserSearch("");
  }

  function handleAssignConfirm() {
    if (!assignClass) return;
    assignTeacher.mutate({ classId: assignClass.id, userId: selectedUserId });
  }

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return displayName(u).toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  return (
    <Layout>
      <Header title="Classes" />
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <p className="text-muted-foreground text-sm">Manage school classes and streams.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/exams/bulk-create")} className="gap-2">
              <Layers className="w-4 h-4" /> Bulk Create Exam
            </Button>
            {isStaff && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Class</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Class</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Class Name (e.g. Grade 7A)</FormLabel>
                          <FormControl><Input placeholder="Grade 7A" {...field} /></FormControl>
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
                            <FormControl><Input type="number" min={1} max={3} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="classTeacherName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Class Teacher Name (optional)</FormLabel>
                          <FormControl><Input placeholder="Mrs. Wanjiru" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createClass.isPending}>
                          {createClass.isPending ? "Creating…" : "Create Class"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 w-full" />)}
          </div>
        ) : classes?.length ? (
          <div className="grid md:grid-cols-2 gap-4">
            {classes.map(cls => {
              const teacher = users.find(u => u.id === (cls as any).teacherId);
              return (
                <Card key={cls.id} className="hover:shadow-md transition-shadow group relative overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0 flex-1 mr-3">
                          <h3 className="font-bold text-xl truncate">{cls.name}</h3>
                          <p className="text-sm text-muted-foreground">{cls.year} · Term {cls.term}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                            {cls.studentCount || 0} Students
                          </div>
                          {isStaff && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Assign class teacher"
                              onClick={() => openAssignDialog({ id: cls.id, name: cls.name, teacherId: (cls as any).teacherId })}
                            >
                              <UserCog className="w-4 h-4" />
                            </Button>
                          )}
                          {isStaff && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete class"
                              onClick={() => {
                                if (confirm(`Delete "${cls.name}"? This cannot be undone.`)) {
                                  deleteClass.mutate({ id: cls.id });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Teacher display */}
                      <div className="flex items-center gap-2 min-h-[22px]">
                        {teacher ? (
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <UserCog className="w-3.5 h-3.5" />
                            {displayName(teacher)}
                            <Badge
                              className={cn("text-[10px] px-1.5 py-0 border", ROLE_COLORS[teacher.role] ?? ROLE_COLORS.teacher)}
                              variant="outline"
                            >
                              {teacher.role}
                            </Badge>
                          </p>
                        ) : cls.classTeacherName ? (
                          <p className="text-sm text-muted-foreground">{cls.classTeacherName}</p>
                        ) : isStaff ? (
                          <button
                            className="text-xs text-muted-foreground/60 hover:text-primary flex items-center gap-1 transition-colors"
                            onClick={() => openAssignDialog({ id: cls.id, name: cls.name, teacherId: null })}
                          >
                            <UserCog className="w-3 h-3" /> Assign class teacher
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 border-t divide-x">
                      <Link href={`/classes/${cls.id}/students`} className="flex items-center justify-center p-3 text-sm font-medium hover:bg-muted transition-colors">
                        <Users className="w-4 h-4 mr-1.5" /> Students
                      </Link>
                      <Link href={`/classes/${cls.id}/exams`} className="flex items-center justify-center p-3 text-sm font-medium hover:bg-muted transition-colors">
                        <BookOpen className="w-4 h-4 mr-1.5" /> Exams
                      </Link>
                      <Link href={`/trends/class/${cls.id}`} className="flex items-center justify-center p-3 text-sm font-medium hover:bg-muted transition-colors text-blue-600">
                        <TrendingUp className="w-4 h-4 mr-1.5" /> Trends
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No classes found</h3>
            <p className="text-muted-foreground mt-1">Create your first class to get started.</p>
          </div>
        )}
      </div>

      {/* ── Assign Class Teacher Dialog ── */}
      <Dialog open={!!assignClass} onOpenChange={open => { if (!open) { setAssignClass(null); setSelectedUserId(null); setUserSearch(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Class Teacher</DialogTitle>
            <DialogDescription>
              Pick a teacher for <strong>{assignClass?.name}</strong>. Only teachers who have signed in appear here.
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <Input
            placeholder="Search by name or email…"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="mt-1"
          />

          {/* User list */}
          <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border divide-y">
            {/* Unassign option */}
            <button
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left",
                selectedUserId === null && "bg-primary/5"
              )}
              onClick={() => setSelectedUserId(null)}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                selectedUserId === null ? "border-primary bg-primary" : "border-muted-foreground/30"
              )}>
                {selectedUserId === null && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </div>
              <span className="text-muted-foreground italic">No teacher assigned</span>
            </button>

            {filteredUsers.length === 0 && userSearch && (
              <p className="px-4 py-6 text-sm text-center text-muted-foreground">No users match "{userSearch}"</p>
            )}

            {filteredUsers.map(u => (
              <button
                key={u.id}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left",
                  selectedUserId === u.id && "bg-primary/5"
                )}
                onClick={() => setSelectedUserId(u.id)}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                  selectedUserId === u.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                )}>
                  {selectedUserId === u.id && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{displayName(u)}</p>
                  {u.email && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                </div>
                <Badge
                  className={cn("text-[10px] px-1.5 py-0 border flex-shrink-0", ROLE_COLORS[u.role] ?? ROLE_COLORS.teacher)}
                  variant="outline"
                >
                  {u.role}
                </Badge>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setAssignClass(null); setSelectedUserId(null); }}>
              Cancel
            </Button>
            <Button onClick={handleAssignConfirm} disabled={assignTeacher.isPending}>
              {assignTeacher.isPending ? "Saving…" : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

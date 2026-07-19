import { useGetSchool, useUpdateSchool, getGetSchoolQueryKey } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, GraduationCap, BarChart3, PenLine, Users2, Shield } from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";
import { authFetch } from "@/lib/supabase";
import { useIsStaff } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(1, "School name is required"),
  address: z.string().optional(),
  motto: z.string().optional(),
  principalName: z.string().optional(),
  term1StartDate: z.string().optional(),
  term1EndDate: z.string().optional(),
  term2StartDate: z.string().optional(),
  term2EndDate: z.string().optional(),
  term3StartDate: z.string().optional(),
  term3EndDate: z.string().optional(),
  rubricEe2: z.coerce.number().int().min(1).max(100).optional(),
  rubricEe1: z.coerce.number().int().min(1).max(100).optional(),
  rubricMe2: z.coerce.number().int().min(1).max(100).optional(),
  rubricMe1: z.coerce.number().int().min(1).max(100).optional(),
  rubricAe2: z.coerce.number().int().min(1).max(100).optional(),
  rubricAe1: z.coerce.number().int().min(1).max(100).optional(),
  rubricBe2: z.coerce.number().int().min(0).max(100).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const RUBRIC_GRADES = [
  { key: "rubricEe2" as const, label: "EE2", description: "Exceeds Expectation (high)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { key: "rubricEe1" as const, label: "EE1", description: "Exceeds Expectation", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { key: "rubricMe2" as const, label: "ME2", description: "Meets Expectation (high)", color: "text-blue-700 bg-blue-50 border-blue-200" },
  { key: "rubricMe1" as const, label: "ME1", description: "Meets Expectation", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "rubricAe2" as const, label: "AE2", description: "Approaching Expectation (high)", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { key: "rubricAe1" as const, label: "AE1", description: "Approaching Expectation", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "rubricBe2" as const, label: "BE2", description: "Below Expectation (high)", color: "text-red-600 bg-red-50 border-red-200" },
];

type AppUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
};

const ROLES = ["teacher", "admin", "principal", "deputy"] as const;

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-rose-100 text-rose-700 border-rose-200",
  principal: "bg-purple-100 text-purple-700 border-purple-200",
  deputy: "bg-indigo-100 text-indigo-700 border-indigo-200",
  teacher: "bg-slate-100 text-slate-600 border-slate-200",
};

function userDisplayName(u: AppUser) {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return full || u.email || u.id.slice(0, 8);
}

export default function Settings() {
  const { data: school, isLoading } = useGetSchool();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isStaff = useIsStaff();

  const updateSchool = useUpdateSchool({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSchoolQueryKey() });
        toast({ title: "Settings saved successfully" });
      },
      onError: () => {
        toast({ title: "Failed to save settings", variant: "destructive" });
      }
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      motto: "",
      principalName: "",
      term1StartDate: "",
      term1EndDate: "",
      term2StartDate: "",
      term2EndDate: "",
      term3StartDate: "",
      term3EndDate: "",
      rubricEe2: 86,
      rubricEe1: 70,
      rubricMe2: 55,
      rubricMe1: 40,
      rubricAe2: 25,
      rubricAe1: 10,
      rubricBe2: 5,
    },
  });

  const initialized = useRef(false);
  const [mySignature, setMySignature] = useState<string | null>(null);
  const [savingSignature, setSavingSignature] = useState(false);

  useEffect(() => {
    authFetch("/api/me")
      .then(r => r.json())
      .then(d => setMySignature(d.signatureData ?? null))
      .catch(() => {});
  }, []);

  const handleSaveSignature = async () => {
    setSavingSignature(true);
    try {
      if (!mySignature) {
        await authFetch("/api/me/signature", { method: "DELETE" });
      } else {
        await authFetch("/api/me/signature", {
          method: "PATCH",
          body: JSON.stringify({ signatureData: mySignature }),
          headers: { "Content-Type": "application/json" },
        });
      }
      toast({ title: "Signature saved" });
    } catch {
      toast({ title: "Failed to save signature", variant: "destructive" });
    } finally {
      setSavingSignature(false);
    }
  };

  useEffect(() => {
    if (school && !initialized.current) {
      form.reset({
        name: school.name || "",
        address: school.address || "",
        motto: school.motto || "",
        principalName: school.principalName || "",
        term1StartDate: school.term1StartDate || "",
        term1EndDate: school.term1EndDate || "",
        term2StartDate: school.term2StartDate || "",
        term2EndDate: school.term2EndDate || "",
        term3StartDate: school.term3StartDate || "",
        term3EndDate: school.term3EndDate || "",
        rubricEe2: school.rubricEe2 ?? 86,
        rubricEe1: school.rubricEe1 ?? 70,
        rubricMe2: school.rubricMe2 ?? 55,
        rubricMe1: school.rubricMe1 ?? 40,
        rubricAe2: school.rubricAe2 ?? 25,
        rubricAe1: school.rubricAe1 ?? 10,
        rubricBe2: school.rubricBe2 ?? 5,
      });
      initialized.current = true;
    }
  }, [school, form]);

  function onSubmit(values: FormValues) {
    updateSchool.mutate({ data: values });
  }

  if (isLoading) {
    return (
      <Layout>
        <Header title="School Settings" />
        <div className="p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="School Settings" />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ── School Information ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  School Information
                </CardTitle>
                <CardDescription>
                  These details appear on official documents and student reports.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormControl><Input placeholder="Elimu Junior Secondary" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="motto" render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Motto</FormLabel>
                    <FormControl><Input placeholder="Striving for Excellence" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="principalName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Principal's Name</FormLabel>
                    <FormControl><Input placeholder="Mr. John Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Physical Address / P.O. Box</FormLabel>
                    <FormControl><Textarea placeholder="P.O. Box 12345, Nairobi" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* ── Term Dates ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Term Dates
                </CardTitle>
                <CardDescription>
                  Academic calendar for the current school year. Used on reports and dashboards.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {([1, 2, 3] as const).map((term) => (
                  <div key={term}>
                    <p className="text-sm font-semibold text-slate-700 mb-3">Term {term}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`term${term}StartDate` as "term1StartDate" | "term2StartDate" | "term3StartDate"}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`term${term}EndDate` as "term1EndDate" | "term2EndDate" | "term3EndDate"}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {term < 3 && <div className="mt-4 border-b border-dashed border-slate-100" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* ── Grading Rubric ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Grading Rubric Thresholds
                </CardTitle>
                <CardDescription>
                  Set the minimum percentage (%) each grade requires. Affects all reports, rankings, and AI insights. BE1 is automatically assigned to anything below BE2.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {RUBRIC_GRADES.map(({ key, label, description, color }) => (
                    <FormField key={key} control={form.control} name={key} render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-4">
                          <span className={`inline-flex items-center justify-center w-12 h-8 rounded-md border text-xs font-bold flex-shrink-0 ${color}`}>
                            {label}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-600">{description}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-sm text-muted-foreground">≥</span>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                className="w-20 text-center"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <FormMessage className="ml-16" />
                      </FormItem>
                    )} />
                  ))}

                  <div className="mt-2 flex items-center gap-4 opacity-50">
                    <span className="inline-flex items-center justify-center w-12 h-8 rounded-md border text-xs font-bold flex-shrink-0 text-red-500 bg-red-50 border-red-200">
                      BE1
                    </span>
                    <span className="text-sm text-slate-600">Below Expectation — everything below BE2</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── My Signature ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenLine className="h-5 w-5 text-primary" />
                  My Signature
                </CardTitle>
                <CardDescription>
                  Draw or upload your handwritten signature. It will appear on student reports you sign. Digital signatures are rendered in blue so they look authentic on paper.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SignaturePad
                  value={mySignature}
                  onChange={setMySignature}
                />
                <Button
                  type="button"
                  onClick={handleSaveSignature}
                  disabled={savingSignature}
                  className="px-6"
                >
                  {savingSignature ? "Saving…" : "Save Signature"}
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end pb-8">
              <Button type="submit" disabled={updateSchool.isPending} className="px-8">
                {updateSchool.isPending ? "Saving…" : "Save All Settings"}
              </Button>
            </div>
          </form>
        </Form>

        {/* ── Users & Roles ── */}
        {isStaff && <UsersAndRoles />}

      </div>
    </Layout>
  );
}

function UsersAndRoles() {
  const { toast } = useToast();
  const [changingId, setChangingId] = useState<string | null>(null);

  const { data: users = [], isLoading, refetch } = useQuery<AppUser[]>({
    queryKey: ["/api/users"],
    queryFn: () => authFetch("/api/users").then(r => r.json()),
    staleTime: 30_000,
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      authFetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }).then(r => r.json()),
    onSuccess: () => {
      refetch();
      setChangingId(null);
      toast({ title: "Role updated successfully" });
    },
    onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
  });

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Users &amp; Roles
        </CardTitle>
        <CardDescription>
          All teachers who have signed in appear here. Change a user's role to grant or restrict access.
          The first admin must be set manually via SQL — after that, admins can promote others here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No users have signed in yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{userDisplayName(u)}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">
                      {u.email ?? <span className="italic opacity-50">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {changingId === u.id ? (
                        <Select
                          defaultValue={u.role}
                          onValueChange={role => changeRole.mutate({ userId: u.id, role })}
                          disabled={changeRole.isPending}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(r => (
                              <SelectItem key={r} value={r} className="text-xs capitalize">
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn("text-xs border capitalize cursor-pointer hover:opacity-80 transition-opacity", ROLE_COLORS[u.role] ?? ROLE_COLORS.teacher)}
                            variant="outline"
                            onClick={() => setChangingId(u.id)}
                            title="Click to change role"
                          >
                            {u.role}
                          </Badge>
                          <button
                            className="text-xs text-muted-foreground/50 hover:text-primary transition-colors"
                            onClick={() => setChangingId(u.id)}
                            title="Change role"
                          >
                            edit
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          <strong>teacher</strong> — enters scores for assigned class only &nbsp;·&nbsp;
          <strong>admin / principal / deputy</strong> — full access to all classes
        </p>
      </CardContent>
    </Card>
  );
}

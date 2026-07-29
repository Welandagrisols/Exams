import { useGetClass, useListExams, useCreateExam, useDeleteExam, getListExamsQueryKey, getGetClassQueryKey } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Calendar, Trash2, BarChart2, Edit3, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  year: z.coerce.number().min(2000, "Valid year required"),
  term: z.coerce.number().min(1).max(3),
  openingDate: z.string().optional(),
  closingDate: z.string().optional(),
  status: z.enum(["draft", "active", "closed"]).default("draft"),
});

export default function ClassExams() {
  const [, params] = useRoute("/classes/:classId/exams");
  const classId = parseInt(params?.classId || "0");
  
  const { data: cls } = useGetClass(classId, { query: { enabled: !!classId, queryKey: getGetClassQueryKey(classId) } });
  const { data: exams, isLoading } = useListExams({ classId }, { query: { enabled: !!classId, queryKey: getListExamsQueryKey({ classId }) } });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createExam = useCreateExam({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExamsQueryKey({ classId }) });
        setIsDialogOpen(false);
        toast({ title: "Exam created successfully" });
        form.reset();
      },
      onError: () => {
        toast({ title: "Failed to create exam", variant: "destructive" });
      }
    }
  });

  const deleteExam = useDeleteExam({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExamsQueryKey({ classId }) });
        toast({ title: "Exam deleted" });
      },
      onError: () => {
        toast({ title: "Failed to delete exam", variant: "destructive" });
      }
    }
  });

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

  function onSubmit(values: z.infer<typeof formSchema>) {
    createExam.mutate({ data: { ...values, classId } });
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'closed': return <Badge variant="secondary">Closed</Badge>;
      default: return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <Layout>
      <Header 
        title="Exams" 
        breadcrumbs={[
          { label: "Classes", href: "/classes" },
          { label: cls?.name || "Loading...", href: `/classes/${classId}/exams` },
          { label: "Exams" }
        ]}
      />
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">Manage exams for {cls?.name || "this class"}.</p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" /> Create Exam
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Exam</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exam Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Mid-Term 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="term"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Term</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" max="3" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="openingDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opening Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="closingDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closing Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft (Setup)</SelectItem>
                            <SelectItem value="active">Active (Data Entry)</SelectItem>
                            <SelectItem value="closed">Closed (Published)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createExam.isPending}>
                    {createExam.isPending ? "Creating..." : "Create Exam"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : exams?.length ? (
          <div className="space-y-4">
            {exams.map(exam => (
              <Card key={exam.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 text-primary p-3 rounded-xl hidden sm:block">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{exam.name}</h3>
                          {getStatusBadge(exam.status || "draft")}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground gap-4">
                          <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> Term {exam.term}, {exam.year}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2 mt-4 md:mt-0">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{exam.name}" and all associated student scores. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => deleteExam.mutate({ id: exam.id })}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 border-t divide-x bg-muted/20">
                    <Link href={`/exams/${exam.id}/scores`} className="flex items-center justify-center p-3 text-sm font-medium hover:bg-muted transition-colors text-primary">
                      <Edit3 className="w-4 h-4 mr-2" /> Scores
                    </Link>
                    <Link href={`/exams/${exam.id}/analytics`} className="flex items-center justify-center p-3 text-sm font-medium hover:bg-muted transition-colors">
                      <BarChart2 className="w-4 h-4 mr-2" /> Analytics
                    </Link>
                    <Link href={`/exams/${exam.id}/rankings`} className="flex items-center justify-center p-3 text-sm font-medium hover:bg-muted transition-colors">
                      <Award className="w-4 h-4 mr-2" /> Rankings
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No exams found</h3>
            <p className="text-muted-foreground mt-1">Create the first exam for this class.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

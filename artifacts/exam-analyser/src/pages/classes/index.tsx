import { useListClasses, useCreateClass, useDeleteClass } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, BookOpen, TrendingUp, Trash2, Layers } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getListClassesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  year: z.coerce.number().min(2000, "Valid year required"),
  term: z.coerce.number().min(1).max(3, "Term must be 1, 2, or 3"),
  classTeacherName: z.string().optional(),
});

export default function Classes() {
  const { data: classes, isLoading } = useListClasses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const createClass = useCreateClass({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
        setIsDialogOpen(false);
        toast({ title: "Class created successfully" });
        form.reset();
      },
      onError: () => {
        toast({ title: "Failed to create class", variant: "destructive" });
      }
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      year: new Date().getFullYear(),
      term: 1,
      classTeacherName: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createClass.mutate({ data: values });
  }

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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Add Class
                </Button>
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
                          <FormControl><Input type="number" min="1" max="3" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="classTeacherName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class Teacher</FormLabel>
                        <FormControl><Input placeholder="Mr. Smith" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={createClass.isPending}>
                      {createClass.isPending ? "Creating..." : "Create Class"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : classes?.length ? (
          <div className="grid md:grid-cols-2 gap-4">
            {classes.map(cls => (
              <Card key={cls.id} className="hover:shadow-md transition-shadow group relative overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-xl">{cls.name}</h3>
                        <p className="text-sm text-muted-foreground">{cls.year} • Term {cls.term}</p>
                      </div>
                      <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                        {cls.studentCount || 0} Students
                      </div>
                    </div>
                    {cls.classTeacherName && (
                      <p className="text-sm text-muted-foreground mb-4">Teacher: {cls.classTeacherName}</p>
                    )}
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
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No classes found</h3>
            <p className="text-muted-foreground mt-1">Create your first class to get started.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

import { useListLearningAreas, useCreateLearningArea, useDeleteLearningArea, getListLearningAreasQueryKey } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
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

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  abbreviation: z.string().min(1, "Abbreviation is required").max(10, "Max 10 chars"),
  maxMarks: z.coerce.number().min(1, "Max marks must be > 0").default(100),
  sortOrder: z.coerce.number().default(0),
});

export default function LearningAreas() {
  const { data: areas, isLoading } = useListLearningAreas();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createArea = useCreateLearningArea({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLearningAreasQueryKey() });
        setIsDialogOpen(false);
        toast({ title: "Learning area created successfully" });
        form.reset();
      },
      onError: () => {
        toast({ title: "Failed to create learning area", variant: "destructive" });
      }
    }
  });

  const deleteArea = useDeleteLearningArea({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLearningAreasQueryKey() });
        toast({ title: "Learning area deleted" });
      },
      onError: () => {
        toast({ title: "Failed to delete learning area", variant: "destructive" });
      }
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      maxMarks: 100,
      sortOrder: 0,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createArea.mutate({ data: values });
  }

  return (
    <Layout>
      <Header title="Learning Areas" />
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">Manage CBC subjects and max marks.</p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" /> Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Learning Area</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (e.g. Mathematics)</FormLabel>
                        <FormControl>
                          <Input placeholder="Mathematics" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="abbreviation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Abbreviation (e.g. MATH)</FormLabel>
                        <FormControl>
                          <Input placeholder="MATH" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maxMarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Marks</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sortOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sort Order</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createArea.isPending}>
                    {createArea.isPending ? "Creating..." : "Create"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : areas?.length ? (
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="divide-y">
              {areas.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(area => (
                <div key={area.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary p-2 rounded-md">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium">{area.name}</div>
                      <div className="text-sm text-muted-foreground">{area.abbreviation} • Max: {area.maxMarks}</div>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the learning area and all associated scores. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => deleteArea.mutate({ id: area.id })}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No learning areas found</h3>
            <p className="text-muted-foreground mt-1">Add subjects to start recording marks.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

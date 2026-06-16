import { useGetSchool, useUpdateSchool, getGetSchoolQueryKey } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().min(1, "School name is required"),
  address: z.string().optional(),
  motto: z.string().optional(),
  principalName: z.string().optional(),
});

export default function Settings() {
  const { data: school, isLoading } = useGetSchool();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      motto: "",
      principalName: "",
    },
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (school && !initialized.current) {
      form.reset({
        name: school.name || "",
        address: school.address || "",
        motto: school.motto || "",
        principalName: school.principalName || "",
      });
      initialized.current = true;
    }
  }, [school, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateSchool.mutate({ data: values });
  }

  return (
    <Layout>
      <Header title="School Settings" />
      <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>
                These details will appear on official documents and student reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Elimu Junior Secondary" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="motto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Motto</FormLabel>
                        <FormControl>
                          <Input placeholder="Striving for Excellence" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="principalName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Principal's Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Mr. John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Physical Address / P.O. Box</FormLabel>
                        <FormControl>
                          <Textarea placeholder="P.O. Box 12345, Nairobi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={updateSchool.isPending}>
                      {updateSchool.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

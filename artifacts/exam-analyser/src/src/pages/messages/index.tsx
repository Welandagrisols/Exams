import { Layout, Header } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { MessageSquare, Plus, Users, Trash2, ChevronRight, FileText } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/supabase";

type Message = {
  id: number;
  title: string;
  body: string;
  classId: number | null;
  examId: number | null;
  recipientCount: number;
  createdAt: string;
  className: string | null;
  examName: string | null;
};

export default function Messages() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/messages");
      if (!res.ok) throw new Error("Failed to load");
      setMessages(await res.json());
    } catch {
      toast({ title: "Failed to load messages", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    try {
      await authFetch(`/api/messages/${id}`, { method: "DELETE" });
      setMessages(prev => prev.filter(m => m.id !== id));
      toast({ title: "Message deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <Header title="Messages" breadcrumbs={[{ label: "Messages" }]} />
      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <p className="text-muted-foreground text-sm">Send messages and share reports with parents via WhatsApp or email.</p>
          <Button size="sm" onClick={() => navigate("/messages/compose")} className="gap-2">
            <Plus className="w-4 h-4" /> Compose Message
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-dashed">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No messages yet</h3>
            <p className="text-muted-foreground mt-1 mb-4 text-sm">Compose your first message to parents.</p>
            <Button onClick={() => navigate("/messages/compose")} className="gap-2">
              <Plus className="w-4 h-4" /> Compose Message
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => (
              <Card
                key={msg.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/messages/${msg.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base">{msg.title}</h3>
                        {msg.examId && (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            <FileText className="h-3 w-3" /> With Report
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{msg.body}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {msg.recipientCount} recipient{msg.recipientCount !== 1 ? "s" : ""}
                        </span>
                        {msg.className && <span>{msg.className}</span>}
                        <span>{new Date(msg.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 h-8 w-8"
                            onClick={e => e.stopPropagation()}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Message</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete this message and cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={e => { e.stopPropagation(); handleDelete(msg.id); }}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

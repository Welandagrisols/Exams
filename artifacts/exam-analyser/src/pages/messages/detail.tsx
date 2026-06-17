import { Layout, Header } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useRoute, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { MessageSquare, Phone, Mail, FileText, Users, ExternalLink, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Recipient = {
  id: number;
  studentId: number;
  studentName: string;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
};

type MessageDetail = {
  id: number;
  title: string;
  body: string;
  classId: number | null;
  examId: number | null;
  recipientCount: number;
  createdAt: string;
  className: string | null;
  examName: string | null;
  recipients: Recipient[];
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.startsWith("254")) return digits;
  return digits;
}

function personalise(body: string, studentName: string): string {
  return body.replace(/\[Student Name\]/gi, studentName);
}

export default function MessageDetail() {
  const [, params] = useRoute("/messages/:id");
  const msgId = parseInt(params?.id || "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (!msgId) return;
    fetch(`/api/messages/${msgId}`)
      .then(r => r.json())
      .then(setMessage)
      .catch(() => toast({ title: "Failed to load message", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [msgId]);

  const getWhatsAppUrl = (recipient: Recipient) => {
    if (!message || !recipient.parentPhone) return null;
    const phone = normalizePhone(recipient.parentPhone);
    let text = personalise(message.body, recipient.studentName);
    if (message.examId) {
      const reportUrl = `${window.location.origin}/reports/${message.examId}/${recipient.studentId}`;
      text += `\n\n📄 Report card: ${reportUrl}`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const getEmailUrl = (recipient: Recipient) => {
    if (!message || !recipient.parentEmail) return null;
    let body = personalise(message.body, recipient.studentName);
    if (message.examId) {
      const reportUrl = `${window.location.origin}/reports/${message.examId}/${recipient.studentId}`;
      body += `\n\nReport card: ${reportUrl}`;
    }
    return `mailto:${recipient.parentEmail}?subject=${encodeURIComponent(message.title)}&body=${encodeURIComponent(body)}`;
  };

  const copyMessage = async (recipient: Recipient) => {
    if (!message) return;
    let text = personalise(message.body, recipient.studentName);
    if (message.examId) {
      const reportUrl = `${window.location.origin}/reports/${message.examId}/${recipient.studentId}`;
      text += `\n\nReport card: ${reportUrl}`;
    }
    await navigator.clipboard.writeText(text);
    setCopiedId(recipient.id);
    toast({ title: "Message copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return (
    <Layout>
      <Header title="Message" breadcrumbs={[{ label: "Messages", href: "/messages" }, { label: "Loading…" }]} />
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </Layout>
  );

  if (!message) return (
    <Layout>
      <Header title="Message" breadcrumbs={[{ label: "Messages", href: "/messages" }, { label: "Not found" }]} />
      <div className="p-4 md:p-6 text-center text-muted-foreground">Message not found.</div>
    </Layout>
  );

  const withPhone = message.recipients.filter(r => r.parentPhone);
  const withEmail = message.recipients.filter(r => r.parentEmail);
  const noContact = message.recipients.filter(r => !r.parentPhone && !r.parentEmail);

  return (
    <Layout>
      <Header
        title={message.title}
        breadcrumbs={[{ label: "Messages", href: "/messages" }, { label: message.title }]}
      />
      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">

        {/* Message card */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold">{message.title}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {message.recipientCount} recipients</span>
                  {message.className && <span>{message.className}</span>}
                  {message.examName && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <FileText className="h-3.5 w-3.5" /> {message.examName}
                    </span>
                  )}
                  <span>{new Date(message.createdAt).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap border">
              {message.body}
              {message.examId && (
                <div className="mt-3 pt-3 border-t text-muted-foreground">
                  📄 <em>Report card link will be personalised for each student</em>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 text-center border border-green-200/50">
            <div className="text-2xl font-bold text-green-600">{withPhone.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">WhatsApp-ready</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center border border-blue-200/50">
            <div className="text-2xl font-bold text-blue-600">{withEmail.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Email-ready</div>
          </div>
          <div className={cn("rounded-lg p-3 text-center border", noContact.length > 0 ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200/50" : "bg-muted/30")}>
            <div className={cn("text-2xl font-bold", noContact.length > 0 ? "text-orange-500" : "text-muted-foreground")}>{noContact.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">No contact info</div>
          </div>
        </div>

        {/* Recipient list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" /> Send to Parents
            </CardTitle>
            <p className="text-sm text-muted-foreground">Click the buttons to open WhatsApp or email. The message is personalised with each student's name.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {message.recipients.map(recipient => {
                const waUrl = getWhatsAppUrl(recipient);
                const emailUrl = getEmailUrl(recipient);
                const hasContact = waUrl || emailUrl;

                return (
                  <div key={recipient.id} className={cn("flex items-center justify-between gap-3 px-5 py-3.5", !hasContact && "opacity-60")}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{recipient.studentName}</div>
                      <div className="text-xs text-muted-foreground">
                        {recipient.parentName && <span>{recipient.parentName} · </span>}
                        {recipient.parentPhone || recipient.parentEmail || (
                          <span className="flex items-center gap-1 text-orange-500 inline-flex">
                            <AlertCircle className="h-3 w-3" /> No contact info
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {message.examId && (
                        <Button
                          variant="ghost" size="sm" className="gap-1.5 text-xs h-8"
                          onClick={() => window.open(`/reports/${message.examId}/${recipient.studentId}`, "_blank")}
                        >
                          <FileText className="h-3.5 w-3.5" /> Report
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="sm" className="gap-1.5 text-xs h-8"
                        onClick={() => copyMessage(recipient)}
                      >
                        {copiedId === recipient.id ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        Copy
                      </Button>
                      {emailUrl && (
                        <Button
                          variant="outline" size="sm" className="gap-1.5 text-xs h-8"
                          onClick={() => window.open(emailUrl, "_blank")}
                        >
                          <Mail className="h-3.5 w-3.5" /> Email
                        </Button>
                      )}
                      {waUrl && (
                        <Button
                          size="sm" className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => window.open(waUrl, "_blank")}
                        >
                          <Phone className="h-3.5 w-3.5" /> WhatsApp
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

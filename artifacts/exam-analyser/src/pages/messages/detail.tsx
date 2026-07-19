import { Layout, Header } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/supabase";
import { useRoute, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  MessageSquare, Phone, Mail, FileText, Users, Copy, CheckCircle,
  AlertCircle, Smartphone, SendHorizonal, Loader2, Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Recipient = {
  id: number;
  studentId: number;
  studentName: string;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  feeBalance: string | null;
  smsSentAt: string | null;
};

type MessageDetail = {
  id: number;
  type: string;
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
  if (digits.startsWith("7") && digits.length === 9) return "254" + digits;
  return digits;
}

function personalise(body: string, studentName: string, feeBalance?: string | null): string {
  let text = body.replace(/\[Student Name\]/gi, studentName);
  if (feeBalance) {
    text = text.replace(/\[Fee Balance\]/gi, `Ksh ${Number(feeBalance).toLocaleString("en-KE")}`);
  }
  return text;
}

export default function MessageDetail() {
  const [, params] = useRoute("/messages/:id");
  const msgId = parseInt(params?.id || "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const fetchMessage = () => {
    if (!msgId) return;
    authFetch(`/api/messages/${msgId}`)
      .then(r => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then(setMessage)
      .catch(() => toast({ title: "Failed to load message", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMessage(); }, [msgId]);

  const isFeeArrears = message?.type === "fee_arrears";

  const getWhatsAppUrl = (recipient: Recipient) => {
    if (!message || !recipient.parentPhone) return null;
    const phone = normalizePhone(recipient.parentPhone);
    let text = personalise(message.body, recipient.studentName, recipient.feeBalance);
    if (message.examId) {
      const reportUrl = `${window.location.origin}/reports/${message.examId}/${recipient.studentId}`;
      text += `\n\n📄 Report card: ${reportUrl}`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const getEmailUrl = (recipient: Recipient) => {
    if (!message || !recipient.parentEmail) return null;
    let body = personalise(message.body, recipient.studentName, recipient.feeBalance);
    if (message.examId) {
      const reportUrl = `${window.location.origin}/reports/${message.examId}/${recipient.studentId}`;
      body += `\n\nReport card: ${reportUrl}`;
    }
    return `mailto:${recipient.parentEmail}?subject=${encodeURIComponent(message.title)}&body=${encodeURIComponent(body)}`;
  };

  const copyMessage = async (recipient: Recipient) => {
    if (!message) return;
    let text = personalise(message.body, recipient.studentName, recipient.feeBalance);
    if (message.examId) {
      const reportUrl = `${window.location.origin}/reports/${message.examId}/${recipient.studentId}`;
      text += `\n\nReport card: ${reportUrl}`;
    }
    await navigator.clipboard.writeText(text);
    setCopiedId(recipient.id);
    toast({ title: "Message copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendSms = async (recipientId?: number) => {
    if (!message) return;
    const atConfigured = true;
    if (recipientId) setSendingId(recipientId); else setSendingAll(true);

    try {
      const res = await authFetch(`/api/messages/${message.id}/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipientId ? { recipientId } : {}),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "SMS_NOT_CONFIGURED") {
          toast({
            title: "SMS not configured",
            description: "Add AT_API_KEY and AT_USERNAME secrets to enable SMS sending.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.error);
      }

      const { sent, failed, noPhone } = data;
      toast({
        title: `SMS sent to ${sent} parent${sent !== 1 ? "s" : ""}`,
        description: [
          failed > 0 && `${failed} failed`,
          noPhone > 0 && `${noPhone} had no phone`,
        ].filter(Boolean).join(", ") || "All delivered successfully.",
      });
      fetchMessage();
    } catch (err: any) {
      toast({ title: "SMS failed", description: err.message, variant: "destructive" });
    } finally {
      setSendingId(null);
      setSendingAll(false);
    }
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
  const smsSent = message.recipients.filter(r => r.smsSentAt);

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
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold">{message.title}</h2>
                  {isFeeArrears && (
                    <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
                      <Receipt className="h-3 w-3" /> Fee Arrears
                    </Badge>
                  )}
                </div>
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
                  📄 <em>Report card link / marks will be personalised per student when sent</em>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 text-center border border-green-200/50">
            <div className="text-2xl font-bold text-green-600">{withPhone.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">WhatsApp-ready</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center border border-blue-200/50">
            <div className="text-2xl font-bold text-blue-600">{withEmail.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Email-ready</div>
          </div>
          <div className={cn("rounded-lg p-3 text-center border", smsSent.length > 0 ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200/50" : "bg-muted/30")}>
            <div className={cn("text-2xl font-bold", smsSent.length > 0 ? "text-purple-600" : "text-muted-foreground")}>{smsSent.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">SMS Sent</div>
          </div>
          <div className={cn("rounded-lg p-3 text-center border", noContact.length > 0 ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200/50" : "bg-muted/30")}>
            <div className={cn("text-2xl font-bold", noContact.length > 0 ? "text-orange-500" : "text-muted-foreground")}>{noContact.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">No contact</div>
          </div>
        </div>

        {/* Recipient list */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" /> Send to Parents
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {message.examId
                    ? "SMS sends marks in short format (Eng:76, Kisw:80…). WhatsApp/Email sends the full message + report link."
                    : "The message is personalised with each student's name."}
                </p>
              </div>
              {withPhone.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                  onClick={() => sendSms()}
                  disabled={sendingAll}
                >
                  {sendingAll
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                    : <><SendHorizonal className="h-3.5 w-3.5" /> Send All SMS</>
                  }
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {message.recipients.map(recipient => {
                const waUrl = getWhatsAppUrl(recipient);
                const emailUrl = getEmailUrl(recipient);
                const hasContact = waUrl || emailUrl || recipient.parentPhone;
                const isSending = sendingId === recipient.id;

                return (
                  <div key={recipient.id} className={cn("flex items-center justify-between gap-3 px-5 py-3.5", !hasContact && "opacity-60")}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{recipient.studentName}</span>
                        {isFeeArrears && recipient.feeBalance && (
                          <Badge variant="secondary" className="text-xs font-mono">
                            Ksh {Number(recipient.feeBalance).toLocaleString("en-KE")}
                          </Badge>
                        )}
                        {recipient.smsSentAt && (
                          <span className="flex items-center gap-0.5 text-xs text-purple-600">
                            <Smartphone className="h-3 w-3" /> SMS ✓
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {recipient.parentName && <span>{recipient.parentName} · </span>}
                        {recipient.parentPhone || recipient.parentEmail || (
                          <span className="flex items-center gap-1 text-orange-500 inline-flex">
                            <AlertCircle className="h-3 w-3" /> No contact info
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      {message.examId && (
                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8"
                          onClick={() => window.open(`/reports/${message.examId}/${recipient.studentId}`, "_blank")}>
                          <FileText className="h-3.5 w-3.5" /> Report
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8"
                        onClick={() => copyMessage(recipient)}>
                        {copiedId === recipient.id ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        Copy
                      </Button>
                      {recipient.parentPhone && (
                        <Button
                          variant="outline" size="sm"
                          className={cn("gap-1.5 text-xs h-8", recipient.smsSentAt ? "border-purple-300 text-purple-700" : "")}
                          onClick={() => sendSms(recipient.id)}
                          disabled={isSending || sendingAll}
                        >
                          {isSending
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Smartphone className="h-3.5 w-3.5" />
                          }
                          SMS
                        </Button>
                      )}
                      {emailUrl && (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8"
                          onClick={() => window.open(emailUrl, "_blank")}>
                          <Mail className="h-3.5 w-3.5" /> Email
                        </Button>
                      )}
                      {waUrl && (
                        <Button size="sm" className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => window.open(waUrl, "_blank")}>
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

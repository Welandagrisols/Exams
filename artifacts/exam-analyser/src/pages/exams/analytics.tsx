import { useGetAnalytics, useGetExam, getGetAnalyticsQueryKey, getGetExamQueryKey } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { getRubricColor, getRubricHexColor } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/supabase";

function AiInsightsCard({ examId }: { examId: number }) {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const generate = useCallback(async () => {
    setText("");
    setError(null);
    setLoading(true);
    setGenerated(true);
    try {
      const res = await authFetch(`/api/insights/${examId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          // Parse the SSE payload — skip malformed lines but propagate server errors
          let payload: { error?: string; content?: string; done?: boolean };
          try {
            payload = JSON.parse(line.slice(6));
          } catch {
            continue; // malformed line — skip it
          }
          if (payload.error) throw new Error(payload.error); // propagates to outer catch → setError()
          if (payload.content) setText(prev => prev + payload.content);
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const renderMarkdown = (raw: string) => {
    const lines = raw.split("\n");
    const elements: React.ReactNode[] = [];
    let key = 0;
    for (const line of lines) {
      if (line.startsWith("## ")) {
        elements.push(<h3 key={key++} className="font-bold text-base mt-4 mb-1 text-foreground">{line.slice(3)}</h3>);
      } else if (line.startsWith("- ")) {
        elements.push(
          <div key={key++} className="flex gap-2 text-sm text-muted-foreground ml-2 mb-1">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
            <span>{line.slice(2)}</span>
          </div>
        );
      } else if (line.trim()) {
        elements.push(<p key={key++} className="text-sm text-muted-foreground mb-1">{line}</p>);
      }
    }
    return elements;
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">AI Insights</CardTitle>
          </div>
          {generated && !loading && (
            <Button variant="ghost" size="sm" onClick={generate} className="h-7 gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" /> Regenerate
            </Button>
          )}
        </div>
        {!generated && (
          <p className="text-sm text-muted-foreground mt-1">
            Get AI-powered analysis of this exam — strengths, concerns, and recommended actions for next term.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {!generated ? (
          <Button onClick={generate} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Insights
          </Button>
        ) : loading ? (
          <div className="space-y-2">
            {text ? (
              <div className="space-y-0.5">{renderMarkdown(text)}</div>
            ) : (
              <>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Analysing exam data…
            </div>
          </div>
        ) : error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={generate}>Try again</Button>
          </div>
        ) : (
          <div className="space-y-0.5">{renderMarkdown(text)}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ExamAnalytics() {
  const [, params] = useRoute("/exams/:examId/analytics");
  const examId = parseInt(params?.examId || "0");

  const { data: exam } = useGetExam(examId, { query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) } });
  const { data: analytics, isLoading } = useGetAnalytics(examId, { query: { enabled: !!examId, queryKey: getGetAnalyticsQueryKey(examId) } });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold mb-1">{label}</p>
          <p className="text-sm">Mean: <span className="font-bold">{payload[0].value.toFixed(1)}%</span></p>
          {payload[0].payload.meanGrade && (
            <p className="text-sm mt-1">
              Grade: <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getRubricColor(payload[0].payload.meanGrade)}`}>{payload[0].payload.meanGrade}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <Header
        title="Exam Analytics"
        breadcrumbs={[
          { label: "Exams", href: exam ? `/classes/${exam.classId}/exams` : "#" },
          { label: exam?.name || "Loading...", href: `/exams/${examId}/scores` },
          { label: "Analytics" }
        ]}
      />

      <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
        {isLoading ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
            <Skeleton className="h-[400px] w-full" />
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          </>
        ) : !analytics ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <p className="text-muted-foreground">No analytics data available for this exam yet.</p>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Overall Mean</div>
                  <div className="text-3xl font-bold">{analytics.overallMeanPercentage.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Students Graded</div>
                  <div className="text-3xl font-bold">{analytics.gradedCount} <span className="text-sm text-muted-foreground font-normal">/ {analytics.classSize}</span></div>
                </CardContent>
              </Card>
              <Card className="col-span-2">
                <CardContent className="p-4 flex h-full flex-col justify-center">
                  <div className="text-sm font-medium text-muted-foreground mb-3">Overall Class Distribution</div>
                  <div className="flex w-full h-4 rounded-full overflow-hidden">
                    {Object.entries(analytics.overallDistribution || {}).map(([grade, count]) => {
                      if (count === 0) return null;
                      const width = `${(count / analytics.gradedCount) * 100}%`;
                      return (
                        <div
                          key={grade}
                          style={{ width, backgroundColor: getRubricHexColor(grade) }}
                          title={`${grade}: ${count} students`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-3 flex-wrap text-xs">
                    {['EE', 'ME', 'AE', 'BE'].map(group => {
                      const g1 = `${group}1`;
                      const g2 = `${group}2`;
                      const count = (analytics.overallDistribution as any)[g1] + (analytics.overallDistribution as any)[g2];
                      if (!count) return null;
                      return (
                        <div key={group} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getRubricHexColor(g1) }} />
                          <span>{group}: <strong>{count}</strong></span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights */}
            <AiInsightsCard examId={examId} />

            {/* Mean Score Chart */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>Subject Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[350px] w-full p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.learningAreas} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="abbreviation" tickLine={false} axisLine={false} dy={10} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} dx={-10} fontSize={12} domain={[0, 100]} />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                      <Bar dataKey="meanPercentage" radius={[4, 4, 0, 0]} maxBarSize={60}>
                        {analytics.learningAreas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getRubricHexColor(entry.meanGrade)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Per-Subject Grade Distribution */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>Grade Distribution by Subject</CardTitle>
                <p className="text-sm text-muted-foreground">Number of students at each CBC performance level per subject</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[320px] w-full p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.learningAreas.map(la => ({
                        name: la.abbreviation,
                        BE1: la.distribution.BE1,
                        BE2: la.distribution.BE2,
                        AE1: la.distribution.AE1,
                        AE2: la.distribution.AE2,
                        ME1: la.distribution.ME1,
                        ME2: la.distribution.ME2,
                        EE1: la.distribution.EE1,
                        EE2: la.distribution.EE2,
                      }))}
                      margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 13 }}
                        formatter={(value: number, name: string) => value > 0 ? [`${value} student${value !== 1 ? "s" : ""}`, name] : [null, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                      <Bar dataKey="BE1" stackId="a" fill="#fca5a5" name="BE1" maxBarSize={60} />
                      <Bar dataKey="BE2" stackId="a" fill="#ef4444" name="BE2" maxBarSize={60} />
                      <Bar dataKey="AE1" stackId="a" fill="#fde68a" name="AE1" maxBarSize={60} />
                      <Bar dataKey="AE2" stackId="a" fill="#f59e0b" name="AE2" maxBarSize={60} />
                      <Bar dataKey="ME1" stackId="a" fill="#93c5fd" name="ME1" maxBarSize={60} />
                      <Bar dataKey="ME2" stackId="a" fill="#2563eb" name="ME2" maxBarSize={60} />
                      <Bar dataKey="EE1" stackId="a" fill="#86efac" name="EE1" maxBarSize={60} />
                      <Bar dataKey="EE2" stackId="a" fill="#16a34a" name="EE2" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Subject Detail Cards */}
            <h3 className="font-bold text-lg pt-4">Subject Breakdown</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.learningAreas.map((area) => (
                <Card key={area.learningAreaId} className="flex flex-col h-full">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base line-clamp-1" title={area.learningAreaName}>{area.learningAreaName}</CardTitle>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${getRubricColor(area.meanGrade)}`}>
                        {area.meanGrade}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between gap-4">
                    <div className="flex items-end gap-2">
                      <div className="text-3xl font-black">{area.meanPercentage.toFixed(1)}<span className="text-lg font-medium text-muted-foreground">%</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                      <div>
                        <div className="text-muted-foreground text-xs">Highest</div>
                        <div className="font-medium">{area.highest} <span className="text-xs text-muted-foreground font-normal">/ {area.maxMarks}</span></div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Lowest</div>
                        <div className="font-medium">{area.lowest} <span className="text-xs text-muted-foreground font-normal">/ {area.maxMarks}</span></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

import { useGetAnalytics, useGetExam, getGetAnalyticsQueryKey, getGetExamQueryKey } from "@workspace/api-client-react";
import { Layout, Header } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { getRubricColor, getRubricHexColor } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

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
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

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

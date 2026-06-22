import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

import Dashboard from "@/pages/dashboard";
import Classes from "@/pages/classes";
import Students from "@/pages/classes/students";
import ClassExams from "@/pages/classes/exams";
import ExamScores from "@/pages/exams/scores";
import ExamAnalytics from "@/pages/exams/analytics";
import ExamRankings from "@/pages/exams/rankings";
import StudentReport from "@/pages/exams/report";
import LearningAreas from "@/pages/learning-areas";
import Settings from "@/pages/settings";
import ClassTrends from "@/pages/trends/class";
import StudentTrends from "@/pages/trends/student";
import ImportStudents from "@/pages/students/import";
import ScoreSheet from "@/pages/exams/scoresheet";
import OcrUpload from "@/pages/exams/ocr-upload";
import PrintAllReports from "@/pages/exams/print-reports";
import MessagesList from "@/pages/messages/index";
import ComposeMessage from "@/pages/messages/compose";
import MessageDetail from "@/pages/messages/detail";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route><Redirect to="/login" /></Route>
      </Switch>
    );
  }

  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/classes" component={Classes} />
        <Route path="/classes/:classId/students" component={Students} />
        <Route path="/classes/:classId/exams" component={ClassExams} />
        <Route path="/exams/:examId/scores" component={ExamScores} />
        <Route path="/exams/:examId/scoresheet" component={ScoreSheet} />
        <Route path="/exams/:examId/ocr-upload" component={OcrUpload} />
        <Route path="/exams/:examId/analytics" component={ExamAnalytics} />
        <Route path="/exams/:examId/rankings" component={ExamRankings} />
        <Route path="/exams/:examId/print-reports" component={PrintAllReports} />
        <Route path="/reports/:examId/:studentId" component={StudentReport} />
        <Route path="/learning-areas" component={LearningAreas} />
        <Route path="/settings" component={Settings} />
        <Route path="/trends/class/:classId" component={ClassTrends} />
        <Route path="/trends/student/:studentId" component={StudentTrends} />
        <Route path="/students/import" component={ImportStudents} />
        <Route path="/messages" component={MessagesList} />
        <Route path="/messages/compose" component={ComposeMessage} />
        <Route path="/messages/:id" component={MessageDetail} />
        <Route path="/login"><Redirect to="/" /></Route>
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary fallbackTitle="EduMetrics failed to load">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRoutes />
            </WouterRouter>
            <Toaster />
            <PwaInstallPrompt />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

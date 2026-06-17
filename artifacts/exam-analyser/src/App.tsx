import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

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
import MessagesList from "@/pages/messages/index";
import ComposeMessage from "@/pages/messages/compose";
import MessageDetail from "@/pages/messages/detail";

const queryClient = new QueryClient();

function Router() {
  return (
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
      <Route path="/reports/:examId/:studentId" component={StudentReport} />
      <Route path="/learning-areas" component={LearningAreas} />
      <Route path="/settings" component={Settings} />
      <Route path="/trends/class/:classId" component={ClassTrends} />
      <Route path="/trends/student/:studentId" component={StudentTrends} />
      <Route path="/students/import" component={ImportStudents} />
      <Route path="/messages" component={MessagesList} />
      <Route path="/messages/compose" component={ComposeMessage} />
      <Route path="/messages/:id" component={MessageDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

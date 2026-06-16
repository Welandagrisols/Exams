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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/classes" component={Classes} />
      <Route path="/classes/:classId/students" component={Students} />
      <Route path="/classes/:classId/exams" component={ClassExams} />
      <Route path="/exams/:examId/scores" component={ExamScores} />
      <Route path="/exams/:examId/analytics" component={ExamAnalytics} />
      <Route path="/exams/:examId/rankings" component={ExamRankings} />
      <Route path="/reports/:examId/:studentId" component={StudentReport} />
      <Route path="/learning-areas" component={LearningAreas} />
      <Route path="/settings" component={Settings} />
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

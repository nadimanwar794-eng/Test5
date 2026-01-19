import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import StudentDetails from "@/pages/StudentDetails";
import Landing from "@/pages/Landing";
import SessionList from "@/pages/SessionList";
import ClassList from "@/pages/ClassList";
import BulkMarksEditor from "@/pages/BulkMarksEditor";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/sessions" component={SessionList} />
      <Route path="/session/:id" component={ClassList} />
      <Route path="/class/:id" component={Home} />
      <Route path="/student/:id" component={StudentDetails} />
      <Route path="/bulk-edit/:classId/:subjectId" component={BulkMarksEditor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

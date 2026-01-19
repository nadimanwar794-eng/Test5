import { StudentTable } from "@/components/StudentTable";
import { StudentCard } from "@/components/StudentCard";
import { CreateStudentDialog } from "@/components/CreateStudentDialog";
import { CreateSubjectDialog } from "@/components/subjects/CreateSubjectDialog";
import { Layout } from "@/components/Layout";
import { useStudents } from "@/hooks/use-students";
import { useAuth } from "@/hooks/use-auth";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  LayoutGrid, 
  Table as TableIcon, 
  TrendingUp, 
  Users, 
  Award,
  AlertCircle,
  UserPlus,
  Lock,
  LogOut,
  ChevronLeft,
  Settings as SettingsIcon
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRoute, useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [match, params] = useRoute("/class/:id");
  const classId = params?.id ? parseInt(params.id) : undefined;
  const [, setLocation] = useLocation();
  
  const { user, loginMutation, logoutMutation } = useAuth();
  const { data: students, isLoading, error } = useStudents();
  const [view, setView] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  
  // Login State
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    loginMutation.mutate({ email, password });
    setShowLogin(false);
  };

  // Admin Registration State
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const { toast } = useToast();

  const registerAdminMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/register", {
        name: newAdminName,
        email: newAdminEmail,
        password: newAdminPassword,
        isSuperAdmin: false
      });
      return await res.json();
    },
    onSuccess: () => {
      setShowAdminDialog(false);
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPassword("");
      toast({ title: "Admin created successfully" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to create admin", description: e.message, variant: "destructive" });
    }
  });

  const [settings, setSettings] = useState<Record<string, string>>({
    app_name: "IDEAL INSPIRATION CLASSES",
    director: "EHSAN SIR",
    manager: "NADIM ANWAR",
    app_link: "",
    app_name_display: "Download Our App"
  });

  const [editSettings, setEditSettings] = useState({ ...settings });
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const keys = ["app_name", "director", "manager", "app_link", "app_name_display"];
      const newSettings: Record<string, string> = {};
      for (const key of keys) {
        const res = await fetch(`/api/settings/${key}`);
        const data = await res.json();
        if (data.value) newSettings[key] = data.value;
      }
      setSettings(prev => ({ ...prev, ...newSettings }));
      setEditSettings(prev => ({ ...prev, ...newSettings }));
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      // Create settings object without any auth headers needed from frontend
      // The API should handle auth via session cookie
      for (const [key, value] of Object.entries(editSettings)) {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Failed to update ${key}`);
        }
      }
      setSettings({ ...editSettings });
      setShowSettingsDialog(false);
      toast({ title: "Success", description: "Institute settings updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update settings", variant: "destructive" });
    }
  };

  const filteredStudents = useMemo(() => {
    if (!students || !classId) return [];
    // Filter by classId (assuming students have classId property, but StudentWithMarks from storage.ts does have it)
    // Wait, storage.ts getStudents returns StudentWithMarks. 
    // StudentWithMarks = Student & { marks: ... }. Student has classId.
    // However, I need to check if 'classId' is actually returned. 
    // The Schema says students table has classId.
    // So yes.
    return students
      .filter(s => s.classId === classId)
      .filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.rollNo.toString().includes(search)
      )
      .map(student => {
        const totalObtained = student.marks.reduce((sum: number, m: any) => sum + parseInt(m.obtained || "0"), 0);
        const totalMax = student.marks.reduce((sum: number, m: any) => sum + m.subject.maxMarks, 0);
        const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        return { ...student, percentage };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [students, search, classId]);

  if (!classId) return <Layout><div>Invalid Class</div></Layout>;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load students. Please try refreshing the app.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  const isAdmin = !!user;

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Navigation / Back Button */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/sessions")}
            className="gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Change Session / Class
          </Button>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Students</p>
              <p className="text-2xl font-bold">{filteredStudents.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Avg. Percentage</p>
              <p className="text-2xl font-bold">
                {filteredStudents.length > 0 
                  ? (filteredStudents.reduce((acc, s) => acc + s.percentage, 0) / filteredStudents.length).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Top Performer</p>
              <p className="text-xl font-bold truncate max-w-[150px]">
                {filteredStudents[0]?.name || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name or roll no..." 
              className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl focus:bg-white transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {!isAdmin ? (
              <Dialog open={showLogin} onOpenChange={setShowLogin}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Lock className="h-4 w-4" /> Edit Mode
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Admin Authentication</DialogTitle>
                    <DialogDescription>Enter credentials to access admin features.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="admin@example.com" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                      />
                    </div>
                    <Button className="w-full" onClick={handleLogin} disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? "Logging in..." : "Login"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" className="gap-2 text-destructive hover:bg-destructive/10" onClick={() => logoutMutation.mutate()}>
                  <LogOut className="h-4 w-4" /> Exit Edit
                </Button>
                <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <UserPlus className="h-4 w-4" /> New Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Admin</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={newAdminName} onChange={e => setNewAdminName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input type="password" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} />
                      </div>
                      <Button onClick={() => registerAdminMutation.mutate()} disabled={registerAdminMutation.isPending}>
                        Create Admin
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <CreateSubjectDialog />
                <CreateStudentDialog classId={classId} />
                <Button variant="outline" size="icon" onClick={() => setShowSettingsDialog(true)} className="rounded-full">
                   <SettingsIcon className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <Button 
                variant={view === "grid" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setView("grid")}
                className={`rounded-lg h-9 ${view === "grid" ? "shadow-sm bg-white" : ""}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button 
                variant={view === "table" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setView("table")}
                className={`rounded-lg h-9 ${view === "table" ? "shadow-sm bg-white" : ""}`}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="min-h-[400px]">
          {filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
              <Users className="h-16 w-16 mb-4 opacity-10" />
              <h3 className="text-xl font-semibold text-slate-600">No students found</h3>
              <p className="text-slate-400">Try adjusting your search or add a new student.</p>
            </div>
          ) : (
            <StudentTable students={filteredStudents} />
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Institute Settings</DialogTitle>
            <DialogDescription>Update the branding for your marksheet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label>Institute Name</Label>
                <Input value={editSettings.app_name} onChange={e => setEditSettings(prev => ({ ...prev, app_name: e.target.value }))} />
             </div>
             <div className="space-y-2">
                <Label>Director Name</Label>
                <Input value={editSettings.director} onChange={e => setEditSettings(prev => ({ ...prev, director: e.target.value }))} />
             </div>
             <div className="space-y-2">
                <Label>App Download Link</Label>
                <Input value={editSettings.app_link} onChange={e => setEditSettings(prev => ({ ...prev, app_link: e.target.value }))} placeholder="https://play.google.com/store/apps/details?id=..." />
             </div>
             <div className="space-y-2">
                <Label>App Name Display</Label>
                <Input value={editSettings.app_name_display} onChange={e => setEditSettings(prev => ({ ...prev, app_name_display: e.target.value }))} placeholder="IIC Official App" />
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>Cancel</Button>
             <Button onClick={handleSaveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

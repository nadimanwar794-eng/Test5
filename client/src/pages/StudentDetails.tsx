import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useStudent } from "@/hooks/use-students";
import { useUpdateMarks } from "@/hooks/use-marks";
import { queryClient } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Save, ArrowLeft, TrendingUp, Calendar, BookOpen, Calculator, Award, GraduationCap, Trash2, Lock, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { insertMarkSchema, type Mark } from "@shared/schema";
import { api } from "@shared/routes";

interface EditableMark {
  localId: string;
  id?: number;
  subject: string;
  date: string;
  obtained: string;
  max: number;
}

export default function StudentDetails() {
  const { id } = useParams();
  const studentId = Number(id);
  const { data: student, isLoading, error } = useStudent(studentId);
  const updateMutation = useUpdateMarks();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = !!user;

  const [showLockedPopup, setShowLockedPopup] = useState(false);

  useEffect(() => {
    // Locked results disabled per user request
    if (false && student && !student.isPaid && !isAdmin) {
      setShowLockedPopup(true);
    }
  }, [student, isAdmin]);

  const [marks, setMarks] = useState<EditableMark[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (student) {
      const initialMarks = student.marks.map((m: any) => ({
        localId: `db-${m.id}`,
        id: m.id,
        subject: m.subject.name || "General",
        date: m.subject.date || new Date().toISOString().split("T")[0],
        obtained: m.obtained.toString(),
        max: m.subject.maxMarks,
      }));
      setMarks(initialMarks);
    }
  }, [student]);

  const handleAddBox = () => {
    const newMark: EditableMark = {
      localId: `new-${Date.now()}`,
      subject: "",
      date: new Date().toISOString().split("T")[0],
      obtained: "0",
      max: 80,
    };
    setMarks((prev) => [...prev, newMark]);
    setIsDirty(true);
  };

  const handleMarkChange = (index: number, field: keyof EditableMark, value: any) => {
    setMarks((prev) => {
      const newMarks = [...prev];
      newMarks[index] = { ...newMarks[index], [field]: value };
      return newMarks;
    });
    setIsDirty(true);
  };

  const handleRemoveBox = (index: number) => {
    setMarks(prev => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const [settings, setSettings] = useState<Record<string, string>>({
    app_name: "IDEAL INSPIRATION CLASSES",
    director: "EHSAN SIR",
    manager: "NADIM ANWAR"
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const keys = ["app_name", "director", "manager"];
      const newSettings: Record<string, string> = {};
      for (const key of keys) {
        const res = await fetch(`/api/settings/${key}`);
        const data = await res.json();
        if (data.value) newSettings[key] = data.value;
      }
      setSettings(prev => ({ ...prev, ...newSettings }));
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      const payload = marks
        .filter(m => m.subject.trim() !== "")
        .map((m) => ({
          id: m.id,
          subject: m.subject,
          date: m.date,
          obtained: m.obtained.toString(),
          max: Number(m.max),
        }));

      await updateMutation.mutateAsync({
        studentId,
        marks: payload,
      });

      toast({ title: "Saved!", description: "Student marks have been updated." });
      setIsDirty(false);
      await queryClient.invalidateQueries({ queryKey: [api.students.get.path, { id: studentId }] });
      await queryClient.invalidateQueries({ queryKey: [api.students.list.path] });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const stats = useMemo(() => {
    const totalObtained = marks.reduce((sum, m) => sum + (parseFloat(m.obtained) || 0), 0);
    const totalMax = marks.reduce((sum, m) => sum + Number(m.max || 0), 0);
    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    return { totalObtained, totalMax, percentage };
  }, [marks]);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !student) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
           <h2 className="text-xl font-bold text-destructive mb-4">Student not found</h2>
           <Link href="/"><Button variant="outline">Go Back Home</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={cn("space-y-8 pb-20 max-w-4xl mx-auto")}>
        {/* Official Marksheet Header */}
        <div className="bg-white border-2 border-primary/20 rounded-2xl p-8 shadow-xl space-y-6 text-center">
           <div className="space-y-2 border-b-2 border-primary/10 pb-6">
              <div className="space-y-1">
                <h1 className="text-4xl font-black text-primary tracking-tight">{settings.app_name}</h1>
                <p className="text-sm font-bold text-primary/60 tracking-[0.3em] uppercase">Since 2014</p>
              </div>
              <div className="flex justify-center gap-8 text-sm font-bold text-muted-foreground uppercase tracking-widest pt-2">
                 <span>Director: {settings.director}</span>
                 <span className="text-primary/80 italic font-black">A Passion to Progress</span>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left bg-primary/5 p-6 rounded-xl border border-primary/10">
              <div className="space-y-1">
                 <p className="text-xs font-black text-primary uppercase tracking-widest opacity-70">Student Name</p>
                 <p className="text-2xl font-bold text-foreground">{student.name}</p>
              </div>
              <div className="space-y-1 md:text-right">
                 <p className="text-xs font-black text-primary uppercase tracking-widest opacity-70">Roll Number</p>
                 <p className="text-2xl font-mono font-bold text-foreground">{student.rollNo}</p>
              </div>
           </div>

           <div className="overflow-hidden border-2 border-primary/10 rounded-xl shadow-sm">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-primary/5 border-b-2 border-primary/10">
                <tr>
                  <th className="px-6 py-4 font-black text-primary uppercase tracking-widest">Subject Name</th>
                  <th className="px-6 py-4 font-black text-primary text-center uppercase tracking-widest">Obtained</th>
                  <th className="px-6 py-4 font-black text-primary text-center uppercase tracking-widest">Full Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {marks.map((mark, index) => (
                  <tr key={mark.localId} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4 font-bold text-foreground">
                      {isAdmin ? (
                        <input 
                          value={mark.subject} 
                          onChange={e => handleMarkChange(index, 'subject', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-2 focus:ring-primary/20 rounded px-1 outline-none font-bold"
                          placeholder="Subject Name"
                        />
                      ) : mark.subject}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isAdmin ? (
                        <input 
                          type="number" 
                          value={mark.obtained} 
                          onChange={e => handleMarkChange(index, 'obtained', e.target.value)} 
                          className="w-20 mx-auto text-center bg-transparent border-none focus:ring-2 focus:ring-primary/20 rounded px-1 outline-none font-black text-primary text-lg" 
                        />
                      ) : <span className="text-lg font-black text-primary">{mark.obtained}</span>}
                    </td>
                    <td className="px-6 py-4 text-center text-muted-foreground font-mono font-bold">
                       {isAdmin ? (
                         <input 
                           type="number" 
                           value={mark.max} 
                           onChange={e => handleMarkChange(index, 'max', e.target.value)} 
                           className="w-20 mx-auto text-center bg-transparent border-none focus:ring-2 focus:ring-primary/20 rounded px-1 outline-none" 
                         />
                       ) : mark.max}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-primary/5 border-t-2 border-primary/10 font-black">
                 <tr>
                    <td className="px-6 py-6 text-xl text-primary">GRAND TOTAL</td>
                    <td className="px-6 py-6 text-center text-3xl text-primary">{stats.totalObtained}</td>
                    <td className="px-6 py-6 text-center text-xl text-muted-foreground font-mono">{stats.totalMax}</td>
                 </tr>
              </tfoot>
            </table>
           </div>

           <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-primary/10">
              <div className="flex items-center gap-4 bg-primary/5 px-6 py-3 rounded-full border border-primary/10">
                 <p className="text-sm font-black text-primary uppercase tracking-widest">Aggregate Percentage</p>
                 <p className="text-3xl font-black text-primary tabular-nums">{stats.percentage.toFixed(2)}%</p>
              </div>
              <div className="flex items-center gap-3">
                 <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Result Status:</p>
                 <span className={cn("px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest shadow-sm", stats.percentage >= 33 ? "bg-green-500 text-white" : "bg-red-500 text-white")}>
                    {stats.percentage >= 33 ? "PASSED" : "FAILED"}
                 </span>
              </div>
           </div>
        </div>

        {isAdmin && (
          <div className="sticky bottom-6 flex justify-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Button variant="outline" onClick={handleAddBox} className="gap-2 bg-white shadow-xl border-primary/20 hover:bg-primary/5 text-primary h-12 px-6 rounded-full font-bold">
                <Plus className="w-5 h-5" />
                Add Subject
             </Button>
             <Button onClick={handleSave} disabled={!isDirty || updateMutation.isPending} className="gap-2 shadow-xl shadow-primary/30 h-12 px-8 rounded-full font-bold">
                <Save className="w-5 h-5" />
                {updateMutation.isPending ? "Saving..." : "Save All Changes"}
             </Button>
          </div>
        )}
      </div>

      <Dialog open={showLockedPopup} onOpenChange={setShowLockedPopup}>
        <DialogContent className="sm:max-w-md border-t-4 border-t-primary">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4"><Lock className="h-8 w-8 text-primary" /></div>
            <DialogTitle className="text-2xl font-bold">Result is Locked</DialogTitle>
            <DialogDescription className="text-base pt-2">
              To view the detailed marksheet for <span className="font-bold text-foreground">{student.name}</span>, please ensure all academic dues are cleared.
            </DialogDescription>
          </DialogHeader>
        <div className="bg-muted/50 p-4 rounded-lg flex gap-3 items-start my-4">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground opacity-50 italic">If you have already paid, please wait for up to 24 hours for the status to update or contact the office with your receipt.</p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Link href="/"><Button variant="outline" className="w-full sm:w-auto">Go Back Home</Button></Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

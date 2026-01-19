import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useStudents } from "@/hooks/use-students";
import { useUpdateMarks } from "@/hooks/use-marks";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, User } from "lucide-react";
import { api } from "@shared/routes";
import { useQuery } from "@tanstack/react-query";

export default function BulkMarksEditor() {
  const { classId: classIdStr, subjectId: subjectIdStr } = useParams();
  const classId = Number(classIdStr);
  const subjectId = Number(subjectIdStr);
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: subjects } = useQuery({
    queryKey: [api.subjects.list.path],
    queryFn: async () => {
      const res = await fetch(api.subjects.list.path);
      return res.json();
    }
  });
  
  const subject = (subjects as any[])?.find(s => s.id === subjectId);
  const filteredStudents = students?.filter(s => s.classId === classId) || [];
  
  const [localMarks, setLocalMarks] = useState<Record<number, string>>({});
  const { toast } = useToast();
  const updateMutation = useUpdateMarks();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (filteredStudents.length > 0) {
      const initial: Record<number, string> = {};
      filteredStudents.forEach(s => {
        const mark = s.marks.find((m: any) => m.subjectId === subjectId);
        initial[s.id] = mark?.obtained || "0";
      });
      setLocalMarks(initial);
    }
  }, [students, classId, subjectId]);

  const handleSave = async () => {
    try {
      for (const student of filteredStudents) {
        await updateMutation.mutateAsync({
          studentId: student.id,
          marks: [
            {
              subject: subject?.name || "Unknown",
              obtained: Number(localMarks[student.id] || "0"),
              max: subject?.maxMarks || 100,
              date: subject?.date || new Date().toISOString().split("T")[0]
            }
          ]
        });
      }
      toast({ title: "Success", description: "All marks updated successfully" });
      setLocation(`/class/${classId}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (studentsLoading) return <Layout><div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/class/${classId}`}>
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-primary">Bulk Entry: {subject?.name}</h1>
              <p className="text-muted-foreground">Enter marks for all students at once</p>
            </div>
          </div>
          <Button onClick={handleSave} className="gap-2" disabled={updateMutation.isPending}>
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save All Marks"}
          </Button>
        </div>

        <Card className="overflow-hidden border-border/50 shadow-sm">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold border-r border-border w-16 text-center">Roll</th>
                <th className="px-6 py-4 font-bold border-r border-border">Student Name</th>
                <th className="px-6 py-4 font-bold text-center w-32">Obtained Marks</th>
                <th className="px-6 py-4 font-bold text-center w-32 text-muted-foreground">/ {subject?.maxMarks}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-primary/5">
                  <td className="px-6 py-3 text-center font-mono border-r border-border/40">{student.rollNo}</td>
                  <td className="px-6 py-3 font-semibold border-r border-border/40">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {student.name}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center border-r border-border/40">
                    <input 
                      type="number"
                      value={localMarks[student.id] || "0"}
                      onChange={(e) => setLocalMarks(prev => ({ ...prev, [student.id]: e.target.value }))}
                      className="w-full bg-transparent border-none text-center font-bold text-primary focus:ring-2 focus:ring-primary/20 rounded outline-none"
                    />
                  </td>
                  <td className="px-6 py-3 text-center text-muted-foreground">{subject?.maxMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </Layout>
  );
}

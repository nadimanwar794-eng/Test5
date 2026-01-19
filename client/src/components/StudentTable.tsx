import { StudentWithMarks } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { User, TrendingUp, Trash2 } from "lucide-react";
import { useUpdateMarks } from "@/hooks/use-marks";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Button } from "@/components/ui/button";

interface StudentTableProps {
  students: StudentWithMarks[];
}

export function StudentTable({ students }: StudentTableProps) {
  const { mutateAsync: updateMarks } = useUpdateMarks();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = !!user;

  const deleteStudent = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.students.delete.path, { id });
      const res = await fetch(url, { method: api.students.delete.method });
      if (!res.ok) throw new Error("Failed to delete student");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.students.list.path] });
      toast({ title: "Student deleted successfully" });
    }
  });
  
  // Get all unique subjects to build columns
  const allSubjects = Array.from(new Set(
    students.flatMap(s => s.marks.map(m => JSON.stringify({
      id: m.subjectId,
      name: m.subject.name,
      max: m.subject.maxMarks,
      date: m.subject.date
    })))
  )).map(s => JSON.parse(s)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const [localMarks, setLocalMarks] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    students.forEach(s => {
      s.marks.forEach(m => {
        initial[`${s.id}-${m.subjectId}`] = m.obtained;
      });
    });
    setLocalMarks(initial);
  }, [students]);

  const handleMarkChange = (studentId: number, subjectId: number, value: string) => {
    setLocalMarks(prev => ({ ...prev, [`${studentId}-${subjectId}`]: value }));
  };

  const saveMark = async (student: StudentWithMarks, subject: any, value: string) => {
    try {
      await updateMarks({
        studentId: student.id,
        marks: [{
          subject: subject.name,
          obtained: value, // Use string to match schema/storage expectation
          max: subject.max,
          date: subject.date
        }]
      });
    } catch (err: any) {
      toast({ title: "Error saving mark", description: err.message, variant: "destructive" });
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return "🏆";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return index + 1;
  };

  if (!isAdmin) {
    const studentsWithStats = students.map((student) => {
      const totalObtained = allSubjects.reduce((sum, sub) => {
        const val = localMarks[`${student.id}-${sub.id}`];
        return sum + (parseFloat(val) || 0);
      }, 0);
      const totalMax = allSubjects.reduce((sum, sub) => sum + sub.max, 0);
      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      return { ...student, totalObtained, totalMax, percentage };
    });

    const rankedList = [...studentsWithStats].sort((a, b) => b.percentage - a.percentage);
    const sortedByRoll = [...studentsWithStats].sort((a, b) => a.rollNo - b.rollNo);

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-20 text-center font-bold">Rank</TableHead>
                <TableHead className="w-16 text-center font-bold">Roll</TableHead>
                <TableHead className="font-bold">Student Name</TableHead>
                <TableHead className="text-right font-bold">Total Marks</TableHead>
                <TableHead className="text-right font-bold">Percentage</TableHead>
                <TableHead className="w-24 text-right font-bold pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedByRoll.map((student) => {
                const rankIndex = rankedList.findIndex(s => s.id === student.id);
                return (
                  <TableRow key={student.id} className="hover:bg-slate-50/50 group transition-colors">
                    <TableCell className="text-center font-bold text-slate-500">
                      {getRankIcon(rankIndex)}
                    </TableCell>
                    <TableCell className="text-center font-mono">#{student.rollNo}</TableCell>
                    <TableCell className="font-semibold">
                      <Link href={`/student/${student.id}`} className="hover:text-primary transition-colors flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {student.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {student.totalObtained} <span className="text-slate-400 text-xs font-normal">/ {student.totalMax}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-bold ${student.percentage >= 60 ? 'text-green-600' : student.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {student.percentage.toFixed(1)}%
                        </span>
                        <TrendingUp className="h-3 w-3 text-slate-300" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Link href={`/student/${student.id}`}>
                        <div className="flex justify-end">
                          <User className="h-4 w-4 text-slate-400 hover:text-primary transition-colors cursor-pointer" />
                        </div>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  const sortedStudents = [...students].sort((a, b) => a.rollNo - b.rollNo);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="border-collapse">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-16 text-center font-bold border-r border-slate-200">Roll</TableHead>
              <TableHead className="min-w-[200px] font-bold border-r border-slate-200 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Student Name</TableHead>
              {allSubjects.map((sub, i) => (
                <TableHead key={i} className="min-w-[120px] text-center border-r border-slate-200 py-4">
                  <div className="flex flex-col items-center">
                    <span className="text-primary font-black text-xs uppercase tracking-tighter">{sub.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Max: {sub.max}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-24 text-right font-bold bg-primary/5 border-l border-slate-200">Total</TableHead>
              <TableHead className="w-24 text-right font-bold bg-primary/5">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStudents.map((student) => {
              const totalObtained = allSubjects.reduce((sum, sub) => {
                const val = localMarks[`${student.id}-${sub.id}`];
                return sum + (parseFloat(val) || 0);
              }, 0);
              const totalMax = allSubjects.reduce((sum, sub) => sum + sub.max, 0);
              const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

              return (
                <TableRow key={student.id} className="hover:bg-slate-50/50 group transition-colors">
                  <td className="px-4 py-3 text-center font-mono border-r border-slate-100">
                    <div className="flex items-center gap-1 justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${student.name}?`)) {
                            deleteStudent.mutate(student.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      {student.rollNo}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-2">
                      <Link href={`/student/${student.id}`} className="hover:text-primary transition-colors flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {student.name}
                      </Link>
                    </div>
                  </td>
                  {allSubjects.map((sub, i) => {
                    const val = localMarks[`${student.id}-${sub.id}`] || "0";
                    return (
                      <td key={i} className="p-0 border-r border-slate-100 h-12 min-w-[120px]">
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => handleMarkChange(student.id, sub.id, e.target.value)}
                          onBlur={() => saveMark(student, sub, val)}
                          className="w-full h-full text-center bg-transparent border-none focus:ring-2 focus:ring-primary/20 outline-none font-bold text-primary transition-all hover:bg-slate-100/50"
                        />
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right font-black text-primary bg-primary/5 border-l border-slate-200">
                    {totalObtained}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-primary bg-primary/5">
                    {percentage.toFixed(1)}%
                  </td>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { Class } from "@shared/schema";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Users, ArrowRight, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ClassList() {
  const [match,params] = useRoute("/session/:id");
  const sessionId = params?.id ? parseInt(params.id) : undefined;
  
  const { user } = useAuth();
  const { data: classes, isLoading } = useQuery<Class[]>({ 
    queryKey: [`/api/classes?sessionId=${sessionId}`],
    enabled: !!sessionId
  });

  const [newClassName, setNewClassName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const createClassMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/classes", { name, sessionId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/classes?sessionId=${sessionId}`] });
      setIsDialogOpen(false);
      setNewClassName("");
      toast({ title: "Class created" });
    },
    onError: (e) => {
      toast({ title: "Failed to create class", description: e.message, variant: "destructive" });
    }
  });

  if (isLoading) return <Layout><div>Loading...</div></Layout>;
  if (!sessionId) return <Layout><div>Invalid Session</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Select Class</h1>
            <p className="text-muted-foreground">Choose a class to view student results</p>
          </div>
          {user && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> New Class</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Class Name</Label>
                    <Input 
                      placeholder="e.g. 10th Grade" 
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => createClassMutation.mutate(newClassName)}>Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes?.map(cls => (
            <Card key={cls.id} className="cursor-pointer hover:border-primary transition-colors group relative">
              <Link href={`/class/${cls.id}`} className="block h-full w-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-medium">
                    {cls.name}
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                    View Students <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Link>
              {user && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this class? All students and marks will be removed.")) {
                      // Note: We need a deleteClassMutation or call storage.deleteClass
                      // For now, let's assume it's handled via a new mutation if we added it
                      apiRequest("DELETE", `/api/classes/${cls.id}`).then(() => {
                        queryClient.invalidateQueries({ queryKey: [`/api/classes?sessionId=${sessionId}`] });
                        toast({ title: "Class deleted" });
                      });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </Card>
          ))}
          {classes?.length === 0 && (
            <div className="col-span-full text-center py-10 text-muted-foreground">
              No classes found in this session.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { Session } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Plus, Calendar, ArrowRight, Trash2 } from "lucide-react";
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

export default function SessionList() {
  const { user } = useAuth();
  const { data: sessions, isLoading } = useQuery<Session[]>({ 
    queryKey: ["/api/sessions"] 
  });
  
  const [newSessionName, setNewSessionName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const createSessionMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/sessions", { name, isActive: true });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setIsDialogOpen(false);
      setNewSessionName("");
      toast({ title: "Session created" });
    },
    onError: (e) => {
      toast({ title: "Failed to create session", description: e.message, variant: "destructive" });
    }
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Session deleted" });
    },
    onError: (e) => {
      toast({ title: "Failed to delete session", description: e.message, variant: "destructive" });
    }
  });

  if (isLoading) return <div>Loading...</div>;

  const visibleSessions = user ? sessions : sessions?.filter(s => s.isActive);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Select Session</h1>
          {user && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> New Session</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Session Name</Label>
                    <Input 
                      placeholder="e.g. 2024-25" 
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => createSessionMutation.mutate(newSessionName)}>Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleSessions?.map(session => (
            <Card key={session.id} className="cursor-pointer hover:border-primary transition-colors group relative">
              <Link href={`/session/${session.id}`} className="block h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-medium">
                    {session.name}
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                    View Classes <ArrowRight className="h-4 w-4" />
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
                    if (confirm("Are you sure you want to delete this session? All classes and students will be removed.")) {
                      deleteSessionMutation.mutate(session.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </Card>
          ))}
          {visibleSessions?.length === 0 && (
            <div className="col-span-full text-center py-10 text-muted-foreground">
              No active sessions found.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

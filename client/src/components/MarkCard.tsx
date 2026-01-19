import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InsertMark } from "@shared/routes";

interface MarkCardProps {
  mark: InsertMark & { id?: number };
  index: number;
  onChange: (index: number, field: keyof InsertMark, value: any) => void;
  onDelete: (index: number) => void;
}

export function MarkCard({ mark, index, onChange, onDelete }: MarkCardProps) {
  const percentage = (mark.obtained / mark.max) * 100;
  const isPassing = percentage >= 33;

  return (
    <Card className={cn(
      "p-4 relative overflow-hidden transition-all duration-300 hover:shadow-md border",
      !isPassing ? "border-destructive/30 bg-destructive/5" : "border-border bg-white"
    )}>
      {/* Visual Indicator Bar */}
      <div 
        className={cn("absolute top-0 left-0 w-1 h-full", isPassing ? "bg-primary" : "bg-destructive")} 
      />

      <div className="flex justify-between items-start mb-4 pl-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-medium text-muted-foreground">
            {index + 1}
          </div>
          <Input 
            value={mark.subject || ""} 
            onChange={(e) => onChange(index, "subject", e.target.value)}
            placeholder="Subject"
            className="h-8 w-32 border-none bg-transparent font-semibold focus-visible:ring-0 px-0 shadow-none text-base"
          />
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:text-destructive -mr-2 -mt-2"
          onClick={() => onDelete(index)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 pl-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Obtained</Label>
          <Input
            type="number"
            value={mark.obtained}
            onChange={(e) => onChange(index, "obtained", parseInt(e.target.value) || 0)}
            className="h-9 font-mono font-bold text-lg"
            min={0}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Max</Label>
          <Input
            type="number"
            value={mark.max}
            onChange={(e) => onChange(index, "max", parseInt(e.target.value) || 0)}
            className="h-9 font-mono text-muted-foreground"
            min={1}
          />
        </div>
      </div>

      <div className="mt-3 pl-3 flex items-center justify-between">
        <div className="w-full mr-3">
           <Input 
            type="date"
            value={mark.date || ""} 
            onChange={(e) => onChange(index, "date", e.target.value)}
            className="h-7 text-xs border-none bg-muted/30 px-2 w-full"
          />
        </div>
        <div className={cn("text-xs font-bold px-2 py-1 rounded", isPassing ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
          {percentage.toFixed(0)}%
        </div>
      </div>
    </Card>
  );
}

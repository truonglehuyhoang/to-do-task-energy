import { useState } from "react";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calcCost, calcRisk, type Task } from "@/lib/energy";

interface AddTaskFormProps {
  energy: number;
  onAdd: (task: Task) => void;
  onPreviewCostChange: (cost: number) => void;
}

const AddTaskForm = ({ energy, onAdd, onPreviewCostChange }: AddTaskFormProps) => {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("60");
  const [intensity, setIntensity] = useState<"light" | "medium" | "heavy">("medium");
  const [preview, setPreview] = useState<{ cost: number; risk: string } | null>(null);
  const isTaskNAmeValid = name.trim().length > 0;

  const handlePreview = () => {
    if(!isTaskNAmeValid){
      setPreview(null);
      onPreviewCostChange(0);
      return;
    }

    const cost = calcCost(Number(duration), intensity);
    const risk = calcRisk(cost, intensity, energy);
    setPreview({ cost, risk });
    onPreviewCostChange(cost);
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    const cost = calcCost(Number(duration), intensity);
    const risk = calcRisk(cost, intensity, energy);
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      duration: Number(duration),
      intensity,
      cost,
      risk,
      type: "task",
    });
    setName("");
    setPreview(null);
    onPreviewCostChange(0);
  };

  const riskColor = (r: string) =>
    r === "SAFE"
      ? "text-primary"
      : r === "MODERATE"
      ? "text-warning"
      : "text-destructive";

  return (
    <div className="rounded-lg bg-card p-5 border border-border space-y-4">
      <h2 className="font-display text-lg font-semibold tracking-wider text-foreground">
        ADD TASK
      </h2>

      <Input
        placeholder="Task name..."
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          
          if(!e.target.value.trim()){
            setPreview(null);
            onPreviewCostChange(0);
          }
        }} 
        className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground font-display tracking-wider mb-1 block">
            DURATION
          </label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="bg-muted border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="60">60 min</SelectItem>
              <SelectItem value="120">120 min</SelectItem>
              <SelectItem value="180">180+ min</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-display tracking-wider mb-1 block">
            INTENSITY
          </label>
          <Select value={intensity} onValueChange={(v) => setIntensity(v as "light" | "medium" | "heavy")}>
            <SelectTrigger className="bg-muted border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">🟢 Light</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="heavy">🔴 Heavy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {preview && (
        <div className="rounded-md bg-muted p-3 text-sm font-body">
          <span className="text-foreground">⚡ Cost: {preview.cost}</span>
          <span className="mx-3">|</span>
          <span className={riskColor(preview.risk)}>⚠️ Risk: {preview.risk}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          onClick={handlePreview} 
          disabled={!isTaskNAmeValid}
          className="border-border text-foreground hover:bg-muted">
          <Eye className="mr-2 h-4 w-4" /> Preview
        </Button>
        <Button 
          onClick={handleAdd} 
          disabled={!isTaskNAmeValid}
          className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>
    </div>
  );
};

export default AddTaskForm;

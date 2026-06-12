import { useEffect, useState } from "react";
import { format, startOfDay } from "date-fns";
import { Zap, BatteryCharging, Sun, CalendarIcon } from "lucide-react";
import EnergyBar from "@/components/EnergyBar";
import AddTaskForm from "@/components/AddTaskForm";
import TaskList from "@/components/TaskList";
import RestPanel from "@/components/RestPanel";
import ActivityLog from "@/components/ActivityLog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { type Task } from "@/lib/energy";
import { type LogEntry } from "@/lib/activityLog";

interface DayPlan {
  started: boolean;
  startingEnergy: number;
  energy: number;
  tasks: Task[];
  restCount: number;
  logs: LogEntry[];
}

const emptyPlan = (): DayPlan => ({
  started: false,
  startingEnergy: 100,
  energy: 100,
  tasks: [],
  restCount: 0,
  logs: [],
});

const dateKey = (d: Date) => format(d, "yyyy-MM-dd");
const today = () => startOfDay(new Date());

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [plans, setPlans] = useState<Record<string, DayPlan>>(() => ({
    [dateKey(new Date())]: { ...emptyPlan(), started: true },
  }));
  const [previewCost, setPreviewCost] = useState(0);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [pendingEnergy, setPendingEnergy] = useState(100);

  const key = dateKey(selectedDate);
  const plan = plans[key] ?? emptyPlan();

  // Auto-init today's plan with a Started log if missing
  useEffect(() => {
    const k = dateKey(new Date());
    setPlans((prev) => {
      if (prev[k]?.logs?.length) return prev;
      const p = prev[k] ?? { ...emptyPlan(), started: true };
      return {
        ...prev,
        [k]: {
          ...p,
          started: true,
          energy: p.startingEnergy,
          logs: [
            {
              id: crypto.randomUUID(),
              timestamp: new Date(),
              action: "Started New Cycle",
              energyBefore: 0,
              energyAfter: p.startingEnergy,
              energyChange: p.startingEnergy,
              result: "rest",
              details: `Plan for ${format(new Date(), "PPP")} • Starting ${p.startingEnergy} energy`,
            },
          ],
        },
      };
    });
  }, []);

  const updatePlan = (updater: (p: DayPlan) => DayPlan) => {
    setPlans((prev) => ({ ...prev, [key]: updater(prev[key] ?? emptyPlan()) }));
  };

  const addLog = (entry: Omit<LogEntry, "id" | "timestamp">) => {
    updatePlan((p) => ({
      ...p,
      logs: [...p.logs, { ...entry, id: crypto.randomUUID(), timestamp: new Date() }],
    }));
  };

  const handleCalendarSelect = (d: Date | undefined) => {
    if (!d) return;
    setCalendarOpen(false);
    const k = dateKey(d);
    const existing = plans[k];
    if (existing?.started) {
      setSelectedDate(d);
      setPreviewCost(0);
      return;
    }
    setPendingDate(d);
    setPendingEnergy(existing?.startingEnergy ?? 100);
    setStartDialogOpen(true);
  };

  const handleConfirmStart = () => {
    if (!pendingDate) return;
    const k = dateKey(pendingDate);
    setPlans((prev) => ({
      ...prev,
      [k]: {
        ...emptyPlan(),
        started: true,
        startingEnergy: pendingEnergy,
        energy: pendingEnergy,
        logs: [
          {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            action: "Started New Cycle",
            energyBefore: 0,
            energyAfter: pendingEnergy,
            energyChange: pendingEnergy,
            result: "rest",
            details: `Plan for ${format(pendingDate, "PPP")} • Starting ${pendingEnergy} energy`,
          },
        ],
      },
    }));
    setSelectedDate(pendingDate);
    setPreviewCost(0);
    setStartDialogOpen(false);
    setPendingDate(null);
  };

  const handleAddTask = (task: Task) => {
    updatePlan((p) => ({ ...p, tasks: [...p.tasks, task] }));
    addLog({
      action: task.name,
      energyBefore: plan.energy,
      energyAfter: plan.energy,
      energyChange: 0,
      result: "added",
      details: task.type === "rest" ? `Rest (${task.restType})` : `Cost: ${task.cost} • ${task.risk}`,
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) return;
    updatePlan((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }));
    addLog({
      action: task.name,
      energyBefore: plan.energy,
      energyAfter: plan.energy,
      energyChange: 0,
      result: "removed",
      details: task.type === "rest" ? `Removed rest (+${Math.abs(task.cost)} reserved)` : `Freed ${task.cost} energy reserve`,
    });
  };

  const handleDoTask = (taskId: string, cost: number, type: "task" | "rest"): boolean => {
    const task = plan.tasks.find((t) => t.id === taskId);
    const taskName = task?.name ?? "Unknown";
    const energy = plan.energy;

    if (type === "rest") {
      const gain = Math.abs(cost);
      const newEnergy = Math.min(100, energy + gain);
      const actualGain = newEnergy - energy;
      updatePlan((p) => ({
        ...p,
        energy: newEnergy,
        tasks: p.tasks.filter((t) => t.id !== taskId),
        restCount: p.restCount + 1,
      }));
      addLog({
        action: taskName,
        energyBefore: energy,
        energyAfter: newEnergy,
        energyChange: actualGain,
        result: "rest",
        details: `Recovered +${actualGain} energy`,
      });
      return true;
    }

    const isOverloaded = energy < cost;
    const actualCost = isOverloaded ? Math.round(cost * 0.8) : cost;
    const newEnergy = Math.max(0, energy - actualCost);

    updatePlan((p) => ({
      ...p,
      energy: newEnergy,
      tasks: p.tasks.filter((t) => t.id !== taskId),
    }));

    addLog({
      action: taskName,
      energyBefore: energy,
      energyAfter: newEnergy,
      energyChange: -actualCost,
      result: isOverloaded ? "strained" : "success",
      details: isOverloaded ? `Low energy! -${actualCost}` : `-${actualCost} energy`,
    });

    return !isOverloaded;
  };

  const clearLogs = () => updatePlan((p) => ({ ...p, logs: [] }));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Zap className="h-7 w-7 text-primary animate-pulse-glow rounded-full" />
            <h1 className="font-display text-2xl font-bold tracking-widest text-foreground">
              ENERGY PLANNER
            </h1>
          </div>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "border-border text-foreground hover:bg-muted font-display tracking-wider",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {format(selectedDate, "EEE, MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleCalendarSelect}
                disabled={(date) => startOfDay(date) < today()}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-5">
            <EnergyBar
              energy={plan.energy}
              maxEnergy={100}
              previewCost={previewCost}
              pendingCost={plan.tasks.reduce((s, t) => s + t.cost, 0)}
              previewEnabled={previewEnabled}
              onPreviewEnabledChange={setPreviewEnabled}
            />
            <AddTaskForm energy={plan.energy} onAdd={handleAddTask} onPreviewCostChange={setPreviewCost} />
            <TaskList
              tasks={plan.tasks}
              energy={plan.energy}
              onDoTask={handleDoTask}
              onDeleteTask={handleDeleteTask}
            />
            <RestPanel restCount={plan.restCount} onAddRest={handleAddTask} />
          </div>

          <div className="lg:h-[calc(100vh-8rem)] lg:sticky lg:top-8">
            <ActivityLog logs={plan.logs} onClear={clearLogs} />
          </div>
        </div>
      </div>

      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-widest flex items-center gap-2">
              <Sun className="h-5 w-5 text-primary" />
              START NEW ENERGY CYCLE
            </DialogTitle>
            <DialogDescription>
              Create a new energy plan for{" "}
              <span className="text-foreground font-semibold">
                {pendingDate ? format(pendingDate, "EEEE, MMMM d") : ""}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-border bg-card/80 p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BatteryCharging className="h-4 w-4 text-accent" />
                <span>Not feeling 100%? Adjust starting energy</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={pendingEnergy}
                onChange={(e) => setPendingEnergy(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex items-center justify-between font-display tracking-wider">
                <span className="text-xs text-muted-foreground">HP</span>
                <span className="text-2xl text-primary">
                  {pendingEnergy}
                  <span className="text-sm text-muted-foreground">/100</span>
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmStart}
              className="w-full rounded-2xl bg-primary text-primary-foreground font-display text-lg font-bold tracking-widest py-5 px-6 animate-pulse-glow hover:scale-[1.02] active:scale-[0.99] transition-transform shadow-[0_0_40px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.8)]"
            >
              <span className="flex items-center justify-center gap-3">
                <Sun className="h-6 w-6" />
                START NEW ENERGY CYCLE
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

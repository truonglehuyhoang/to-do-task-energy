export interface Task {
  id: string;
  name: string;
  duration: number;
  intensity: "light" | "medium" | "heavy";
  cost: number;
  risk: string;
  type: "task" | "rest";
  restType?: "short" | "nap" | "deep";
}

const durationMap: Record<number, number> = { 30: 10, 60: 20, 120: 35, 180: 50 };
const intensityMap: Record<string, number> = { light: 0.8, medium: 1, heavy: 1.3 };

export function calcCost(dur: number, intensity: string): number {
  return Math.round((durationMap[dur] ?? 20) * (intensityMap[intensity] ?? 1));
}

export function calcRisk(cost: number, intensity: string, energy: number): string {
  const base: Record<string, number> = { light: 1, medium: 2, heavy: 3 };
  const risk = (base[intensity] ?? 2) + cost / 20 + (100 - energy) / 25;
  if (risk < 3) return "SAFE";
  if (risk < 5) return "MODERATE";
  return "HIGH";
}

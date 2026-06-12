export interface LogEntry {
  id: string;
  timestamp: Date;
  action: string;
  energyBefore: number;
  energyAfter: number;
  energyChange: number;
  result: "success" | "failed" | "strained" | "rest" | "added" | "removed";
  details?: string;
}

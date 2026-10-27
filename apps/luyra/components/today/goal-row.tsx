import type { Goal } from "@/types/goal";

export function GoalRow({ goal }: { goal: Goal }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="min-w-0 flex-1 truncate text-sm">{goal.title}</span>
      <div className="flex shrink-0 items-center gap-2">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary xs:w-24">
          <div className="h-full rounded-full bg-primary" style={{ width: `${goal.progress}%` }} />
        </div>
        <span className="w-9 text-right text-xs text-muted-foreground">{goal.progress}%</span>
      </div>
    </div>
  );
}

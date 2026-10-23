import { MILESTONE_LABELS, type MilestonePhase } from "@/lib/milestones";
import { cn } from "@/lib/utils";

const PHASE_STYLES: Record<MilestonePhase, string> = {
  detox: "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-300",
  momentum: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  foundation: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  consistency: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  identity: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  lifestyle: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  mastery: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400",
};

export function MilestoneBadge({ phase, className }: { phase: MilestonePhase; className?: string }) {
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", PHASE_STYLES[phase], className)}>
      {MILESTONE_LABELS[phase]}
    </span>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { listTasks } from "@/lib/services/task-service";
import { taskFiltersSchema } from "@/lib/validation/task";
import type { TaskPriority, TaskStatus } from "@/types/task";
import { TaskList } from "@/components/tasks/task-list";
import { PageHeader } from "@/components/layout/PageHeader";

const STATUS_TABS: { label: string; value: TaskStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Todo", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Done", value: "done" },
];

const PRIORITY_OPTIONS: { label: string; value: TaskPriority | undefined }[] = [
  { label: "All priorities", value: undefined },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>;
}) {
  const params = await searchParams;
  const filters = taskFiltersSchema.parse({
    status: params.status || undefined,
    priority: params.priority || undefined,
  });

  const appUser = await ensureAppUser();
  const tasks = await listTasks(appUser.id, filters);

  function hrefFor(next: { status?: TaskStatus; priority?: TaskPriority }): string {
    const query = new URLSearchParams();
    const status = "status" in next ? next.status : filters.status;
    const priority = "priority" in next ? next.priority : filters.priority;
    if (status) query.set("status", status);
    if (priority) query.set("priority", priority);
    const qs = query.toString();
    return qs ? `/tasks?${qs}` : "/tasks";
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Tasks" className="pb-0" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.label}
              href={hrefFor({ status: tab.value })}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-sm sm:min-h-9",
                filters.status === tab.value
                  ? "bg-secondary font-medium"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {PRIORITY_OPTIONS.map((option) => (
            <Link
              key={option.label}
              href={hrefFor({ priority: option.value })}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-sm sm:min-h-9",
                filters.priority === option.value
                  ? "bg-secondary font-medium"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <TaskList tasks={tasks} />
    </div>
  );
}

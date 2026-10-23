import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { getTodaySummary } from "@/lib/services/today-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickAddTask } from "@/components/today/quick-add-task";
import { QuickAddGoal } from "@/components/today/quick-add-goal";
import { TaskRow } from "@/components/today/task-row";
import { GoalRow } from "@/components/today/goal-row";
import { PageHeader } from "@/components/layout/PageHeader";
import { greetingFor } from "@/lib/greeting";

export default async function TodayPage() {
  const appUser = await ensureAppUser();
  const today = await getTodaySummary(appUser.id);

  const overdueCount = today.tasks.items.filter(
    (task) => task.dueDate && new Date(task.dueDate) < new Date(new Date().toDateString())
  ).length;

  const dateLabel = new Date(today.date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title={greetingFor(appUser.timezone).label} description={dateLabel} className="pb-0" />

      <Card>
        <CardHeader className="items-stretch justify-between gap-3 min-[520px]:flex-row min-[520px]:items-center">
          <div>
            <CardTitle>Tasks</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {today.tasks.total} remaining
              {overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
            </p>
          </div>
          <QuickAddTask />
        </CardHeader>
        <CardContent>
          {today.tasks.items.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nothing due today. Add a task to get started.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {today.tasks.items.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-stretch justify-between gap-3 min-[520px]:flex-row min-[520px]:items-center">
          <div>
            <CardTitle>Goals</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{today.goals.active} active</p>
          </div>
          <QuickAddGoal />
        </CardHeader>
        <CardContent>
          {today.goals.items.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No active goals yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {today.goals.items.map((goal) => (
                <GoalRow key={goal.id} goal={goal} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

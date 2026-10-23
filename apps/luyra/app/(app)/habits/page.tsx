import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { listHabits } from "@/lib/services/habit-service";
import { PageHeader } from "@/components/layout/PageHeader";
import { HabitList } from "@/components/habits/habit-list";

export default async function HabitsPage() {
  const appUser = await ensureAppUser();
  const habits = await listHabits(appUser.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Habits" className="pb-0" />
      <HabitList habits={habits} />
    </div>
  );
}

import "server-only";
import { Errors } from "@/lib/errors";
import { consistencyPercent, currentStreak, daysActive, longestStreak, toCheckinDate } from "@/lib/habits";
import {
  createHabit,
  deleteHabit,
  findCheckinsByHabit,
  findCheckinsByUser,
  findHabitById,
  findHabitsByUser,
  removeCheckin,
  setCheckin,
  updateHabit,
} from "@/lib/repositories/habit-repository";
import type { CreateHabitInput, UpdateHabitInput } from "@/lib/validation/habit";
import type { Habit, HabitCheckIn, HabitWithStats } from "@/types/habit";

function withStats(habit: Habit, checkins: HabitCheckIn[]): HabitWithStats {
  const today = toCheckinDate();
  return {
    ...habit,
    stats: {
      currentStreak: currentStreak(checkins),
      longestStreak: longestStreak(checkins),
      consistencyPercent: consistencyPercent(checkins, habit.startedAt),
      daysActive: daysActive(habit.startedAt),
      doneToday: checkins.some((c) => c.date === today && c.completed),
    },
  };
}

export async function listHabits(userId: string): Promise<HabitWithStats[]> {
  const habits = await findHabitsByUser(userId);
  if (habits.length === 0) return [];

  const checkins = await findCheckinsByUser(
    userId,
    habits.map((h) => h.id)
  );
  const checkinsByHabit = new Map<string, HabitCheckIn[]>();
  for (const checkin of checkins) {
    const list = checkinsByHabit.get(checkin.habitId) ?? [];
    list.push(checkin);
    checkinsByHabit.set(checkin.habitId, list);
  }

  return habits.map((habit) => withStats(habit, checkinsByHabit.get(habit.id) ?? []));
}

export async function getHabit(userId: string, id: string): Promise<HabitWithStats> {
  const habit = await findHabitById(id, userId);
  if (!habit) throw Errors.notFound("Habit");

  const checkins = await findCheckinsByHabit(id, userId);
  return withStats(habit, checkins);
}

export async function getHabitCheckins(userId: string, id: string): Promise<HabitCheckIn[]> {
  const habit = await findHabitById(id, userId);
  if (!habit) throw Errors.notFound("Habit");

  return findCheckinsByHabit(id, userId);
}

export async function addHabit(userId: string, input: CreateHabitInput): Promise<Habit> {
  return createHabit(userId, input);
}

export async function editHabit(userId: string, id: string, input: UpdateHabitInput): Promise<Habit> {
  const habit = await updateHabit(id, userId, input);
  if (!habit) throw Errors.notFound("Habit");
  return habit;
}

export async function removeHabit(userId: string, id: string): Promise<void> {
  const deleted = await deleteHabit(id, userId);
  if (!deleted) throw Errors.notFound("Habit");
}

export async function checkInHabit(userId: string, habitId: string, date: string): Promise<HabitCheckIn> {
  const habit = await findHabitById(habitId, userId);
  if (!habit) throw Errors.notFound("Habit");
  return setCheckin(habitId, userId, date);
}

export async function checkOutHabit(userId: string, habitId: string, date: string): Promise<void> {
  const habit = await findHabitById(habitId, userId);
  if (!habit) throw Errors.notFound("Habit");
  await removeCheckin(habitId, userId, date);
}

"use client"

import { useCallback, useRef, useState } from "react"
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { getApiErrorMessage, habitsApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import {
  consistencyPercent,
  currentStreak,
  daysActive,
  isDoneOn,
  longestStreak,
  withCheckin,
} from "@/lib/habits"
import { milestonePhase, nextMilestone } from "@/lib/milestones"
import { useLogActivity } from "@/hooks/useLogActivity"
import type { Habit, HabitCategory, HabitCheckIn } from "@/lib/types"

export const habitsQueryKey = (userId?: string | null) => ["habits", "list", userId] as const
export const habitCheckinsQueryKey = (habitId?: string | null) =>
  ["habits", "checkins", habitId] as const

// Unlike Recovery (one active habit at a time), Habits supports several
// running side by side — exercise, reading, meditation, etc. — so this
// returns the full active list rather than a single activeHabit.
export function useHabits() {
  const userId = getUserId()
  const queryClient = useQueryClient()
  const key = habitsQueryKey(userId)

  const { data, isPending, isError } = useQuery({
    queryKey: key,
    queryFn: habitsApi.getHabits,
    enabled: userId != null,
  })

  const habits = data ?? []
  const activeHabits = habits.filter((h) => h.active)

  const addHabit = async (input: {
    label: string
    category: HabitCategory
    identityStatement?: string
  }) => {
    const habit = await habitsApi.addHabit(input)
    await queryClient.invalidateQueries({ queryKey: key })
    return habit
  }

  const updateHabit = async (
    id: string,
    data: {
      label?: string
      category?: HabitCategory
      identityStatement?: string | null
      active?: boolean
    },
  ) => {
    const habit = await habitsApi.updateHabit(id, data)
    await queryClient.invalidateQueries({ queryKey: key })
    return habit
  }

  const deleteHabit = async (id: string) => {
    await habitsApi.removeHabit(id)
    await queryClient.invalidateQueries({ queryKey: key })
  }

  return {
    habits,
    activeHabits,
    loading: isPending,
    error: isError ? "Failed to load habits." : "",
    addHabit,
    updateHabit,
    deleteHabit,
  }
}

/** Local YYYY-MM-DD for `date` (defaults to today) — matches HabitCheckIn.date. */
export function toCheckinDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function useHabitCheckins(habitId: string | null, startedAt?: string) {
  const queryClient = useQueryClient()
  const key = habitCheckinsQueryKey(habitId)
  const { logActivity } = useLogActivity("habits")
  // Dates whose save is still in flight. The ref guards against a double tap
  // racing two requests for one date; the state drives aria-busy in the UI.
  const inFlight = useRef(new Set<string>())
  const [pendingDates, setPendingDates] = useState<ReadonlySet<string>>(() => new Set())

  const { data, isPending, isError } = useQuery({
    queryKey: key,
    queryFn: () => habitsApi.getCheckins(habitId as string),
    enabled: habitId != null,
  })

  const checkins = data ?? []
  const days = startedAt ? daysActive(startedAt) : 0

  const setPending = useCallback((date: string, pending: boolean) => {
    if (pending) inFlight.current.add(date)
    else inFlight.current.delete(date)
    setPendingDates(new Set(inFlight.current))
  }, [])

  /**
   * Flips `date` between done and not done. The cache changes first, so the
   * tap shows at once; a failed save flips just that date back and says so.
   * Resolves `true` once saved, `false` if it failed or was already saving.
   */
  const toggleCheckin = async (date: string): Promise<boolean> => {
    if (!habitId) throw new Error("No habit selected")
    if (inFlight.current.has(date)) return false
    setPending(date, true)

    await queryClient.cancelQueries({ queryKey: key })
    const current = queryClient.getQueryData<HabitCheckIn[]>(key) ?? []
    const done = !isDoneOn(current, date)
    queryClient.setQueryData<HabitCheckIn[]>(key, (list = []) =>
      withCheckin(list, habitId, date, done),
    )

    try {
      if (done) await habitsApi.setCheckin(habitId, date)
      else await habitsApi.removeCheckin(habitId, date)
      void logActivity()
      return true
    } catch (error) {
      // Undo only this date, so another date's tap in flight isn't lost.
      queryClient.setQueryData<HabitCheckIn[]>(key, (list = []) =>
        withCheckin(list, habitId, date, !done),
      )
      toast.error(getApiErrorMessage(error, "Couldn't save that check-in. Try again."))
      return false
    } finally {
      setPending(date, false)
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }

  return {
    checkins,
    loading: isPending,
    error: isError ? "Failed to load check-ins." : "",
    currentStreak: currentStreak(checkins),
    longestStreak: longestStreak(checkins),
    consistencyPercent: startedAt ? consistencyPercent(checkins, startedAt.slice(0, 10)) : 0,
    milestone: milestonePhase(days),
    nextMilestone: nextMilestone(days),
    pendingDates,
    toggleCheckin,
  }
}

/**
 * How many of `habits` are done today. Reads the same per-habit check-in
 * queries the cards use, so it adds no requests and follows their taps.
 */
export function useHabitsDoneToday(habits: Habit[]) {
  const today = toCheckinDate()
  return useQueries({
    queries: habits.map((habit) => ({
      queryKey: habitCheckinsQueryKey(habit.id),
      queryFn: () => habitsApi.getCheckins(habit.id),
    })),
    combine: (results) => ({
      done: results.filter((r) => isDoneOn(r.data ?? [], today)).length,
      total: habits.length,
      loading: results.some((r) => r.isPending),
    }),
  })
}

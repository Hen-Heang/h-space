"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { removeCheckin, setCheckin } from "@/lib/api/habits";
import type { HabitCheckIn } from "@/types/habit";

import { CheckinCalendar } from "./checkin-calendar";

export function HabitCheckinsSection({
  habitId,
  startedAt,
  checkins,
}: {
  habitId: string;
  startedAt: string;
  checkins: HabitCheckIn[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleToggle(date: string) {
    if (pending) return;
    setPending(true);
    try {
      const existing = checkins.find((c) => c.date === date && c.completed);
      if (existing) {
        await removeCheckin(habitId, date);
      } else {
        await setCheckin(habitId, date);
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return <CheckinCalendar checkins={checkins} startedAt={startedAt} onToggle={handleToggle} />;
}

"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { toCheckinDate } from "@/lib/habits";
import { cn } from "@/lib/utils";
import type { HabitCheckIn } from "@/types/habit";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function daysInMonth(month: Date): Date[] {
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function CheckinCalendar({
  checkins,
  startedAt,
  onToggle,
}: {
  checkins: HabitCheckIn[];
  startedAt: string;
  onToggle: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const completed = new Set(checkins.filter((c) => c.completed).map((c) => c.date));
  const start = startOfDay(new Date(`${startedAt.slice(0, 10)}T00:00:00`));
  const today = startOfDay(new Date());

  const days = daysInMonth(month);
  const leadingBlanks = startOfMonth(month).getDay();
  const nextMonthDisabled = addMonths(month, 1) > today;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:size-8"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <p className="text-sm font-semibold text-foreground">
          {/* Fixed locale, not `undefined` — checkins/startedAt arrive as SSR
              props, so this renders on the server (Node locale) and again on
              client hydration (browser locale); a mismatch there is a hydration error. */}
          {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          disabled={nextMonthDisabled}
          className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30 sm:size-8"
          aria-label="Next month"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className="text-[11px] font-semibold text-muted-foreground">
            {label}
          </span>
        ))}

        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <span key={`blank-${i}`} />
        ))}

        {days.map((day) => {
          const dateStr = toCheckinDate(day);
          const isCompleted = completed.has(dateStr);
          const isFuture = day > today;
          const beforeStart = day < start;
          const disabled = isFuture || beforeStart;
          const isToday = day.getTime() === today.getTime();

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(dateStr)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-xs font-semibold transition-all active:scale-90",
                disabled && "pointer-events-none text-muted-foreground/30",
                !disabled && !isCompleted && "bg-background text-muted-foreground hover:bg-accent",
                isCompleted && "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
                isToday && !isCompleted && !disabled && "ring-2 ring-emerald-500/40"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

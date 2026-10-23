"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createGoal } from "@/lib/api/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuickAddGoal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await createGoal({ title });
      setTitle("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Couldn't create the goal. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Goal
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-wrap items-center gap-2 min-[520px]:w-auto">
      <Input
        autoFocus
        placeholder="Goal title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="h-11 min-w-0 flex-[1_1_100%] min-[520px]:h-8 min-[520px]:w-56 min-[520px]:flex-none"
      />
      <Button type="submit" size="sm" disabled={pending || title.trim().length === 0}>
        Add
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}

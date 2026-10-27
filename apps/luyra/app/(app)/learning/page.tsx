import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function LearningPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Vocabulary review and your daily study plan, powered by Luyra&apos;s own Neon-backed learning data.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/learning/vocabulary" className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/30">
          <p className="font-semibold">Vocabulary</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Review due flashcards with spaced repetition, and manage your word library.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
            Open <ArrowUpRight className="size-3.5" />
          </span>
        </Link>
        <Link href="/learning/daily-study" className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/30">
          <p className="font-semibold">Daily Study</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Today&apos;s plan: review, shadowing, vocabulary, and spoken practice.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
            Open <ArrowUpRight className="size-3.5" />
          </span>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        Korean Coach and Interview practice aren&apos;t ported yet — both depend on an AI provider that hasn&apos;t
        been wired up in Luyra.
      </p>
    </div>
  );
}

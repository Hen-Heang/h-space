"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Loader2, Target, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { PageHero } from "@/components/app/page-hero"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { goalsApi, getApiErrorMessage } from "@/lib/api"
import { calculateGoalDeadlineInfo } from "@/lib/goals"

// Landing page for a shared goal link (/goals/join/<shareCode>). Previews the
// goal, then joins on confirm → redirects to the goal. Backed by
// goalsApi.previewByShareCode / joinByShareCode (GoalMemberController).
export default function JoinGoalPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [joining, setJoining] = useState(false)

  const {
    data: goal,
    isPending,
    error,
  } = useQuery({
    queryKey: ["goal-share", code],
    queryFn: () => goalsApi.previewByShareCode(code),
    enabled: !!code,
    retry: false,
  })

  const deadline = useMemo(() => (goal ? calculateGoalDeadlineInfo(goal) : null), [goal])

  const handleJoin = async () => {
    setJoining(true)
    try {
      const joined = await goalsApi.joinByShareCode(code)
      toast.success("You've joined the goal")
      router.push(`/goals/${joined.id}`)
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Could not join this goal"))
      setJoining(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Link
        href="/goals"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} /> Goals
      </Link>

      <PageHero
        eyebrow="Invitation"
        title="Join a goal"
        description="You've been invited to collaborate."
        variant="compact"
      />

      <Card className="border-border bg-card/50 p-5 shadow-sm sm:p-6">
        {isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ) : error || !goal ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Target size={32} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Invalid or expired link</h2>
              <p className="mt-1 max-w-sm text-sm font-medium text-muted-foreground">
                This share link no longer works. Ask the goal owner for a fresh one.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/goals">Back to goals</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl font-semibold text-primary">
                {goal.metadata?.icon || (goal.title ? goal.title.charAt(0).toUpperCase() : "G")}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
                  {goal.title}
                </h2>
                {goal.description && (
                  <p className="mt-1 line-clamp-3 text-sm font-medium text-muted-foreground">
                    {goal.description}
                  </p>
                )}
                {deadline && (
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    {deadline.statusMessage}
                  </p>
                )}
              </div>
            </div>

            <Button onClick={handleJoin} disabled={joining} className="h-12 w-full gap-2 text-base">
              {joining ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {joining ? "Joining…" : "Join this goal"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

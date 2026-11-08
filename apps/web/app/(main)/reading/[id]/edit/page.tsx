"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { SearchX } from "lucide-react"

import { UnitEditor } from "@/components/reading/UnitEditor"
import { readingApi } from "@/lib/api"
import type { ReadingUnit } from "@/lib/reading"
import { EmptyState } from "@/components/ui/empty-state"
import { ReaderSkeleton } from "@/components/ui/reader-skeleton"
import { Button } from "@/components/ui/button"

export default function EditReadingUnitPage() {
  const params = useParams<{ id: string }>()
  // Same fix as the unit detail page: on a hard load useParams() returns the
  // raw percent-encoded segment for non-ASCII (Korean) ids — decode it so the
  // Supabase lookup matches the stored id.
  const unitId = decodeURIComponent(params.id)
  const [unit, setUnit] = useState<ReadingUnit | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    readingApi
      .getUnit(unitId)
      .then((u) => active && setUnit(u))
      .catch(() => active && setUnit(null))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [unitId])

  if (loading) {
    return <ReaderSkeleton label="Loading unit…" variant="form" />
  }

  if (!unit) {
    return (
      <EmptyState
        className="py-24"
        icon={SearchX}
        title="Unit not found"
        description="It may have been deleted, or the link is wrong."
        action={
          <Button asChild variant="outline">
            <Link href="/phrasebook?mode=reading">Back to reading units</Link>
          </Button>
        }
      />
    )
  }

  return <UnitEditor key={unit.id} unit={unit} />
}

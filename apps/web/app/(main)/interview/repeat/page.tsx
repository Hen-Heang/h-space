import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"

import { ListenRepeatPractice } from "@/components/interview/ListenRepeatPractice"
import { Button } from "@/components/ui/button"

// Listen & Repeat now lives in My exam script (its "Listen & Repeat" tab);
// this route keeps working for links and bookmarks and shows the same practice.
export default function ListenRepeatPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-10">
          <Link href="/interview">
            <ArrowLeft aria-hidden="true" /> Exam Prep
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-10">
          <Link href="/interview/script?tab=repeat">
            <FileText aria-hidden="true" /> Part of My exam script
          </Link>
        </Button>
      </div>
      <ListenRepeatPractice />
    </div>
  )
}

"use client"

import { ClipboardPaste, PencilLine, Sparkles } from "lucide-react"

import { useIsMobile } from "@/hooks/useMobile"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddWordCard } from "@/components/vocab/AddWordCard"
import { DeckBuilder } from "@/components/vocab/DeckBuilder"
import { TextbookImport } from "@/components/vocab/TextbookImport"
import type { VocabItem } from "@/lib/types"

type AddWordsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing topics, offered as suggestions in the manual form. */
  topics: string[]
  dueCount: number
  totalCount: number
  /** Terms already saved, used by the import tab to skip duplicates. */
  existingTerms: string[]
  onAdd: (data: {
    category?: string
    term: string
    meaning: string
    example?: string
  }) => Promise<VocabItem>
  /** Lets a bare-term quick capture get its meaning filled in by AI afterward. */
  onUpdate: (
    id: string,
    data: { term: string; meaning: string; example?: string; pronunciation?: string },
  ) => Promise<void>
  onGenerate: (category: string) => Promise<void>
  onImport: (deckName: string, text: string) => Promise<number>
}

const TITLE = "Grow your vocabulary"

/**
 * Single entry point for getting words into the deck. Renders as a bottom
 * sheet on mobile (soft-keyboard friendly) and a centered dialog on desktop.
 */
export function AddWordsDialog({
  open,
  onOpenChange,
  topics,
  dueCount,
  totalCount,
  existingTerms,
  onAdd,
  onUpdate,
  onGenerate,
  onImport,
}: AddWordsDialogProps) {
  const isMobile = useIsMobile()
  const description = `${totalCount} words saved${dueCount > 0 ? ` · ${dueCount} due now` : ""}. Add one word, generate a focused deck, or paste a list.`

  const tabs = (
    <Tabs defaultValue="manual">
      <TabsList className="grid h-12 w-full grid-cols-3 rounded-2xl border border-border/70 bg-muted/60 p-1">
        <TabsTrigger value="manual" className="gap-1.5 rounded-xl px-2 text-xs font-semibold">
          <PencilLine size={14} />
          Add one
        </TabsTrigger>
        <TabsTrigger value="ai" className="gap-1.5 rounded-xl px-2 text-xs font-semibold">
          <Sparkles size={14} />
          Build deck
        </TabsTrigger>
        <TabsTrigger value="import" className="gap-1.5 rounded-xl px-2 text-xs font-semibold">
          <ClipboardPaste size={14} />
          Paste list
        </TabsTrigger>
      </TabsList>
      <TabsContent value="manual" className="pt-2">
        <AddWordCard embedded categories={topics} onAdd={onAdd} onUpdate={onUpdate} />
      </TabsContent>
      <TabsContent value="ai" className="pt-2">
        <DeckBuilder embedded dueCount={dueCount} totalCount={totalCount} onGenerate={onGenerate} />
      </TabsContent>
      <TabsContent value="import" className="pt-2">
        <TextbookImport embedded existingTerms={existingTerms} onImport={onImport} />
      </TabsContent>
    </Tabs>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[88dvh] gap-0 rounded-t-3xl">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-lg font-semibold">{TITLE}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {tabs}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{TITLE}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {tabs}
      </DialogContent>
    </Dialog>
  )
}

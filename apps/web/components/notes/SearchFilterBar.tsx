"use client"

import { useEffect, useState } from "react"
import { ListFilter, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Search + filter row shared by Notes Home and a project's Notes tab: one
// search field with a clear icon, a filter icon button that opens a popover
// (desktop) or a bottom sheet (phones), and the active filters written out
// below with "Clear filters".

const DESKTOP_QUERY = "(min-width: 768px)"

/** True from md up. False on the first render, so phones never flash a popover. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setDesktop(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])
  return desktop
}

/** Icon-only button with an accessible name, a tooltip and a 44px hit area. */
export function IconTipButton({
  label,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn("size-11 text-muted-foreground hover:text-foreground", className)}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** A labelled group inside the filter panel. */
export function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </legend>
      {children}
    </fieldset>
  )
}

export function SearchFilterBar({
  query,
  onQueryChange,
  searchLabel,
  placeholder,
  activeFilters,
  onClearFilters,
  filterTitle = "Filters",
  filterDescription,
  children,
}: {
  query: string
  onQueryChange: (value: string) => void
  /** Accessible name of the search field. */
  searchLabel: string
  placeholder: string
  /** Active filters written out, e.g. ["Decision", "Pinned only"]. */
  activeFilters: string[]
  onClearFilters: () => void
  filterTitle?: string
  filterDescription?: string
  /** The filter controls. Omit to hide the filter button. */
  children?: React.ReactNode
}) {
  const desktop = useIsDesktop()
  const [open, setOpen] = useState(false)
  const count = activeFilters.length
  const filterLabel = count > 0 ? `${filterTitle} (${count} active)` : filterTitle

  // Radix's PopoverTrigger toggles the popover itself; the sheet needs a click handler.
  const renderTrigger = (props: React.ComponentProps<"button"> = {}) => (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={filterLabel}
      {...props}
      className={cn(
        "relative size-11 shrink-0 rounded-xl",
        count > 0 ? "border-primary/50 text-primary" : "text-muted-foreground",
      )}
    >
      <ListFilter aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums"
        >
          {count}
        </span>
      )}
    </Button>
  )

  const clearButton = count > 0 && (
    <button
      type="button"
      onClick={onClearFilters}
      className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      Clear filters
    </button>
  )

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            aria-label={searchLabel}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault()
                onQueryChange("")
              }
            }}
            placeholder={placeholder}
            // text-base on phones stops iOS zooming into the field.
            className="h-11 w-full min-w-0 rounded-xl border border-border bg-card pr-11 pl-10 text-base text-foreground outline-none placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <div className="absolute top-0 right-0">
              <IconTipButton label="Clear search" onClick={() => onQueryChange("")}>
                <X aria-hidden="true" />
              </IconTipButton>
            </div>
          )}
        </div>

        {children &&
          (desktop ? (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>{renderTrigger()}</PopoverTrigger>
              <PopoverContent align="end" aria-label={filterTitle} className="w-80 space-y-5">
                {children}
                {clearButton && <div className="border-t border-border pt-2">{clearButton}</div>}
              </PopoverContent>
            </Popover>
          ) : (
            <>
              {renderTrigger({
                "aria-haspopup": "dialog",
                "aria-expanded": open,
                onClick: () => setOpen(true),
              })}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                  side="bottom"
                  className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
                >
                  <SheetHeader className="pr-14">
                    <SheetTitle className="font-semibold">{filterTitle}</SheetTitle>
                    {filterDescription && <SheetDescription>{filterDescription}</SheetDescription>}
                  </SheetHeader>
                  <div className="space-y-5 px-4 pb-2">{children}</div>
                  <SheetFooter className="flex-row items-center justify-between border-t border-border">
                    {clearButton || <span />}
                    <Button type="button" className="h-11 px-6" onClick={() => setOpen(false)}>
                      Done
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </>
          ))}
      </div>

      {count > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <p className="min-w-0 break-words">
            <span className="sr-only">Active filters: </span>
            <span aria-hidden="true">Filtered by </span>
            <span className="font-medium text-foreground">{activeFilters.join(" · ")}</span>
          </p>
          {clearButton}
        </div>
      )}
    </div>
  )
}

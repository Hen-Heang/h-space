"use client"

import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  VAULT_CATEGORIES,
  VAULT_SORTS,
  VAULT_STATUSES,
  type VaultFilters,
  type VaultSort,
  type VaultStatus,
  type VaultView,
} from "@/lib/vault"
import { cn } from "@/lib/utils"

const VIEWS: Array<{ id: VaultView; label: string }> = [
  { id: "all", label: "All accounts" },
  { id: "favorites", label: "Favorites" },
]

export function VaultToolbar({
  filters,
  onChange,
  categoryCounts,
  grouped,
  onGroupedChange,
}: {
  filters: VaultFilters
  onChange: (patch: Partial<VaultFilters>) => void
  categoryCounts: Record<string, number>
  grouped: boolean
  onGroupedChange: (grouped: boolean) => void
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Search service, label, email or username"
          aria-label="Search accounts"
          autoComplete="off"
          spellCheck={false}
          className="h-11 pr-11 pl-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => onChange({ query: "" })}
            aria-label="Clear search"
            className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:size-11"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div
          role="group"
          aria-label="Show"
          className="inline-flex w-full shrink-0 rounded-lg border border-border bg-muted/40 p-1 sm:w-auto"
        >
          {VIEWS.map((view) => (
            <button
              key={view.id}
              type="button"
              aria-pressed={filters.view === view.id}
              onClick={() => onChange({ view: view.id })}
              className={cn(
                "min-h-9 flex-1 rounded-md px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:flex-none [@media(pointer:coarse)]:min-h-10",
                filters.view === view.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
          <Select value={filters.category} onValueChange={(category) => onChange({ category })}>
            <SelectTrigger aria-label="Filter by category" className="col-span-2 sm:col-span-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {VAULT_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label} ({categoryCounts[c.id] ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(status) => onChange({ status: status as VaultStatus | "all" })}
          >
            <SelectTrigger aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              {VAULT_STATUSES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.sort}
            onValueChange={(sort) => onChange({ sort: sort as VaultSort })}
          >
            <SelectTrigger aria-label="Sort accounts">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VAULT_SORTS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
          <Switch checked={grouped} onCheckedChange={onGroupedChange} />
          Group by category
        </label>
      </div>
    </div>
  )
}

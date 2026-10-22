"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon, FinanceEmptyState, FinanceErrorState } from "@/components/finance/ui/finance-primitives";
import {
  CATEGORY_TYPE_LABELS,
  CategorySheet,
  type CategoryFormValues,
} from "@/components/finance/settings/category-sheet";
import { DeleteLookupDialog, LookupRowActions } from "@/components/finance/settings/lookup-primitives";
import { ApiError } from "@/lib/api/client";
import { createCategory, deleteCategory, updateCategory } from "@/lib/api/finance";
import { SPENDING_CLASS_META } from "@/lib/finance/spending-class";
import { financeKeys, useCategories } from "@/lib/query/finance-queries";
import type { Category } from "@/types/finance";

export function CategoriesSection() {
  const queryClient = useQueryClient();
  const { data: categories = [], isPending: loading, isError: loadError, refetch } = useCategories();
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Category | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Invalidating the shared key refetches in the background — the current
  // list stays on screen — and also refreshes every category picker that
  // reads the same cache (transactions, quick add).
  const reload = () => queryClient.invalidateQueries({ queryKey: financeKeys.categories() });

  async function handleSave(values: CategoryFormValues) {
    if (sheetMode === "edit" && editing) {
      await updateCategory(editing.id, values);
    } else {
      await createCategory(values);
    }
    reload();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (error) {
      // A category still referenced by transactions, budgets, or templates comes
      // back as a 409 that names what is holding it. Keep the dialog open so the
      // explanation stays where the user asked for the delete.
      setDeleteError(error instanceof ApiError ? error.message : "Couldn't delete the category. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (loadError) {
    return (
      <FinanceErrorState
        title="Categories unavailable"
        description="We couldn't load your categories. Try again in a moment."
        onRetry={() => void refetch()}
      />
    );
  }

  if (loading) {
    return <div className="h-32 rounded-2xl bg-secondary motion-safe:animate-pulse" aria-busy="true" aria-label="Loading categories" />;
  }

  return (
    <div className="space-y-3">
      {categories.length === 0 ? (
        <FinanceEmptyState
          icon={Tags}
          title="No categories yet"
          description="Add your first category to start grouping transactions and setting budgets."
          action={
            <Button
              size="sm"
              onClick={() => {
                setSheetMode("create");
                setEditing(undefined);
                setSheetOpen(true);
              }}
              className="min-h-11"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add category
            </Button>
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border bg-card">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-3 px-3 py-2">
                <CategoryIcon icon={category.icon} color={category.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_TYPE_LABELS[category.type]}
                    {category.spendingClass ? ` · ${SPENDING_CLASS_META[category.spendingClass].label}` : " · Unclassified"}
                  </p>
                </div>
                <LookupRowActions
                  name={category.name}
                  onEdit={() => {
                    setSheetMode("edit");
                    setEditing(category);
                    setSheetOpen(true);
                  }}
                  onDelete={() => {
                    setDeleteError(null);
                    setDeleteTarget(category);
                  }}
                />
              </li>
            ))}
          </ul>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSheetMode("create");
              setEditing(undefined);
              setSheetOpen(true);
            }}
            className="min-h-11"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add category
          </Button>
        </>
      )}

      <CategorySheet
        mode={sheetMode}
        category={editing}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={handleSave}
      />

      <DeleteLookupDialog
        isOpen={deleteTarget !== null}
        isDeleting={deleting}
        entityLabel="category"
        name={deleteTarget?.name ?? ""}
        error={deleteError}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

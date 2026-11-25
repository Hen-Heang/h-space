"use client"

import { Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { VaultAccount } from "@/lib/vault"
import { accountTitle } from "./VaultAccountCard"

export function VaultDeleteDialog({
  account,
  deleting,
  onCancel,
  onConfirm,
}: {
  account: VaultAccount | null
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={account != null} onOpenChange={(open) => !open && !deleting && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this account entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes <strong>{account ? accountTitle(account) : ""}</strong> from H-Vault,
            including any password saved with it. The account at the service itself isn&apos;t
            affected. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

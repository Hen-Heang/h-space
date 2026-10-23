"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, ShieldCheck, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { TagEditor } from "@/components/ui/tag-editor"
import {
  emptyVaultAccountForm,
  VAULT_CATEGORIES,
  VAULT_LOGIN_METHODS,
  VAULT_PASSWORD_NOTICE,
  VAULT_STATUSES,
  vaultAccountFormSchema,
  type VaultAccountFormValues,
} from "@/lib/vault"
import { generateVaultPassword } from "@/lib/vault-password-generator"

const optional = <span className="font-normal text-muted-foreground">(optional)</span>

/**
 * Add / edit an account. The password field is plain only inside this form:
 * the dashboard encrypts it in the browser before anything is saved, and a
 * saved password is never decrypted back into the form. There is
 * intentionally no PIN, recovery-code or free-text notes field.
 */
export function VaultAccountFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  hasSavedPassword = false,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValues?: VaultAccountFormValues
  /** Edit only: whether the account already has an encrypted password. */
  hasSavedPassword?: boolean
  onSubmit: (values: VaultAccountFormValues) => Promise<unknown>
}) {
  const form = useForm<VaultAccountFormValues>({
    resolver: zodResolver(vaultAccountFormSchema),
    defaultValues: initialValues ?? emptyVaultAccountForm,
  })

  const [showPassword, setShowPassword] = useState(false)

  // Reset to the latest initial values every time the dialog opens, so an
  // edit never shows the previous account's fields (or a typed password).
  useEffect(() => {
    if (open) form.reset(initialValues ?? emptyVaultAccountForm)
  }, [open, initialValues, form])

  // Disables the password input while "Remove saved password" is on.
  const removing = useWatch({ control: form.control, name: "removePassword" })

  const submitting = form.formState.isSubmitting

  // Closing always re-hides the password, so the next open starts masked.
  const close = () => {
    setShowPassword(false)
    onOpenChange(false)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values)
      close()
    } catch {
      // The caller already surfaced the error (toast); keep the dialog open
      // so nothing typed is lost.
    }
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !submitting && (next ? onOpenChange(true) : close())}
    >
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <DialogHeader>
              <DialogTitle>{mode === "create" ? "Add account" : "Edit account"}</DialogTitle>
              <DialogDescription className="flex items-start gap-2">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <span>{VAULT_PASSWORD_NOTICE}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="serviceName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Service name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="off"
                        placeholder="e.g. GitHub"
                        maxLength={120}
                        aria-required="true"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account label {optional}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="off"
                        placeholder="Personal, Secondary…"
                        maxLength={80}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="loginIdentifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Login email or username {optional}</FormLabel>
                    <FormControl>
                      {/* Plain text, and autocomplete off so password managers
                          never offer to save a credential into this form. */}
                      <Input
                        {...field}
                        type="text"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        data-1p-ignore
                        data-bwignore
                        data-lpignore="true"
                        maxLength={254}
                        placeholder="name@example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="loginMethod"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Sign-in method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VAULT_LOGIN_METHODS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.id === "password" || m.id === "sso"
                              ? m.label
                              : `Continue with ${m.label}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      For &ldquo;Continue with Google&rdquo; and similar, put that account&apos;s
                      email above.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Password {optional}</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          autoCapitalize="none"
                          spellCheck={false}
                          maxLength={1024}
                          disabled={removing}
                          className="pr-12"
                          placeholder={
                            hasSavedPassword ? "Leave blank to keep the saved password" : undefined
                          }
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute top-1/2 right-1 -translate-y-1/2"
                      >
                        {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <FormDescription>
                        Encrypted in your browser with your master password before it&apos;s saved.
                      </FormDescription>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={removing}
                        onClick={() => {
                          form.setValue("password", generateVaultPassword(), {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                          setShowPassword(true)
                        }}
                      >
                        <Wand2 aria-hidden="true" />
                        Generate
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mode === "edit" && hasSavedPassword && (
                <FormField
                  control={form.control}
                  name="removePassword"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border border-border px-3 py-2 sm:col-span-2">
                      <div>
                        <FormLabel>Remove saved password</FormLabel>
                        <FormDescription>
                          Deletes the encrypted password from this account.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (checked) form.setValue("password", "")
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Website {optional}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        inputMode="url"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="https://github.com/login"
                        maxLength={2000}
                      />
                    </FormControl>
                    <FormDescription>Secure https:// links only.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VAULT_CATEGORIES.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VAULT_STATUSES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Tags {optional}</FormLabel>
                    <TagEditor
                      tags={field.value}
                      onChange={field.onChange}
                      placeholder="work, study…"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFavorite"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border border-border px-3 py-2 sm:col-span-2">
                    <div>
                      <FormLabel>Favorite</FormLabel>
                      <FormDescription>Keep frequently used accounts at hand.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                {mode === "create" ? "Add account" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

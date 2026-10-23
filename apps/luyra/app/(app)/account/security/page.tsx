import { SetPasswordForm } from "@/components/account/set-password-form";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AccountSecurityPage() {
  const user = await ensureAppUser();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Account</p>
        <PageHeader
          title="Security"
          description="Manage sign-in methods for your Luyra account."
          className="pb-0"
        />
      </div>

      <SetPasswordForm email={user.email} />
    </div>
  );
}

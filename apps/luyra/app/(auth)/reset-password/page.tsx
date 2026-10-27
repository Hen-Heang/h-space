import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      description="Create a strong password for the same Luyra account you already use."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}

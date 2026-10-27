import { FinanceSettingsForm } from "@/components/finance/settings/finance-settings-form";
import { PushNotificationSettings } from "@/components/finance/settings/push-notification-settings";
import { FinanceSection } from "@/components/finance/ui/finance-primitives";

export default function FinanceSettingsPage() {
  return (
    <div className="space-y-6">
      <FinanceSettingsForm />
      <FinanceSection
        id="settings-push-notifications"
        title="Push notifications"
        description="Optional browser alerts for important Finance status changes. Notification permission is requested only when you enable it."
      >
        <PushNotificationSettings />
      </FinanceSection>
    </div>
  );
}

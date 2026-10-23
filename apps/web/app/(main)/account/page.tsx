import { redirect } from "next/navigation"

// Keep legacy account links working while using Settings as the single
// canonical account screen.
export default function AccountPage() {
  redirect("/settings")
}

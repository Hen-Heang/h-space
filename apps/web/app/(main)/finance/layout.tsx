import { FinanceNav } from "@/components/finance/finance-nav"
import "./luyra-theme.css"

// Finance, moving in from Luyra (docs/LUYRA_MIGRATION.md). The `luyra` class
// scopes Luyra's color tokens to this area so its screens keep their look.
// Data comes from app/api/finance/*, which reads Luyra's Neon database for the
// linked account only.
export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="luyra mx-auto flex w-full max-w-4xl flex-col gap-6">
      <FinanceNav />
      {children}
    </div>
  )
}

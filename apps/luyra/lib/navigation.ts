import {
  BarChart3,
  Bell,
  ClipboardCheck,
  Goal,
  GraduationCap,
  Home,
  LayoutDashboard,
  ListTodo,
  PiggyBank,
  Receipt,
  Repeat,
  Settings,
  ShieldCheck,
  Wallet,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  href: string;
  label: string;
  /** Compact label for the mobile bottom bar. */
  shortLabel?: string;
  description?: string;
  icon: LucideIcon;
  color?: string;
  /** Nav destination exists in the model but has no route/UI yet. */
  soon?: boolean;
};

export const todayItem: NavItem = {
  id: "today",
  href: "/today",
  label: "Today",
  icon: Home,
  color: "text-amber-500",
};

export const tasksItem: NavItem = {
  id: "tasks",
  href: "/tasks",
  label: "Tasks",
  icon: ListTodo,
  color: "text-sky-500",
};

export const goalsItem: NavItem = {
  id: "goals",
  href: "/goals",
  label: "Goals",
  icon: Goal,
  color: "text-violet-500",
};

export const habitsItem: NavItem = {
  id: "habits",
  href: "/habits",
  label: "Habits",
  icon: Repeat,
  color: "text-emerald-500",
};

export const financeItem: NavItem = {
  id: "finance",
  href: "/finance",
  label: "Luyra",
  icon: WalletCards,
  color: "text-teal-500",
};

export const learnItem: NavItem = {
  id: "learn",
  href: "/learning",
  label: "Learn",
  icon: GraduationCap,
  color: "text-indigo-500",
};

export const remindersItem: NavItem = {
  id: "reminders",
  href: "/reminders",
  label: "Reminders",
  icon: Bell,
  color: "text-rose-500",
  soon: true,
};

export const accountItem: NavItem = {
  id: "account",
  href: "/account/security",
  label: "Account",
  icon: ShieldCheck,
  color: "text-zinc-500",
};

/** Luyra feature navigation. Desktop and tablet render this in the app shell;
 * mobile renders the same destinations as a compact tab strip. */
export const financeNavItems: NavItem[] = [
  { id: "finance-overview", href: "/finance", label: "Overview", icon: LayoutDashboard, color: "text-sky-500" },
  { id: "finance-transactions", href: "/finance/transactions", label: "Transactions", shortLabel: "Activity", icon: Receipt, color: "text-teal-500" },
  { id: "finance-budgets", href: "/finance/budgets", label: "Budgets", icon: Wallet, color: "text-orange-500" },
  { id: "finance-savings", href: "/finance/savings", label: "Savings", icon: PiggyBank, color: "text-amber-500" },
  { id: "finance-analytics", href: "/finance/analytics", label: "Analytics", icon: BarChart3, color: "text-fuchsia-500" },
  { id: "finance-review", href: "/finance/review", label: "Review", icon: ClipboardCheck, color: "text-indigo-500" },
  { id: "finance-subscriptions", href: "/finance/subscriptions", label: "Subscriptions", icon: Repeat, color: "text-violet-500" },
  { id: "finance-settings", href: "/finance/settings", label: "Settings", icon: Settings, color: "text-zinc-500" },
];

/** Luyra is the active product. Its features are the primary app destinations. */
export const primaryNavItems: NavItem[] = financeNavItems;

export const allNavItems: NavItem[] = [...primaryNavItems, accountItem];

/** Mobile bottom bar: four core money-flow destinations plus More.
 * The shorter set preserves readable labels and touch targets on narrow phones. */
export const bottomTabs: NavItem[] = [
  financeNavItems[0], // Overview
  financeNavItems[1], // Transactions
  financeNavItems[2], // Budgets
  financeNavItems[3], // Savings
];

export const moreItems: NavItem[] = [
  financeNavItems[4], // Analytics
  financeNavItems[5], // Review
  financeNavItems[6], // Subscriptions
  financeNavItems[7], // Settings
  accountItem,
];

export function linkPath(href: string): string {
  const qIndex = href.indexOf("?");
  return qIndex === -1 ? href : href.slice(0, qIndex);
}

export function isNavigationItemActive({
  pathname,
  item,
}: {
  pathname: string;
  item: NavItem;
}): boolean {
  const path = linkPath(item.href);
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function getActiveNavItem(pathname: string): NavItem | undefined {
  // Prefer the most specific path. Without this, `/finance` would also win
  // for every nested finance destination.
  return allNavItems
    .filter((item) => isNavigationItemActive({ pathname, item }))
    .sort((a, b) => linkPath(b.href).length - linkPath(a.href).length)[0];
}

export function getActiveBottomTabIndex(pathname: string): number {
  // Resolve against every destination, not just the four tabs: Overview's
  // `/finance` prefix-matches every nested finance route, so matching within
  // `bottomTabs` alone would keep Overview lit on Budgets and Savings, and
  // light it a second time alongside "More" on Analytics or Settings.
  const activeItem = getActiveNavItem(pathname);
  if (!activeItem) return -1;

  return bottomTabs.findIndex((item) => item.id === activeItem.id);
}

/** Whether the current route lives behind the bottom bar's "More" slot. */
export function isMoreSectionActive(pathname: string): boolean {
  return moreItems.some((item) => isNavigationItemActive({ pathname, item }));
}

/** A route is a "detail" view when it sits below a top-level nav destination. */
export function isDetailRoute(pathname: string): boolean {
  return !allNavItems.some((item) => linkPath(item.href) === pathname);
}

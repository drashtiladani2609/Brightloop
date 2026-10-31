import {
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  Layers,
  LayoutDashboard,
  Percent,
  Receipt,
  ScrollText,
  Settings2,
  ShieldCheck,
  Timer,
  Users,
  Wallet
} from "lucide-react"
import type { Role } from "@/lib/constants"

export type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  roles: Role[]
  group: string
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "STAFF"], group: "Overview" },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["ADMIN", "STAFF"], group: "Overview" },
  { href: "/subscriptions", label: "Subscriptions", icon: Layers, roles: ["ADMIN", "STAFF"], group: "Billing" },
  { href: "/invoices", label: "Invoices", icon: FileText, roles: ["ADMIN", "STAFF"], group: "Billing" },
  { href: "/payments", label: "Payments", icon: Wallet, roles: ["ADMIN", "STAFF"], group: "Billing" },
  { href: "/billing-runs", label: "Billing runs", icon: Timer, roles: ["ADMIN", "STAFF"], group: "Billing" },
  { href: "/customers", label: "Customers", icon: Users, roles: ["ADMIN", "STAFF"], group: "Catalogue" },
  { href: "/products", label: "Products", icon: Boxes, roles: ["ADMIN", "STAFF"], group: "Catalogue" },
  { href: "/plans", label: "Plans", icon: Receipt, roles: ["ADMIN", "STAFF"], group: "Catalogue" },
  { href: "/templates", label: "Quotation templates", icon: ScrollText, roles: ["ADMIN", "STAFF"], group: "Catalogue" },
  { href: "/taxes", label: "Taxes", icon: Percent, roles: ["ADMIN"], group: "Admin" },
  { href: "/discounts", label: "Discounts", icon: CreditCard, roles: ["ADMIN"], group: "Admin" },
  { href: "/team", label: "Team and access", icon: ShieldCheck, roles: ["ADMIN"], group: "Admin" },
  { href: "/account", label: "My account", icon: Settings2, roles: ["ADMIN", "STAFF"], group: "Admin" }
]

export const PORTAL_NAV: NavItem[] = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard, roles: ["CUSTOMER"], group: "Portal" },
  { href: "/portal/subscriptions", label: "My subscriptions", icon: Layers, roles: ["CUSTOMER"], group: "Portal" },
  { href: "/portal/invoices", label: "My invoices", icon: FileText, roles: ["CUSTOMER"], group: "Portal" },
  { href: "/portal/payments", label: "Payment history", icon: Wallet, roles: ["CUSTOMER"], group: "Portal" },
  { href: "/portal/profile", label: "Profile", icon: Settings2, roles: ["CUSTOMER"], group: "Portal" }
]

export function navForRole(role: string) {
  return NAV.filter((item) => item.roles.includes(role as Role))
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, ListOrdered, LayoutDashboard, Tag, Package, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "POS", href: "/", icon: LayoutDashboard },
  { name: "Sản phẩm", href: "/products", icon: Coffee },
  { name: "Kho hàng", href: "/inventory", icon: Package },
  { name: "Đơn hàng", href: "/orders", icon: ListOrdered },
  { name: "Khuyến mãi", href: "/discounts", icon: Tag },
  { name: "Báo cáo", href: "/reports", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-24 border-r-0 md:border-r border-border bg-card flex flex-row md:flex-col items-center justify-around md:justify-start py-2 md:py-6 gap-2 md:gap-8 shrink-0 h-16 md:h-full">
      <div className="hidden md:flex w-12 h-12 bg-primary text-primary-foreground rounded-xl items-center justify-center font-bold text-xl shadow-sm">
        M
      </div>
      <nav className="flex flex-row md:flex-col justify-around md:justify-start gap-1 md:gap-4 w-full md:px-3 px-1 h-full">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 md:p-3 rounded-xl transition-all flex-1 md:flex-none",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-[7px] md:text-[10px] uppercase tracking-wider">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, ListOrdered, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "POS", href: "/", icon: LayoutDashboard },
  { name: "Sản phẩm", href: "/products", icon: Coffee },
  { name: "Đơn hàng", href: "/orders", icon: ListOrdered },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-24 border-r border-border bg-card flex flex-col items-center py-6 gap-8 shrink-0 h-full">
      <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold text-xl shadow-sm">
        M
      </div>
      <nav className="flex flex-col gap-4 w-full px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] uppercase tracking-wider">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

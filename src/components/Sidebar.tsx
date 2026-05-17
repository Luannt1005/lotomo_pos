"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, ListOrdered, LayoutDashboard, Tag, Package, BarChart3, LogOut, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { name: "POS", href: "/", icon: LayoutDashboard },
  { name: "Sản phẩm", href: "/products", icon: Coffee },
  { name: "Kho hàng", href: "/inventory", icon: Package },
  { name: "Lịch làm", href: "/shifts", icon: CalendarDays },
  { name: "Đơn hàng", href: "/orders", icon: ListOrdered },
  { name: "Khuyến mãi", href: "/discounts", icon: Tag },
  { name: "Báo cáo", href: "/reports", icon: BarChart3, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuthStore();
  const router = useRouter();

  if (pathname === '/login' || pathname === '/signup') return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly && role !== 'admin') return false;
    return true;
  });

  return (
    <aside className="w-full md:w-24 border-r-0 md:border-r border-border bg-card flex flex-row md:flex-col items-center justify-between md:justify-start py-2 md:py-6 gap-2 md:gap-8 shrink-0 h-16 md:h-full relative z-50">
      <div className="hidden md:flex w-12 h-12 bg-primary text-primary-foreground rounded-xl items-center justify-center font-bold text-xl shadow-sm">
        M
      </div>
      <nav className="flex flex-row md:flex-col justify-around md:justify-start gap-1 md:gap-4 w-full md:px-3 px-1 h-full md:h-auto overflow-x-auto md:overflow-visible">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 md:p-3 rounded-xl transition-all flex-1 md:flex-none min-w-[60px]",
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
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 p-2 md:p-3 rounded-xl transition-all flex-1 md:flex-none min-w-[60px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive md:mt-auto"
        >
          <LogOut className="w-5 h-5 md:w-6 md:h-6" />
          <span className="text-[7px] md:text-[10px] uppercase tracking-wider">Đăng xuất</span>
        </button>
      </nav>
    </aside>
  );
}

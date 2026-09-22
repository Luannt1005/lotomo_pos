"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { 
  Bell, 
  Menu, 
  Package,
  CalendarDays,
  Users,
  Calculator,
  BarChart3,
  Clock,
  Sparkles
} from "lucide-react";

interface PageMeta {
  title: string;
  subtitle: string;
  icon: any;
}

const PAGE_META: Record<string, PageMeta> = {
  "/inventory": { 
    title: "Quản Lý Kho Hàng", 
    subtitle: "Kiểm kho định kỳ và tồn kho nguyên liệu", 
    icon: Package 
  },
  "/inventory/history": { 
    title: "Lịch Sử Kho Hàng", 
    subtitle: "Nhật ký xuất nhập và kiểm kho", 
    icon: Package 
  },
  "/shifts": { 
    title: "Lịch Làm Việc", 
    subtitle: "Phân ca, đăng ký và hoán đổi ca nhân viên", 
    icon: CalendarDays 
  },
  "/staff": { 
    title: "Quản Lý Nhân Sự", 
    subtitle: "Danh sách tài khoản và phân quyền nhân viên", 
    icon: Users 
  },
  "/payroll": { 
    title: "Bảng Tính Lương", 
    subtitle: "Tính toán quỹ lương theo giờ và ca làm việc", 
    icon: Calculator 
  },
  "/reports": { 
    title: "Báo Cáo Doanh Thu", 
    subtitle: "Phân tích doanh số bán hàng và số liệu vận hành", 
    icon: BarChart3 
  },
};

export function HeaderBar() {
  const pathname = usePathname();
  const { user, role } = useAuthStore();
  const { toggleMobileSidebar } = useUIStore();
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (pathname === "/login" || pathname === "/signup") return null;

  const page = PAGE_META[pathname] || {
    title: "Lotomo POS",
    subtitle: "Hệ thống quản lý bán hàng",
    icon: Sparkles,
  };
  const PageIcon = page.icon;

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Sarah Lee";

  const roleName = role === "admin" ? "Admin" : "Staff";

  return (
    <header className="sticky top-0 z-30 w-full h-15 md:h-16 bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between transition-all select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Left side: Hamburger button on mobile + Page Title & Subtitle */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Mở menu"
          aria-label="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Icon (Desktop & Mobile) */}
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs">
          <PageIcon className="w-5 h-5 stroke-[2.2]" />
        </div>

        {/* Title & Subtitle */}
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm md:text-base lg:text-lg font-bold text-slate-900 tracking-tight leading-tight truncate">
            {page.title}
          </h1>
          <p className="hidden sm:block text-[11px] lg:text-xs text-slate-400 font-medium truncate mt-0.5">
            {page.subtitle}
          </p>
        </div>
      </div>

      {/* Right side: Real-time clock, Notification bell & User Profile */}
      <div className="flex items-center gap-3 md:gap-5 shrink-0">
        {/* Real-time Clock (Desktop) */}
        {timeStr && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-[#059669]" />
            <span className="font-mono font-semibold text-slate-700">{timeStr}</span>
          </div>
        )}

        {/* Notification Bell with Indicator */}
        <button 
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Thông báo"
          onClick={() => alert("Không có thông báo mới!")}
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* User Profile Avatar & Name */}
        <div className="flex items-center gap-2.5 md:gap-3 pl-2 md:pl-3 border-l border-slate-200/80">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-tr from-[#059669] to-teal-400 text-white font-bold text-xs md:text-sm flex items-center justify-center shadow-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs md:text-sm font-semibold text-slate-900 leading-tight truncate max-w-[120px]">
              {displayName}
            </span>
            <span className="text-[10px] md:text-xs text-slate-400 font-medium leading-none mt-0.5">
              {roleName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

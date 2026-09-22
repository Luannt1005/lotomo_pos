"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Package, 
  CalendarDays, 
  Users, 
  Calculator, 
  BarChart3, 
  LogOut,
  Headphones,
  X,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { supabase } from "@/lib/supabase";

const MAIN_NAV = [
  { name: "Lịch Làm Việc", shortName: "Lịch làm", href: "/shifts", icon: CalendarDays },
  { name: "Kho Hàng", shortName: "Kho", href: "/inventory", icon: Package },
];

const ADMIN_NAV = [
  { name: "Nhân Sự", shortName: "Nhân sự", href: "/staff", icon: Users, adminOnly: true },
  { name: "Tính Lương", shortName: "Tính lương", href: "/payroll", icon: Calculator, adminOnly: true },
  { name: "Báo Cáo", shortName: "Báo cáo", href: "/reports", icon: BarChart3, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuthStore();
  const { isMobileSidebarOpen, closeMobileSidebar } = useUIStore();
  const router = useRouter();

  if (pathname === "/login" || pathname === "/signup") return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    closeMobileSidebar();
    router.push("/login");
  };

  const isAdmin = role === "admin";
  const allNavItems = [...MAIN_NAV, ...(isAdmin ? ADMIN_NAV : [])];

  const renderNavLinks = (onItemClick?: () => void) => (
    <div className="flex flex-col gap-1 w-full">
      {MAIN_NAV.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 select-none",
              isActive
                ? "bg-[#059669] text-white font-semibold shadow-xs shadow-emerald-700/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:scale-[0.98]"
            )}
          >
            {/* Active Left Pill Accent Indicator (as in Montra reference) */}
            {isActive && (
              <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#059669] rounded-r-full" />
            )}
            <Icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white stroke-[2.2]" : "text-slate-400 group-hover:text-slate-600")} />
            <span className="truncate">{item.name}</span>
          </Link>
        );
      })}

      {isAdmin && (
        <div className="mt-4 pt-4 border-t border-slate-200/70 flex flex-col gap-1">
          <span className="px-3.5 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Quản Trị Viên
          </span>
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  "group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 select-none",
                  isActive
                    ? "bg-[#059669] text-white font-semibold shadow-xs shadow-emerald-700/25"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:scale-[0.98]"
                )}
              >
                {isActive && (
                  <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#059669] rounded-r-full" />
                )}
                <Icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white stroke-[2.2]" : "text-slate-400 group-hover:text-slate-600")} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ================= DESKTOP SIDEBAR (MONTRA STYLE) ================= */}
      <aside className="hidden md:flex w-60 lg:w-64 h-full bg-white border-r border-slate-200/80 flex-col p-4 shrink-0 z-40 select-none relative shadow-[1px_0_4px_rgba(0,0,0,0.02)]">
        {/* Brand Header */}
        <Link 
          href="/shifts"
          className="flex items-center gap-2.5 px-3 py-2 mb-6 group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#059669] to-emerald-400 text-white flex items-center justify-center font-black text-base shadow-xs shadow-emerald-600/30 group-hover:scale-105 transition-transform">
            L
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-slate-900 leading-none">
              Lotomo
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
              POS System
            </span>
          </div>
        </Link>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pr-1">
          {renderNavLinks()}
        </nav>

        {/* Bottom Support Widget (Montra Style Gradient Card) */}
        <div className="mt-auto pt-3">
          <div className="mb-3 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-[#06241a] to-slate-950 text-white border border-emerald-800/30 relative overflow-hidden shadow-sm">
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-semibold text-xs text-white">Hỗ Trợ Thu Ngân</h4>
            </div>
            <p className="text-[11px] text-slate-300/85 leading-tight">
              Hệ thống POS đang kết nối máy in & cơ sở dữ liệu ổn định.
            </p>
            <button 
              onClick={() => alert("Tổng đài hỗ trợ kỹ thuật: 0909.123.456 (24/7)")}
              className="mt-2.5 w-full py-1.5 px-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-semibold shadow-xs transition-colors text-center cursor-pointer"
            >
              Liên hệ hỗ trợ
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50/80 transition-all active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-red-500" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ================= MOBILE / IPHONE SLIDE-OVER DRAWER ================= */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={closeMobileSidebar}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col p-4 z-10 animate-in slide-in-from-left duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-2 py-1 mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#059669] to-emerald-400 text-white flex items-center justify-center font-black text-base shadow-xs shadow-emerald-600/30">
                  L
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base tracking-tight text-slate-900 leading-none">
                    Lotomo POS
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                    Hệ thống bán hàng
                  </span>
                </div>
              </div>
              <button 
                onClick={closeMobileSidebar}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pr-1">
              {renderNavLinks(closeMobileSidebar)}
            </nav>

            {/* Support card & Logout */}
            <div className="mt-auto pt-3 border-t border-slate-100">
              <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-slate-900 via-[#06241a] to-slate-950 text-white border border-emerald-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-xs text-white">Hỗ trợ kỹ thuật</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  Hotline: 0909.123.456 (24/7)
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Calculator, 
  Download, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Clock, 
  Users, 
  X, 
  Edit2, 
  Check, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  FileText,
  CalendarDays,
  Save,
  Trash2,
  Table as TableIcon,
  HelpCircle
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ShiftDetail {
  registrationId: string;
  shiftId: string;
  shiftName: string;
  date: string;
  startTime: string;
  endTime: string;
  standardHours: number;
  hoursAdjustment: number;
  actualHours: number;
  amountAdjustment: number;
  note: string;
  type: "standard" | "late" | "early_leave" | "ot" | "bonus" | "penalty" | "custom";
  shiftSalary: number;
  updatedAt: string | null;
}

interface PayrollStaff {
  userId: string;
  email: string;
  name: string;
  role: string;
  hourlyRate: number;
  totalShifts: number;
  totalStandardHours: number;
  totalAdjustmentHours: number;
  totalActualHours: number;
  totalAmountAdjustment: number;
  totalSalary: number;
  shifts: ShiftDetail[];
}

interface ShiftItem {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  max_staff: number;
}

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<PayrollStaff[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode: "daily" (Excel table vertical) vs "staff" (by employee)
  const [viewMode, setViewMode] = useState<"daily" | "staff">("daily");
  
  // Date ranges
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

  // Selected staff for Shift Detail Drawer
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Quick edit hourly rate state (inside table or drawer)
  const [editingRateUserId, setEditingRateUserId] = useState<string | null>(null);
  const [newRateValue, setNewRateValue] = useState<number>(20000);
  const [savingRate, setSavingRate] = useState(false);

  // Shift adjustment modal state
  const [adjustingShift, setAdjustingShift] = useState<{
    staff: PayrollStaff;
    shift: ShiftDetail;
  } | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: "late" as "standard" | "late" | "early_leave" | "ot" | "bonus" | "penalty" | "custom",
    hoursAdjustment: 0,
    amountAdjustment: 0,
    note: ""
  });
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  const { role } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (role !== "admin") {
      router.push("/shifts");
      return;
    }
    fetchPayroll();
  }, [role, startDate, endDate]);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const [pRes, sRes] = await Promise.all([
        fetch(`/api/payroll?start_date=${startDate}&end_date=${endDate}`),
        fetch("/api/shifts")
      ]);
      
      if (!pRes.ok) throw new Error("Không thể tải bảng lương");
      const pData: PayrollStaff[] = await pRes.json();
      setPayrolls(pData || []);

      if (sRes.ok) {
        const sData: ShiftItem[] = await sRes.json();
        setShifts(sData || []);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Find currently selected staff
  const activeStaff = useMemo(() => {
    return payrolls.find(p => p.userId === selectedStaffId) || null;
  }, [payrolls, selectedStaffId]);

  // Generate continuous list of dates from startDate to endDate
  const datesList = useMemo(() => {
    if (!startDate || !endDate) return [];
    const list: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

    const curr = new Date(start);
    while (curr <= end) {
      list.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  }, [startDate, endDate]);

  // Compute Daily Spreadsheet Data (matching Excel Lơ Tơ Mơ)
  const dailyData = useMemo(() => {
    const sortedShifts = [...shifts].sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    // Track shift totals for bottom footer
    const shiftGrandTotals: Record<string, number> = {};
    sortedShifts.forEach(s => { shiftGrandTotals[s.id] = 0; });

    let grandTotal = 0;

    const rows = datesList.map(dateStr => {
      const d = new Date(dateStr);
      const dayOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][d.getDay()];
      const [year, month, day] = dateStr.split("-");
      const formattedDate = `${day}/${month}/${year}`;

      let dayTotalSalary = 0;

      const shiftCells = sortedShifts.map(s => {
        const maxSlots = Math.max(2, s.max_staff || 2);
        const assignments: { staff: PayrollStaff; shiftItem: ShiftDetail }[] = [];

        payrolls.forEach(staff => {
          staff.shifts.forEach(shiftItem => {
            if (shiftItem.date === dateStr && shiftItem.shiftId === s.id) {
              assignments.push({ staff, shiftItem });
            }
          });
        });

        const shiftTotalSalary = assignments.reduce((sum, a) => sum + a.shiftItem.shiftSalary, 0);
        dayTotalSalary += shiftTotalSalary;
        shiftGrandTotals[s.id] = (shiftGrandTotals[s.id] || 0) + shiftTotalSalary;

        // Slots
        const slots: ({ staff: PayrollStaff; shiftItem: ShiftDetail } | null)[] = [];
        for (let i = 0; i < maxSlots; i++) {
          slots.push(assignments[i] || null);
        }

        return {
          shift: s,
          slots,
          shiftTotalSalary
        };
      });

      grandTotal += dayTotalSalary;

      return {
        dateStr,
        formattedDate,
        dayOfWeek,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        shiftCells,
        dayTotalSalary
      };
    });

    return {
      sortedShifts,
      rows,
      grandTotal,
      shiftGrandTotals
    };
  }, [datesList, shifts, payrolls]);

  // Handle Quick Wage Update
  const handleStartEditRate = (staff: PayrollStaff) => {
    setEditingRateUserId(staff.userId);
    setNewRateValue(staff.hourlyRate || 20000);
  };

  const handleSaveRate = async (userId: string) => {
    try {
      setSavingRate(true);
      const res = await fetch("/api/payroll/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "update_rate",
          hourlyRate: newRateValue
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cập nhật lương");
      
      toast.success("Đã cập nhật mức lương!");
      setEditingRateUserId(null);
      fetchPayroll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingRate(false);
    }
  };

  // Open shift adjustment modal
  const handleOpenAdjustment = (staff: PayrollStaff, shift: ShiftDetail) => {
    setAdjustingShift({ staff, shift });
    setAdjustmentForm({
      type: shift.type || (shift.hoursAdjustment < 0 ? "late" : shift.hoursAdjustment > 0 ? "ot" : "late"),
      hoursAdjustment: shift.hoursAdjustment || 0,
      amountAdjustment: shift.amountAdjustment || 0,
      note: shift.note || ""
    });
  };

  // Save shift adjustment
  const handleSaveAdjustment = async () => {
    if (!adjustingShift) return;
    try {
      setSavingAdjustment(true);
      const res = await fetch("/api/payroll/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adjustingShift.staff.userId,
          action: "update_shift_adjustment",
          registrationId: adjustingShift.shift.registrationId,
          type: adjustmentForm.type,
          hoursAdjustment: Number(adjustmentForm.hoursAdjustment) || 0,
          amountAdjustment: Number(adjustmentForm.amountAdjustment) || 0,
          note: adjustmentForm.note.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể lưu ghi chú");

      toast.success("Đã lưu ghi chú & điều chỉnh ca làm!");
      setAdjustingShift(null);
      await fetchPayroll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingAdjustment(false);
    }
  };

  // Reset/delete adjustment
  const handleDeleteAdjustment = async () => {
    if (!adjustingShift) return;
    if (!confirm("Bạn có chắc muốn xóa ghi chú và đưa ca làm về số giờ chuẩn?")) return;
    try {
      setSavingAdjustment(true);
      const res = await fetch("/api/payroll/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adjustingShift.staff.userId,
          action: "delete_shift_adjustment",
          registrationId: adjustingShift.shift.registrationId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa ghi chú");

      toast.success("Đã xóa điều chỉnh ca!");
      setAdjustingShift(null);
      await fetchPayroll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingAdjustment(false);
    }
  };

  // Quick Preset Handlers
  const handleApplyPreset = (presetType: "late" | "early_leave" | "ot" | "bonus" | "penalty" | "standard") => {
    if (presetType === "late") {
      setAdjustmentForm({
        type: "late",
        hoursAdjustment: -1,
        amountAdjustment: 0,
        note: "Đi trễ 1 tiếng làm"
      });
    } else if (presetType === "early_leave") {
      setAdjustmentForm({
        type: "early_leave",
        hoursAdjustment: -0.5,
        amountAdjustment: 0,
        note: "Về sớm 30 phút"
      });
    } else if (presetType === "ot") {
      setAdjustmentForm({
        type: "ot",
        hoursAdjustment: 1,
        amountAdjustment: 0,
        note: "Đi sớm / Tăng ca OT 1 tiếng"
      });
    } else if (presetType === "bonus") {
      setAdjustmentForm({
        type: "bonus",
        hoursAdjustment: 0,
        amountAdjustment: 50000,
        note: "Thưởng làm việc xuất sắc"
      });
    } else if (presetType === "penalty") {
      setAdjustmentForm({
        type: "penalty",
        hoursAdjustment: 0,
        amountAdjustment: -30000,
        note: "Phạt lỗi đồng phục / quy định"
      });
    } else if (presetType === "standard") {
      setAdjustmentForm({
        type: "standard",
        hoursAdjustment: 0,
        amountAdjustment: 0,
        note: ""
      });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (viewMode === "daily") {
      // Export in Daily Excel Format matching the view
      let headers = "Ngày,Thứ";
      dailyData.sortedShifts.forEach(s => {
        headers += `,${s.name} - NV 1,${s.name} - NV 2,${s.name} - Tổng lương ca`;
      });
      headers += ",Tổng lương ngày\n";

      const rows = dailyData.rows.map(r => {
        let line = `"${r.formattedDate}","${r.dayOfWeek}"`;
        r.shiftCells.forEach(cell => {
          const nv1 = cell.slots[0]?.staff.name || "";
          const nv2 = cell.slots[1]?.staff.name || "";
          line += `,"${nv1}","${nv2}",${cell.shiftTotalSalary}`;
        });
        line += `,${r.dayTotalSalary}`;
        return line;
      }).join("\n");

      // Grand total row
      let totalLine = `"TỔNG CỘNG",""`;
      dailyData.sortedShifts.forEach(s => {
        totalLine += `,"","",${dailyData.shiftGrandTotals[s.id] || 0}`;
      });
      totalLine += `,${dailyData.grandTotal}`;

      const fullContent = "\uFEFF" + headers + rows + "\n" + totalLine;
      const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Bang_Dang_Ky_Ca_Theo_Ngay_${startDate}_den_${endDate}.csv`;
      link.click();
    } else {
      // Staff view export
      const headers = "Nhân viên,Email,Mức lương/h (VNĐ),Số ca,Giờ chuẩn,Giờ điều chỉnh,Giờ thực tế,Thưởng/Phạt (VNĐ),Lương thực nhận (VNĐ),Ghi chú chi tiết\n";
      const rows = payrolls.map(p => {
        const shiftNotesStr = p.shifts
          .filter(s => s.note || s.hoursAdjustment !== 0 || s.amountAdjustment !== 0)
          .map(s => `[${s.date} ${s.shiftName}: ${s.note || (s.hoursAdjustment > 0 ? `OT +${s.hoursAdjustment}h` : `Trễ ${s.hoursAdjustment}h`)}]`)
          .join("; ");

        return `"${p.name}","${p.email}",${p.hourlyRate},${p.totalShifts},${p.totalStandardHours.toFixed(1)},${p.totalAdjustmentHours.toFixed(1)},${p.totalActualHours.toFixed(1)},${p.totalAmountAdjustment},${p.totalSalary},"${shiftNotesStr}"`;
      }).join("\n");
      
      const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Bang_Luong_Nhan_Vien_${startDate}_den_${endDate}.csv`;
      link.click();
    }
  };

  // Quick Date Helpers
  const setThisMonth = () => {
    const d = new Date();
    setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]);
  };

  const setLastMonth = () => {
    const d = new Date();
    setStartDate(new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0]);
    setEndDate(new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0]);
  };

  if (role !== "admin") return null;

  const totalSalary = payrolls.reduce((acc, p) => acc + p.totalSalary, 0);
  const totalActualHours = payrolls.reduce((acc, p) => acc + p.totalActualHours, 0);
  const totalAdjustedHours = payrolls.reduce((acc, p) => acc + p.totalAdjustmentHours, 0);

  return (
    <div className="p-3 md:p-6 max-w-[1400px] mx-auto space-y-5 select-none">
      {/* Top action & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Segmented View Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 shadow-2xs">
          <button
            onClick={() => setViewMode("daily")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none",
              viewMode === "daily"
                ? "bg-[#059669] text-white shadow-xs shadow-emerald-700/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Theo Ngày (Bảng Excel)</span>
          </button>

          <button
            onClick={() => setViewMode("staff")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none",
              viewMode === "staff"
                ? "bg-[#059669] text-white shadow-xs shadow-emerald-700/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Theo Nhân Viên</span>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-white border border-slate-200/80 text-slate-700 hover:text-slate-900 hover:bg-slate-50 px-3.5 py-2 rounded-xl font-medium flex items-center gap-2 transition-all shadow-2xs text-xs md:text-sm cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-[#059669]" />
            <span>Xuất Excel ({viewMode === "daily" ? "Theo ngày" : "Theo nhân viên"})</span>
          </button>
        </div>
      </div>

      {/* Date filter card */}
      <div className="bg-white border border-slate-200/80 p-4 md:p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#059669]" /> Từ ngày
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#059669]" /> Đến ngày
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={setThisMonth}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Tháng này
            </button>
            <button
              onClick={setLastMonth}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Tháng trước
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: DAILY EXCEL SPREADSHEET (MẪU EXCEL LƠ TƠ MƠ)                 */}
      {/* ========================================================================= */}
      {viewMode === "daily" && (
        <div className="bg-white border border-slate-300/80 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
          {/* Top Brand Banner (Matching Excel image) */}
          <div className="bg-[#1b4332] text-white px-5 py-3 border-b border-emerald-800 flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-black tracking-wider uppercase text-emerald-100">
                LƠ TƠ MƠ
              </h1>
              <span className="text-xs font-medium text-emerald-200/90 -mt-0.5">
                Bảng đăng ký ca & Tính lương theo ngày
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Tổng lương kỳ ({startDate} → {endDate})
                </span>
                <span className="text-lg md:text-2xl font-black text-rose-400 font-mono">
                  {new Intl.NumberFormat('vi-VN').format(dailyData.grandTotal)} <span className="text-xs font-bold text-rose-300">VNĐ</span>
                </span>
              </div>
              <div className="sm:hidden text-right">
                <span className="text-base font-black text-rose-400 font-mono">
                  {new Intl.NumberFormat('vi-VN').format(dailyData.grandTotal)}đ
                </span>
              </div>
            </div>
          </div>

          {/* Hint bar */}
          <div className="px-5 py-2 bg-emerald-50/60 border-b border-emerald-100/80 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
              <span>
                💡 <strong>Mẹo:</strong> Bấm trực tiếp vào tên nhân viên ở ô ca làm để xem hoặc ghi chú lỗi (đi trễ, OT...)
              </span>
            </div>
            <span className="text-slate-400 hidden md:inline">
              Tổng số ngày: {dailyData.rows.length} ngày
            </span>
          </div>

          {/* Excel Spreadsheet Table */}
          <div className="overflow-x-auto max-h-[720px] [scrollbar-width:thin]">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead className="sticky top-0 z-20 shadow-xs">
                {/* Header Level 1: Category Groups */}
                <tr className="bg-[#2d6a4f] text-white font-bold text-xs uppercase tracking-wider border-b border-emerald-900">
                  <th colSpan={2} className="p-3 text-center border-r border-emerald-700/60 sticky left-0 z-30 bg-[#2d6a4f]">
                    Thời Gian
                  </th>

                  {dailyData.sortedShifts.map((s, idx) => {
                    const maxSlots = Math.max(2, s.max_staff || 2);
                    const bgColors = [
                      "bg-[#2d6a4f]", // Ca 1
                      "bg-[#1e5238]", // Ca 2
                      "bg-[#17422c]"  // Ca 3
                    ];
                    const headerBg = bgColors[idx % bgColors.length];

                    return (
                      <th 
                        key={s.id} 
                        colSpan={maxSlots + 1}
                        className={cn("p-3 text-center border-r border-emerald-700/60", headerBg)}
                      >
                        {s.name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
                      </th>
                    );
                  })}

                  <th className="p-3 text-center bg-[#1b4332] text-rose-300 font-black min-w-[130px]">
                    Tổng Lương Ngày
                  </th>
                </tr>

                {/* Header Level 2: Sub-columns */}
                <tr className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b-2 border-slate-300">
                  <th className="p-2.5 text-center border-r border-slate-300 w-24 sticky left-0 z-30 bg-slate-100">
                    Ngày
                  </th>
                  <th className="p-2.5 text-center border-r border-slate-300 w-24 sticky left-24 z-30 bg-slate-100">
                    Thứ
                  </th>

                  {dailyData.sortedShifts.map((s) => {
                    const maxSlots = Math.max(2, s.max_staff || 2);
                    return (
                      <React.Fragment key={s.id}>
                        {Array.from({ length: maxSlots }).map((_, slotIdx) => (
                          <th 
                            key={slotIdx} 
                            className="p-2.5 text-center border-r border-slate-300 min-w-[110px]"
                          >
                            Nhân viên {slotIdx + 1}
                          </th>
                        ))}
                        <th className="p-2.5 text-center border-r-2 border-slate-400 bg-emerald-50 text-emerald-800 min-w-[105px]">
                          Tổng lương ca
                        </th>
                      </React.Fragment>
                    );
                  })}

                  <th className="p-2.5 text-right pr-4 bg-slate-200/80 text-slate-900 font-black">
                    VNĐ
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {dailyData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="p-12 text-center text-slate-400 font-medium">
                      Không có ngày nào trong khoảng thời gian đã chọn
                    </td>
                  </tr>
                ) : (
                  dailyData.rows.map((row, rowIdx) => {
                    const isEven = rowIdx % 2 === 0;
                    return (
                      <tr 
                        key={row.dateStr}
                        className={cn(
                          "transition-colors hover:bg-emerald-50/50",
                          row.isWeekend ? "bg-amber-50/20" : isEven ? "bg-white" : "bg-slate-50/40"
                        )}
                      >
                        {/* Ngày */}
                        <td className="p-2.5 text-center font-mono font-medium text-slate-700 border-r border-slate-200 sticky left-0 z-10 bg-inherit whitespace-nowrap">
                          {row.formattedDate}
                        </td>

                        {/* Thứ */}
                        <td className={cn(
                          "p-2.5 text-center font-semibold border-r border-slate-300 sticky left-24 z-10 bg-inherit whitespace-nowrap",
                          row.dayOfWeek === "Chủ Nhật" ? "text-rose-600 font-bold" : row.dayOfWeek === "Thứ Bảy" ? "text-amber-600 font-bold" : "text-slate-600"
                        )}>
                          {row.dayOfWeek}
                        </td>

                        {/* Shift cells */}
                        {row.shiftCells.map((cell) => {
                          return (
                            <React.Fragment key={cell.shift.id}>
                              {cell.slots.map((slot, slotIdx) => {
                                if (!slot) {
                                  return (
                                    <td 
                                      key={slotIdx} 
                                      className="p-2.5 text-center border-r border-slate-200 text-slate-300 font-mono text-xs select-none"
                                    >
                                      -
                                    </td>
                                  );
                                }

                                const hasNote = Boolean(slot.shiftItem.note);
                                const hasAdj = slot.shiftItem.hoursAdjustment !== 0 || slot.shiftItem.amountAdjustment !== 0;

                                return (
                                  <td 
                                    key={slotIdx}
                                    className="p-1.5 text-center border-r border-slate-200"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAdjustment(slot.staff, slot.shiftItem)}
                                      className={cn(
                                        "w-full px-2 py-1.5 rounded-lg font-bold text-xs transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer",
                                        hasNote || hasAdj
                                          ? slot.shiftItem.type === "late"
                                            ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                            : slot.shiftItem.type === "ot"
                                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                                            : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                                          : "bg-slate-100/80 hover:bg-emerald-100/70 text-slate-800 hover:text-emerald-900 border border-slate-200/60"
                                      )}
                                      title={slot.shiftItem.note || `Lương: ${new Intl.NumberFormat('vi-VN').format(slot.shiftItem.shiftSalary)}đ (${slot.shiftItem.actualHours}h)`}
                                    >
                                      <span className="truncate max-w-[95px]">{slot.staff.name}</span>
                                      
                                      {/* Mini Adjustment Badge */}
                                      {hasAdj && (
                                        <span className="text-[10px] font-mono font-bold leading-none px-1 py-0.2 rounded bg-white/90">
                                          {slot.shiftItem.hoursAdjustment > 0 
                                            ? `+${slot.shiftItem.hoursAdjustment}h` 
                                            : `${slot.shiftItem.hoursAdjustment}h`}
                                        </span>
                                      )}
                                    </button>
                                  </td>
                                );
                              })}

                              {/* Tổng lương ca */}
                              <td className="p-2.5 text-center border-r-2 border-slate-300 font-mono font-bold text-slate-700 bg-emerald-50/30">
                                {cell.shiftTotalSalary > 0 ? (
                                  <span className="text-emerald-700">
                                    {new Intl.NumberFormat('vi-VN').format(cell.shiftTotalSalary)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-normal">0</span>
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}

                        {/* Tổng lương ngày */}
                        <td className="p-2.5 text-right pr-4 font-mono font-black border-l border-slate-200 bg-slate-100/50">
                          {row.dayTotalSalary > 0 ? (
                            <span className="text-slate-900 text-sm">
                              {new Intl.NumberFormat('vi-VN').format(row.dayTotalSalary)}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Bottom Grand Summary Row (Matching Excel footer) */}
              <tfoot className="sticky bottom-0 z-20 bg-slate-200 border-t-2 border-slate-400 font-bold text-xs shadow-md">
                <tr>
                  <td colSpan={2} className="p-3 text-center uppercase tracking-wider font-black text-slate-900 border-r border-slate-300 sticky left-0 z-30 bg-slate-200">
                    TỔNG CỘNG
                  </td>

                  {dailyData.sortedShifts.map((s) => {
                    const maxSlots = Math.max(2, s.max_staff || 2);
                    const shiftTotal = dailyData.shiftGrandTotals[s.id] || 0;
                    return (
                      <React.Fragment key={s.id}>
                        <td colSpan={maxSlots} className="p-3 text-center border-r border-slate-300 text-slate-500 font-normal">
                          -
                        </td>
                        <td className="p-3 text-center border-r-2 border-slate-400 font-mono font-black text-emerald-800 bg-emerald-100/70">
                          {new Intl.NumberFormat('vi-VN').format(shiftTotal)}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  <td className="p-3 text-right pr-4 font-mono font-black text-base text-rose-700 bg-slate-300">
                    {new Intl.NumberFormat('vi-VN').format(dailyData.grandTotal)}đ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: BY STAFF (THEO NHÂN VIÊN)                                    */}
      {/* ========================================================================= */}
      {viewMode === "staff" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Staff */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng nhân sự</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">{payrolls.length}</span>
                  <span className="text-xs text-slate-500 font-medium">người</span>
                </div>
              </div>
            </div>

            {/* Total Hours */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 border border-amber-100">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng giờ làm thực tế</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">{totalActualHours.toFixed(1)}h</span>
                  {totalAdjustedHours !== 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      totalAdjustedHours > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    }`}>
                      {totalAdjustedHours > 0 ? `+${totalAdjustedHours.toFixed(1)}h OT` : `${totalAdjustedHours.toFixed(1)}h trễ`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Total Payroll */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-[#059669] rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng quỹ lương</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-[#059669]">
                    {new Intl.NumberFormat('vi-VN').format(totalSalary)}
                  </span>
                  <span className="text-xs font-bold text-[#059669]">VNĐ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Payroll Table by Staff */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-sm md:text-base">
                  Danh Sách Nhân Viên Trong Kỳ
                </h2>
                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                  {payrolls.length} nhân viên
                </span>
              </div>
              <span className="text-xs text-slate-400">
                💡 Bấm vào dòng nhân viên để xem danh sách ca làm
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-5">Nhân viên</th>
                    <th className="p-4 text-center">Mức lương / giờ</th>
                    <th className="p-4 text-center">Số ca làm</th>
                    <th className="p-4 text-center">Giờ làm thực tế</th>
                    <th className="p-4 text-right">Lương thực nhận</th>
                    <th className="p-4 pr-5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrolls.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                        Không có dữ liệu ca làm việc trong khoảng thời gian này
                      </td>
                    </tr>
                  ) : payrolls.map((p) => {
                    const isEditingRate = editingRateUserId === p.userId;

                    return (
                      <tr 
                        key={p.userId} 
                        className="group hover:bg-emerald-50/40 transition-colors cursor-pointer"
                        onClick={() => setSelectedStaffId(p.userId)}
                      >
                        {/* Name & Email */}
                        <td className="p-4 pl-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#059669] to-teal-400 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-sm group-hover:text-[#059669] transition-colors truncate">
                                {p.name}
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                {p.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Hourly Rate with inline quick edit */}
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          {isEditingRate ? (
                            <div className="inline-flex items-center gap-1.5 bg-white p-1 rounded-xl border border-emerald-500 shadow-xs">
                              <input
                                type="number"
                                value={newRateValue}
                                onChange={(e) => setNewRateValue(Number(e.target.value))}
                                step={1000}
                                min={0}
                                className="w-20 px-2 py-1 text-xs font-bold text-slate-900 outline-none text-right"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRate(p.userId)}
                                disabled={savingRate}
                                className="p-1 rounded-lg bg-[#059669] text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                                title="Lưu mức lương"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingRateUserId(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                title="Hủy"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEditRate(p)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-[#059669] border border-transparent hover:border-emerald-200 transition-all cursor-pointer"
                              title="Bấm để sửa mức lương theo giờ"
                            >
                              <span>{new Intl.NumberFormat('vi-VN').format(p.hourlyRate)}đ/h</span>
                              <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-emerald-600" />
                            </button>
                          )}
                        </td>

                        {/* Total Shifts */}
                        <td className="p-4 text-center">
                          <span className="font-bold text-slate-800 text-sm">
                            {p.totalShifts}
                          </span>
                          <span className="text-xs text-slate-400 font-normal ml-1">ca</span>
                        </td>

                        {/* Total Hours with Adjustment Badge */}
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-bold text-slate-900 text-sm">
                              {p.totalActualHours.toFixed(1)}h
                            </span>
                            {p.totalAdjustmentHours !== 0 && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                                p.totalAdjustmentHours > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              }`}>
                                {p.totalAdjustmentHours > 0 ? `+${p.totalAdjustmentHours.toFixed(1)}h OT` : `${p.totalAdjustmentHours.toFixed(1)}h`}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Net Salary */}
                        <td className="p-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-black text-[#059669] text-base">
                              {new Intl.NumberFormat('vi-VN').format(p.totalSalary)}đ
                            </span>
                            {p.totalAmountAdjustment !== 0 && (
                              <span className={`text-[10px] font-semibold ${
                                p.totalAmountAdjustment > 0 ? "text-emerald-600" : "text-rose-600"
                              }`}>
                                {p.totalAmountAdjustment > 0 ? `+${new Intl.NumberFormat('vi-VN').format(p.totalAmountAdjustment)}đ thưởng` : `${new Intl.NumberFormat('vi-VN').format(p.totalAmountAdjustment)}đ phạt`}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-4 pr-5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedStaffId(p.userId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-[#059669] hover:bg-[#059669] hover:text-white transition-all shadow-2xs cursor-pointer"
                          >
                            <span>Chi tiết ca</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SHIFT DETAIL DRAWER / SLIDE-OVER (FOR BOTH MODES)                         */}
      {/* ========================================================================= */}
      {activeStaff && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div 
            className="w-full max-w-xl md:max-w-2xl h-full bg-slate-50 flex flex-col shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Top Header */}
            <div className="p-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#059669] to-teal-400 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {activeStaff.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base md:text-lg truncate">
                      {activeStaff.name}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {activeStaff.role === "admin" ? "Quản lý" : "Nhân viên"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {activeStaff.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStaffId(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Đóng chi tiết"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Wage Setting & Quick Stats Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-4">
                {/* Wage Setting */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#059669]" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mức lương theo giờ:
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editingRateUserId === activeStaff.userId ? newRateValue : activeStaff.hourlyRate}
                      onChange={(e) => {
                        setEditingRateUserId(activeStaff.userId);
                        setNewRateValue(Number(e.target.value));
                      }}
                      step={1000}
                      min={0}
                      className="w-28 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-900 text-right outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                    <span className="text-xs font-bold text-slate-500">đ/h</span>
                    {editingRateUserId === activeStaff.userId && (
                      <button
                        onClick={() => handleSaveRate(activeStaff.userId)}
                        disabled={savingRate}
                        className="px-3 py-1.5 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Lưu
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary Badges */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Số ca làm</p>
                    <p className="text-base font-black text-slate-800 mt-0.5">{activeStaff.totalShifts} ca</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng giờ làm</p>
                    <p className="text-base font-black text-slate-800 mt-0.5">{activeStaff.totalActualHours.toFixed(1)}h</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] font-bold text-[#059669] uppercase">Lương kỳ này</p>
                    <p className="text-base font-black text-[#059669] mt-0.5">
                      {new Intl.NumberFormat('vi-VN').format(activeStaff.totalSalary)}đ
                    </p>
                  </div>
                </div>
              </div>

              {/* Shifts List Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#059669]" />
                    Danh Sách Ca Làm Việc Trong Kỳ ({activeStaff.shifts.length} ca)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Mới nhất xếp trước
                  </span>
                </div>

                {activeStaff.shifts.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
                    Nhân viên chưa có ca làm việc nào trong khoảng thời gian này
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeStaff.shifts.map((shift) => {
                      const hasNote = Boolean(shift.note);
                      const hasAdj = shift.hoursAdjustment !== 0 || shift.amountAdjustment !== 0;

                      // Format date
                      const shiftDate = new Date(shift.date);
                      const dayName = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][shiftDate.getDay()];
                      const formattedDate = `${dayName}, ${shiftDate.getDate()}/${shiftDate.getMonth() + 1}/${shiftDate.getFullYear()}`;

                      return (
                        <div
                          key={shift.registrationId}
                          className="bg-white border border-slate-200/80 hover:border-emerald-300 rounded-2xl p-4 shadow-2xs transition-all space-y-3"
                        >
                          {/* Shift Header Row */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-sm">
                                  {shift.shiftName}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                  ({shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)})
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                {formattedDate}
                              </p>
                            </div>

                            {/* Shift Salary */}
                            <div className="text-right">
                              <span className="font-black text-[#059669] text-base">
                                {new Intl.NumberFormat('vi-VN').format(shift.shiftSalary)}đ
                              </span>
                              <div className="text-[11px] text-slate-400">
                                {shift.actualHours.toFixed(1)}h × {new Intl.NumberFormat('vi-VN').format(activeStaff.hourlyRate)}đ
                              </div>
                            </div>
                          </div>

                          {/* Adjustment Badge & Note (if any) */}
                          {(hasNote || hasAdj) && (
                            <div className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                              shift.type === "late" 
                                ? "bg-rose-50/70 border-rose-200 text-rose-800"
                                : shift.type === "ot"
                                ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                                : shift.type === "early_leave"
                                ? "bg-amber-50/70 border-amber-200 text-amber-800"
                                : "bg-slate-50 border-slate-200 text-slate-800"
                            }`}>
                              <div className="flex items-center justify-between text-xs font-bold">
                                <div className="flex items-center gap-1.5">
                                  {shift.type === "late" && <span>🔴 Đi trễ</span>}
                                  {shift.type === "ot" && <span>🟢 Tăng ca OT / Đi sớm</span>}
                                  {shift.type === "early_leave" && <span>🟠 Về sớm</span>}
                                  {shift.type === "bonus" && <span>🎁 Thưởng thêm</span>}
                                  {shift.type === "penalty" && <span>⚠️ Phạt quy định</span>}
                                  {shift.type === "custom" && <span>📝 Ghi chú điều chỉnh</span>}

                                  {shift.hoursAdjustment !== 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-white/80 font-mono text-[11px]">
                                      {shift.hoursAdjustment > 0 ? `+${shift.hoursAdjustment}h` : `${shift.hoursAdjustment}h`}
                                    </span>
                                  )}
                                  {shift.amountAdjustment !== 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-white/80 font-mono text-[11px]">
                                      {shift.amountAdjustment > 0 ? `+${new Intl.NumberFormat('vi-VN').format(shift.amountAdjustment)}đ` : `${new Intl.NumberFormat('vi-VN').format(shift.amountAdjustment)}đ`}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {shift.note && (
                                <p className="text-xs font-medium italic mt-0.5">
                                  &ldquo;{shift.note}&rdquo;
                                </p>
                              )}
                            </div>
                          )}

                          {/* Action button to note/adjust */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                            <span className="text-slate-400">
                              Giờ chuẩn: {shift.standardHours}h → Thực tế: <strong className="text-slate-800">{shift.actualHours}h</strong>
                            </span>

                            <button
                              onClick={() => handleOpenAdjustment(activeStaff, shift)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#059669] hover:text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>{hasNote || hasAdj ? "Sửa ghi chú/lỗi" : "Ghi chú lỗi / OT"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SHIFT ADJUSTMENT & NOTE POPUP MODAL (USABLE FROM BOTH VIEWS)              */}
      {/* ========================================================================= */}
      {adjustingShift && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  Ghi Chú & Điều Chỉnh Ca Làm
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {adjustingShift.staff.name} • {adjustingShift.shift.shiftName} ({adjustingShift.shift.date})
                </p>
              </div>
              <button
                onClick={() => setAdjustingShift(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Chọn nhanh tình huống:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset("late")}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all text-center cursor-pointer"
                >
                  🔴 Đi trễ (-1h)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("early_leave")}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-all text-center cursor-pointer"
                >
                  🟠 Về sớm (-0.5h)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("ot")}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all text-center cursor-pointer"
                >
                  🟢 OT (+1h)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("bonus")}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all text-center cursor-pointer"
                >
                  🎁 Thưởng (+50k)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("penalty")}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all text-center cursor-pointer"
                >
                  ⚠️ Phạt (-30k)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("standard")}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all text-center cursor-pointer"
                >
                  ⚪ Ca chuẩn (0)
                </button>
              </div>
            </div>

            {/* Hours Adjustment & Amount Adjustment */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">
                  Điều chỉnh giờ làm (h):
                </label>
                <input
                  type="number"
                  step={0.5}
                  value={adjustmentForm.hoursAdjustment}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, hoursAdjustment: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Ví dụ: -1 hoặc 1.5"
                />
                <p className="text-[10px] text-slate-400">
                  Số âm (-) nếu trễ, dương (+) nếu OT
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">
                  Thưởng / Phạt tiền (VNĐ):
                </label>
                <input
                  type="number"
                  step={5000}
                  value={adjustmentForm.amountAdjustment}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amountAdjustment: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="0"
                />
                <p className="text-[10px] text-slate-400">
                  Số tiền cộng (+) hoặc trừ (-)
                </p>
              </div>
            </div>

            {/* Note Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Ghi chú lý do / lỗi cụ thể:
              </label>
              <textarea
                value={adjustmentForm.note}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, note: e.target.value })}
                rows={2}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                placeholder="Ví dụ: Đi trễ từ 1 tiếng làm vì kẹt xe, đi sớm OT dọn dẹp quán..."
              />
            </div>

            {/* Preview Calculation */}
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Giờ ca tính lương:
              </span>
              <div className="font-bold text-[#059669]">
                {Math.max(0, adjustingShift.shift.standardHours + (Number(adjustmentForm.hoursAdjustment) || 0)).toFixed(1)} giờ
                {" = "}
                {new Intl.NumberFormat('vi-VN').format(
                  Math.round(
                    Math.max(0, adjustingShift.shift.standardHours + (Number(adjustmentForm.hoursAdjustment) || 0)) * adjustingShift.staff.hourlyRate + (Number(adjustmentForm.amountAdjustment) || 0)
                  )
                )}đ
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleDeleteAdjustment}
                disabled={savingAdjustment}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa điều chỉnh</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingShift(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdjustment}
                  disabled={savingAdjustment}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#059669] hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {savingAdjustment ? "Đang lưu..." : "Lưu điều chỉnh"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

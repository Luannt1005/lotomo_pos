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
  ChevronRight, 
  FileText, 
  CalendarDays, 
  Save, 
  Trash2,
  Table as TableIcon,
  LayoutList,
  AlertCircle,
  SlidersHorizontal,
  UserPlus,
  UserMinus
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

  // View mode: "staff" (by employee) vs "daily" (Excel table vertical)
  const [viewMode, setViewMode] = useState<"daily" | "staff">("staff");

  // Daily sub-display: "table" (cuộn ngang spreadsheet) vs "cards" (dạng thẻ cuộn dọc tối ưu iPhone)
  const [dailyDisplay, setDailyDisplay] = useState<"table" | "cards">("table");
  
  // Date ranges
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

  // Selected staff for Shift Detail Drawer
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Column visibility controls for Excel spreadsheet
  const [hiddenShiftIds, setHiddenShiftIds] = useState<string[]>([]);
  const [showShiftSalaryColumns, setShowShiftSalaryColumns] = useState<boolean>(true);
  const [showDayTotalColumn, setShowDayTotalColumn] = useState<boolean>(true);
  const [showColumnFilterMenu, setShowColumnFilterMenu] = useState<boolean>(false);

  // All registered staff list (from /api/users)
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);

  // Direct Shift Assignment modal state
  const [assigningSlot, setAssigningSlot] = useState<{
    shift: ShiftItem;
    dateStr: string;
    formattedDate: string;
  } | null>(null);
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assigningLoading, setAssigningLoading] = useState<boolean>(false);

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
      const [pRes, sRes, uRes] = await Promise.all([
        fetch(`/api/payroll?start_date=${startDate}&end_date=${endDate}`),
        fetch("/api/shifts"),
        fetch("/api/users")
      ]);
      
      if (!pRes.ok) throw new Error("Không thể tải bảng lương");
      const pData: PayrollStaff[] = await pRes.json();
      setPayrolls(pData || []);

      if (sRes.ok) {
        const sData: ShiftItem[] = await sRes.json();
        setShifts(sData || []);
      }

      if (uRes.ok) {
        const uData = await uRes.json();
        setAllUsers(Array.isArray(uData) ? uData : []);
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
      const dayShort = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
      const [year, month, day] = dateStr.split("-");
      const formattedDate = `${day}/${month}/${year}`;
      const shortDate = `${day}/${month}`;

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
          assignments,
          shiftTotalSalary
        };
      });

      grandTotal += dayTotalSalary;

      return {
        dateStr,
        formattedDate,
        shortDate,
        dayOfWeek,
        dayShort,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isSaturday: d.getDay() === 6,
        isSunday: d.getDay() === 0,
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

  // Filtered shifts based on column visibility toggle
  const visibleShifts = useMemo(() => {
    return dailyData.sortedShifts.filter(s => !hiddenShiftIds.includes(s.id));
  }, [dailyData.sortedShifts, hiddenShiftIds]);

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

  // Open modal to assign staff to an empty shift slot
  const handleOpenAssignModal = (slotInfo: { shift: ShiftItem; dateStr: string; formattedDate: string }) => {
    setAssigningSlot(slotInfo);
    // Suggest first staff not already on this shift, or first user
    const dayRow = dailyData.rows.find(r => r.dateStr === slotInfo.dateStr);
    const shiftCell = dayRow?.shiftCells.find(c => c.shift.id === slotInfo.shift.id);
    const assignedIds = new Set(shiftCell?.assignments.map(a => a.staff.userId) || []);
    const available = allUsers.find(u => !assignedIds.has(u.id)) || allUsers[0];
    setAssignUserId(available?.id || "");
  };

  // Confirm assigning staff to shift
  const handleConfirmAssign = async () => {
    if (!assigningSlot || !assignUserId) {
      toast.error("Vui lòng chọn nhân viên cần phân ca!");
      return;
    }

    try {
      setAssigningLoading(true);
      const res = await fetch("/api/shift-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: assignUserId,
          shift_id: assigningSlot.shift.id,
          date: assigningSlot.dateStr
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể phân ca");

      const assignedUser = allUsers.find(u => u.id === assignUserId);
      toast.success(`Đã phân ca cho ${assignedUser?.name || 'nhân viên'}!`);
      setAssigningSlot(null);
      setAssignUserId("");
      await fetchPayroll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAssigningLoading(false);
    }
  };

  // Unregister/remove staff from a shift
  const handleUnregisterShift = async () => {
    if (!adjustingShift || !adjustingShift.shift.registrationId) return;
    if (!confirm(`Bạn có chắc muốn xóa ${adjustingShift.staff.name} khỏi ca ${adjustingShift.shift.shiftName} ngày ${adjustingShift.shift.date}?`)) return;

    try {
      setSavingAdjustment(true);
      const res = await fetch(`/api/shift-registrations/${adjustingShift.shift.registrationId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa phân ca");

      toast.success("Đã xóa nhân viên khỏi ca làm việc!");
      setAdjustingShift(null);
      await fetchPayroll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingAdjustment(false);
    }
  };



  // Export CSV
  const handleExportCSV = () => {
    if (viewMode === "daily") {
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
    <div className="p-3 md:p-6 max-w-[1400px] mx-auto space-y-4 md:space-y-5 select-none overflow-x-hidden">
      {/* Top action & View Mode Switcher (Responsive on iPhone) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Main Segmented Switcher */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-2xs w-full sm:w-auto">
          <button
            onClick={() => setViewMode("daily")}
            className={cn(
              "px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none",
              viewMode === "daily"
                ? "bg-[#059669] text-white shadow-xs shadow-emerald-700/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            )}
          >
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Theo Ngày (Excel)</span>
          </button>

          <button
            onClick={() => setViewMode("staff")}
            className={cn(
              "px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none",
              viewMode === "staff"
                ? "bg-[#059669] text-white shadow-xs shadow-emerald-700/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            )}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Theo Nhân Viên</span>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="w-full sm:w-auto bg-white border border-slate-200/80 text-slate-700 hover:text-slate-900 hover:bg-slate-50 px-3.5 py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-2xs text-xs md:text-sm cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-[#059669] shrink-0" />
            <span className="truncate">Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Date filter card */}
      <div className="bg-white border border-slate-200/80 p-3.5 md:p-5 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 flex-1">
            <div className="space-y-1">
              <label className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <CalendarIcon className="w-3 h-3 text-[#059669]" /> Từ ngày
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <CalendarIcon className="w-3 h-3 text-[#059669]" /> Đến ngày
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={setThisMonth}
              className="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Tháng này
            </button>
            <button
              onClick={setLastMonth}
              className="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
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
          {/* Compact Sub-bar: Grand Total, Column Toggle & Display Switcher */}
          <div className="px-3 sm:px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs relative">
            <div className="flex items-baseline gap-1.5 shrink-0">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tổng lương:
              </span>
              <span className="text-xs sm:text-sm md:text-base font-black text-emerald-700 font-mono leading-none">
                {new Intl.NumberFormat('vi-VN').format(dailyData.grandTotal)} <span className="text-[10px] font-bold">VNĐ</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Column Visibility Filter Toggle (Excel Ẩn/Hiện cột) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColumnFilterMenu(!showColumnFilterMenu)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border cursor-pointer",
                    hiddenShiftIds.length > 0 || !showShiftSalaryColumns || !showDayTotalColumn
                      ? "bg-emerald-50 text-[#059669] border-emerald-300 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
                  )}
                  title="Ẩn / hiện cột trong bảng tính"
                >
                  <SlidersHorizontal className="w-3 h-3 text-[#059669]" />
                  <span>Ẩn/Hiện cột</span>
                  {(hiddenShiftIds.length > 0 || !showShiftSalaryColumns || !showDayTotalColumn) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  )}
                </button>

                {/* Dropdown Menu Popover */}
                {showColumnFilterMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowColumnFilterMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 z-50 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 font-bold text-slate-800">
                        <span>Cấu hình cột</span>
                        <button
                          type="button"
                          onClick={() => {
                            setHiddenShiftIds([]);
                            setShowShiftSalaryColumns(true);
                            setShowDayTotalColumn(true);
                          }}
                          className="text-[10px] text-[#059669] hover:underline cursor-pointer"
                        >
                          Hiện tất cả
                        </button>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Các ca làm
                        </span>
                        {dailyData.sortedShifts.map((s) => {
                          const isHidden = hiddenShiftIds.includes(s.id);
                          return (
                            <label key={s.id} className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700">
                              <input
                                type="checkbox"
                                checked={!isHidden}
                                onChange={() => {
                                  if (isHidden) {
                                    setHiddenShiftIds(hiddenShiftIds.filter(id => id !== s.id));
                                  } else {
                                    setHiddenShiftIds([...hiddenShiftIds, s.id]);
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded text-[#059669] accent-[#059669]"
                              />
                              <span className="truncate text-[11px] font-medium">
                                {s.name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="pt-1.5 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Cột tiền lương
                        </span>
                        <label className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700">
                          <input
                            type="checkbox"
                            checked={showShiftSalaryColumns}
                            onChange={(e) => setShowShiftSalaryColumns(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-[#059669] accent-[#059669]"
                          />
                          <span className="text-[11px] font-medium">Cột "Lương ca"</span>
                        </label>
                        <label className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700">
                          <input
                            type="checkbox"
                            checked={showDayTotalColumn}
                            onChange={(e) => setShowDayTotalColumn(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-[#059669] accent-[#059669]"
                          />
                          <span className="text-[11px] font-medium">Cột "Tổng lương ngày"</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Display Switcher (Table vs Cards for mobile convenience) */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setDailyDisplay("table")}
                  className={cn(
                    "px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors",
                    dailyDisplay === "table" ? "bg-[#059669] text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                  title="Bảng tính Excel cuộn ngang"
                >
                  <TableIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Bảng tính</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDailyDisplay("cards")}
                  className={cn(
                    "px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors",
                    dailyDisplay === "cards" ? "bg-[#059669] text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                  title="Dạng thẻ cuộn dọc (Tối ưu màn hình điện thoại)"
                >
                  <LayoutList className="w-3 h-3" />
                  <span className="hidden sm:inline">Dạng thẻ</span>
                </button>
              </div>
            </div>
          </div>

          {/* DISPLAY OPTION A: EXCEL SPREADSHEET TABLE (NATURAL VERTICAL FLOW - SCROLLS WITH PAGE) */}
          {dailyDisplay === "table" && (
            <div className="overflow-x-auto [scrollbar-width:thin]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-30 shadow-xs">
                  {/* Header Level 1: Category Groups */}
                  <tr className="bg-[#2d6a4f] text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider border-b border-emerald-900">
                    {/* Sticky Single Time Column Header */}
                    <th className="p-2.5 text-center border-r border-emerald-800 sticky left-0 z-40 bg-[#2d6a4f] w-[76px] min-w-[76px] shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
                      Thời Gian
                    </th>

                    {visibleShifts.map((s, idx) => {
                      const maxSlots = Math.max(2, s.max_staff || 2);
                      const colSpan = maxSlots + (showShiftSalaryColumns ? 1 : 0);
                      const bgColors = ["bg-[#2d6a4f]", "bg-[#1e5238]", "bg-[#17422c]"];
                      const headerBg = bgColors[idx % bgColors.length];

                      return (
                        <th 
                          key={s.id} 
                          colSpan={colSpan}
                          className={cn("p-2.5 text-center border-r border-emerald-700/60 whitespace-nowrap", headerBg)}
                        >
                          {s.name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
                        </th>
                      );
                    })}

                    {showDayTotalColumn && (
                      <th className="p-2.5 text-center bg-[#1b4332] text-emerald-300 font-black min-w-[110px] whitespace-nowrap">
                        Tổng Lương Ngày
                      </th>
                    )}
                  </tr>

                  {/* Header Level 2: Sub-columns */}
                  <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider border-b-2 border-slate-300">
                    {/* Sticky Column Subheader */}
                    <th className="p-2 text-center border-r border-slate-300 w-[76px] min-w-[76px] sticky left-0 z-40 bg-slate-100 shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
                      Ngày / Thứ
                    </th>

                    {visibleShifts.map((s) => {
                      const maxSlots = Math.max(2, s.max_staff || 2);
                      return (
                        <React.Fragment key={s.id}>
                          {Array.from({ length: maxSlots }).map((_, slotIdx) => (
                            <th 
                              key={slotIdx} 
                              className="p-2 text-center border-r border-slate-300 min-w-[95px] whitespace-nowrap"
                            >
                              Nhân viên {slotIdx + 1}
                            </th>
                          ))}
                          {showShiftSalaryColumns && (
                            <th className="p-2 text-center border-r-2 border-slate-400 bg-emerald-50 text-emerald-800 min-w-[95px] whitespace-nowrap">
                              Lương ca
                            </th>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {showDayTotalColumn && (
                      <th className="p-2 text-right pr-3 bg-slate-200/80 text-slate-900 font-black min-w-[110px]">
                        VNĐ
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {dailyData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={25} className="p-10 text-center text-slate-400 font-medium">
                        Không có ngày nào trong khoảng thời gian đã chọn
                      </td>
                    </tr>
                  ) : (
                    dailyData.rows.map((row, rowIdx) => {
                      const isEven = rowIdx % 2 === 0;
                      const isSunday = row.isSunday;

                      // Full Row Background & Border styles across all cells (Only Sunday is colored, Saturday is normal)
                      const cellBg = isSunday
                        ? "bg-indigo-100/70 border-indigo-200"
                        : isEven
                        ? "bg-white border-slate-200"
                        : "bg-slate-50/70 border-slate-200";

                      const stickyCellBg = isSunday
                        ? "bg-indigo-200/90 text-indigo-950 border-r-2 border-indigo-300"
                        : isEven
                        ? "bg-white text-slate-900 border-r-2 border-slate-300"
                        : "bg-slate-100 text-slate-900 border-r-2 border-slate-300";

                      const shiftTotalCellBg = isSunday
                        ? "bg-indigo-200/60 text-indigo-950 font-bold border-r-2 border-indigo-300"
                        : "bg-emerald-50/30 text-slate-700 font-bold border-r-2 border-slate-300";

                      const dayTotalCellBg = isSunday
                        ? "bg-indigo-200/80 border-l border-indigo-300"
                        : "bg-emerald-50/30 border-l border-slate-200";

                      const rowBg = isSunday
                        ? "bg-indigo-100/70 hover:bg-indigo-100"
                        : isEven
                        ? "bg-white hover:bg-slate-50"
                        : "bg-slate-50/70 hover:bg-slate-100";

                      return (
                        <tr 
                          key={row.dateStr}
                          className={cn("transition-colors", rowBg)}
                        >
                          {/* Single Combined Sticky Time Column */}
                          <td className={cn(
                            "p-2 text-center sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.06)] select-none whitespace-nowrap",
                            stickyCellBg
                          )}>
                            <div className="font-mono font-bold text-xs leading-tight">
                              {row.shortDate}
                            </div>
                            <div className={cn(
                              "text-[10px] leading-tight mt-0.5",
                              isSunday ? "text-indigo-800 font-black" : "text-slate-500 font-semibold"
                            )}>
                              {row.dayOfWeek}
                            </div>
                          </td>

                          {/* Shift Cells (Filtered by hidden shifts) */}
                          {row.shiftCells
                            .filter(cell => !hiddenShiftIds.includes(cell.shift.id))
                            .map((cell) => {
                              return (
                                <React.Fragment key={cell.shift.id}>
                                  {cell.slots.map((slot, slotIdx) => {
                                    if (!slot) {
                                      return (
                                        <td 
                                          key={slotIdx} 
                                          className={cn("p-1 text-center border-r", cellBg)}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => handleOpenAssignModal({
                                              shift: cell.shift,
                                              dateStr: row.dateStr,
                                              formattedDate: row.formattedDate
                                            })}
                                            className={cn(
                                              "w-full h-8 px-1 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer group",
                                              isSunday
                                                ? "text-indigo-400/80 hover:text-indigo-800 hover:bg-white/80 border border-dashed border-indigo-300/60"
                                                : "text-slate-300 hover:text-emerald-700 hover:bg-white border border-dashed border-slate-200 hover:border-emerald-300"
                                            )}
                                            title={`Xếp nhân viên vào ${cell.shift.name} (${row.formattedDate})`}
                                          >
                                            <UserPlus className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                            <span className="hidden sm:inline">+ Phân ca</span>
                                          </button>
                                        </td>
                                      );
                                    }

                                    const hasNote = Boolean(slot.shiftItem.note);
                                    const hasAdj = slot.shiftItem.hoursAdjustment !== 0 || slot.shiftItem.amountAdjustment !== 0;

                                    return (
                                      <td 
                                        key={slotIdx} 
                                        className={cn("p-1 text-center border-r", cellBg)}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleOpenAdjustment(slot.staff, slot.shiftItem)}
                                          className={cn(
                                            "w-full px-2 py-1.5 rounded-lg font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer leading-tight",
                                            hasNote || hasAdj
                                              ? slot.shiftItem.type === "late"
                                                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                                : slot.shiftItem.type === "ot"
                                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                                                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                                              : isSunday
                                              ? "bg-white/95 hover:bg-white text-slate-900 border border-slate-300/80 shadow-2xs"
                                              : "bg-slate-100 hover:bg-emerald-100/70 text-slate-800 hover:text-emerald-900 border border-slate-200/80"
                                          )}
                                          title={slot.shiftItem.note || `${slot.staff.name} (${slot.shiftItem.actualHours}h)`}
                                        >
                                          <span className="truncate max-w-[85px]">{slot.staff.name}</span>
                                          
                                          {/* Mini Adjustment Badge */}
                                          {hasAdj && (
                                            <span className="text-[9px] font-mono font-bold leading-none px-1 py-0.2 rounded bg-white/90">
                                              {slot.shiftItem.hoursAdjustment > 0 
                                                ? `+${slot.shiftItem.hoursAdjustment}h` 
                                                : `${slot.shiftItem.hoursAdjustment}h`}
                                            </span>
                                          )}
                                        </button>
                                      </td>
                                    );
                                  })}

                                  {/* Lương ca (hiển thị khi showShiftSalaryColumns === true) */}
                                  {showShiftSalaryColumns && (
                                    <td className={cn("p-2 text-center font-mono whitespace-nowrap", shiftTotalCellBg)}>
                                      {cell.shiftTotalSalary > 0 ? (
                                        <span className={isSunday ? "text-slate-900 font-bold" : "text-emerald-700 font-bold"}>
                                          {new Intl.NumberFormat('vi-VN').format(cell.shiftTotalSalary)}
                                        </span>
                                      ) : (
                                        <span className={isSunday ? "text-slate-400 font-normal" : "text-slate-300 font-normal"}>0</span>
                                      )}
                                    </td>
                                  )}
                                </React.Fragment>
                              );
                            })}

                          {/* Tổng lương ngày (hiển thị khi showDayTotalColumn === true) */}
                          {showDayTotalColumn && (
                            <td className={cn("p-2 text-right pr-3 font-mono font-black whitespace-nowrap", dayTotalCellBg)}>
                              {row.dayTotalSalary > 0 ? (
                                <span className="text-emerald-800 text-xs sm:text-sm font-black">
                                  {new Intl.NumberFormat('vi-VN').format(row.dayTotalSalary)}
                                </span>
                              ) : (
                                <span className={isSunday ? "text-slate-400 font-normal" : "text-slate-300 font-normal"}>0</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Bottom Grand Summary Row */}
                <tfoot className="sticky bottom-0 z-30 bg-slate-200 border-t-2 border-slate-400 font-bold text-xs shadow-md">
                  <tr>
                    <td className="p-2.5 text-center uppercase tracking-wider font-black text-slate-900 border-r-2 border-slate-300 sticky left-0 z-40 bg-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
                      TỔNG CỘNG
                    </td>

                    {visibleShifts.map((s) => {
                      const maxSlots = Math.max(2, s.max_staff || 2);
                      const shiftTotal = dailyData.shiftGrandTotals[s.id] || 0;
                      return (
                        <React.Fragment key={s.id}>
                          <td colSpan={maxSlots} className="p-2.5 text-center border-r border-slate-300 text-slate-400 font-normal">
                            -
                          </td>
                          {showShiftSalaryColumns && (
                            <td className="p-2.5 text-center border-r-2 border-slate-400 font-mono font-black text-emerald-800 bg-emerald-100/70 whitespace-nowrap">
                              {new Intl.NumberFormat('vi-VN').format(shiftTotal)}
                            </td>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {showDayTotalColumn && (
                      <td className="p-2.5 text-right pr-3 font-mono font-black text-sm text-emerald-900 bg-emerald-100 whitespace-nowrap">
                        {new Intl.NumberFormat('vi-VN').format(dailyData.grandTotal)}đ
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* DISPLAY OPTION B: DẠNG THẺ THEO NGÀY (TỐI ƯU 100% CHO IPHONE 13 PRO) */}
          {dailyDisplay === "cards" && (
            <div className="p-3 space-y-3">
              {dailyData.rows.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Không có ngày nào trong khoảng thời gian đã chọn
                </div>
              ) : (
                dailyData.rows.map((row) => {
                  return (
                    <div 
                      key={row.dateStr}
                      className={cn(
                        "rounded-2xl border p-3.5 space-y-2.5 shadow-2xs transition-all",
                        row.isSunday 
                          ? "bg-indigo-50/30 border-indigo-200/80" 
                          : "bg-white border-slate-200/80"
                      )}
                    >
                      {/* Day Card Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-xs font-bold",
                            row.isSunday 
                              ? "bg-indigo-100 text-indigo-800" 
                              : "bg-slate-100 text-slate-700"
                          )}>
                            {row.dayOfWeek}
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {row.formattedDate}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-medium block leading-none">
                            Tổng ngày
                          </span>
                          <span className={cn(
                            "font-mono font-black text-sm",
                            row.dayTotalSalary > 0 ? "text-emerald-700" : "text-slate-300"
                          )}>
                            {new Intl.NumberFormat('vi-VN').format(row.dayTotalSalary)}đ
                          </span>
                        </div>
                      </div>

                      {/* Shifts within this day */}
                      <div className="space-y-2">
                        {row.shiftCells
                          .filter(cell => !hiddenShiftIds.includes(cell.shift.id))
                          .map((cell) => {
                          return (
                            <div 
                              key={cell.shift.id}
                              className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-800">
                                  {cell.shift.name} <span className="text-[11px] text-slate-400 font-normal">({cell.shift.start_time.slice(0, 5)} - {cell.shift.end_time.slice(0, 5)})</span>
                                </span>
                                {showShiftSalaryColumns && (
                                  <span className="font-mono font-bold text-emerald-700 text-xs">
                                    {cell.shiftTotalSalary > 0 ? `${new Intl.NumberFormat('vi-VN').format(cell.shiftTotalSalary)}đ` : "-"}
                                  </span>
                                )}
                              </div>

                              {/* Staff list in this shift */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {cell.assignments.length === 0 ? (
                                  <div className="text-[11px] text-slate-400 italic mr-1">
                                    Chưa có NV
                                  </div>
                                ) : (
                                  cell.assignments.map(({ staff, shiftItem }) => {
                                    const hasAdj = shiftItem.hoursAdjustment !== 0 || shiftItem.amountAdjustment !== 0;
                                    const hasNote = Boolean(shiftItem.note);

                                    return (
                                      <button
                                        key={shiftItem.registrationId}
                                        type="button"
                                        onClick={() => handleOpenAdjustment(staff, shiftItem)}
                                        className={cn(
                                          "px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs",
                                          hasAdj || hasNote
                                            ? shiftItem.type === "late"
                                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                                              : shiftItem.type === "ot"
                                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                              : "bg-amber-50 text-amber-800 border border-amber-200"
                                            : "bg-white text-slate-800 border border-slate-200/80"
                                        )}
                                      >
                                        <span>{staff.name}</span>
                                        {hasAdj && (
                                          <span className="text-[10px] font-mono px-1 rounded bg-black/5 font-black">
                                            {shiftItem.hoursAdjustment > 0 ? `+${shiftItem.hoursAdjustment}h` : `${shiftItem.hoursAdjustment}h`}
                                          </span>
                                        )}
                                        <Edit2 className="w-3 h-3 text-slate-400" />
                                      </button>
                                    );
                                  })
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModal({
                                    shift: cell.shift,
                                    dateStr: row.dateStr,
                                    formattedDate: row.formattedDate
                                  })}
                                  className="px-2 py-1 rounded-xl text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-dashed border-emerald-300 transition-all flex items-center gap-1 cursor-pointer"
                                  title="Phân ca cho nhân viên"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>+ Phân ca</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: BY STAFF (THEO NHÂN VIÊN - 100% RESPONSIVE)                  */}
      {/* ========================================================================= */}
      {viewMode === "staff" && (
        <div className="space-y-4 md:space-y-5 animate-in fade-in duration-200">
          {/* Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {/* Total Staff */}
            <div className="bg-white border border-slate-200/80 p-4 md:p-5 rounded-2xl shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng nhân sự</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900">{payrolls.length}</span>
                  <span className="text-xs text-slate-500 font-medium">người</span>
                </div>
              </div>
            </div>

            {/* Total Hours */}
            <div className="bg-white border border-slate-200/80 p-4 md:p-5 rounded-2xl shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 border border-amber-100">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng giờ làm</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900">{totalActualHours.toFixed(1)}h</span>
                  {totalAdjustedHours !== 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      totalAdjustedHours > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    }`}>
                      {totalAdjustedHours > 0 ? `+${totalAdjustedHours.toFixed(1)}h OT` : `${totalAdjustedHours.toFixed(1)}h`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Total Payroll */}
            <div className="bg-white border border-slate-200/80 p-4 md:p-5 rounded-2xl shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 bg-emerald-50 text-[#059669] rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng quỹ lương</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-[#059669]">
                    {new Intl.NumberFormat('vi-VN').format(totalSalary)}
                  </span>
                  <span className="text-xs font-bold text-[#059669]">đ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-sm md:text-base">
                  Danh Sách Nhân Viên Trong Kỳ
                </h2>
                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                  {payrolls.length} nhân viên
                </span>
              </div>
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

          {/* Mobile Staff Card List (Dedicated for iPhone 13 Pro & Mobile) */}
          <div className="md:hidden space-y-3">
            {payrolls.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                Không có dữ liệu ca làm việc trong khoảng thời gian này
              </div>
            ) : (
              payrolls.map((p) => {
                const isEditingRate = editingRateUserId === p.userId;
                return (
                  <div
                    key={p.userId}
                    onClick={() => setSelectedStaffId(p.userId)}
                    className="bg-white border border-slate-200/90 rounded-2xl p-3.5 space-y-3 shadow-2xs transition-all cursor-pointer active:scale-[0.99]"
                  >
                    {/* Top Row: Avatar & Name */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#059669] to-teal-400 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm truncate">
                            {p.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 truncate">
                            {p.email}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md shrink-0">
                        {p.role === "admin" ? "Quản lý" : "Nhân viên"}
                      </span>
                    </div>

                    {/* Middle Row: Rate & Shifts */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      {/* Rate */}
                      <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-slate-400 block">Lương / Giờ</span>
                        {isEditingRate ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={newRateValue}
                              onChange={(e) => setNewRateValue(Number(e.target.value))}
                              step={1000}
                              min={0}
                              className="w-18 px-1.5 py-0.5 text-xs font-bold border border-emerald-500 rounded bg-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRate(p.userId)}
                              disabled={savingRate}
                              className="p-1 rounded bg-[#059669] text-white"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEditRate(p)}
                            className="font-bold text-slate-800 flex items-center gap-1 hover:text-[#059669]"
                          >
                            <span>{new Intl.NumberFormat('vi-VN').format(p.hourlyRate)}đ/h</span>
                            <Edit2 className="w-2.5 h-2.5 text-slate-400" />
                          </button>
                        )}
                      </div>

                      {/* Shifts & Hours */}
                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] text-slate-400 block">Số ca & Giờ làm</span>
                        <div className="font-bold text-slate-800">
                          {p.totalShifts} ca • {p.totalActualHours.toFixed(1)}h
                          {p.totalAdjustmentHours !== 0 && (
                            <span className={`text-[9px] font-mono ml-1 px-1 rounded ${
                              p.totalAdjustmentHours > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}>
                              {p.totalAdjustmentHours > 0 ? `+${p.totalAdjustmentHours}h` : `${p.totalAdjustmentHours}h`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Net Salary & Detail button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block leading-none">Lương thực nhận</span>
                        <span className="font-black text-[#059669] text-base font-mono">
                          {new Intl.NumberFormat('vi-VN').format(p.totalSalary)}đ
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedStaffId(p.userId)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-[#059669] flex items-center gap-1 shadow-2xs"
                      >
                        <span>Chi tiết</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SHIFT DETAIL DRAWER / SLIDE-OVER (100% RESPONSIVE ON IPHONE)              */}
      {/* ========================================================================= */}
      {activeStaff && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div 
            className="w-full max-w-xl md:max-w-2xl h-full bg-slate-50 flex flex-col shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Top Header */}
            <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#059669] to-teal-400 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {activeStaff.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base md:text-lg truncate">
                      {activeStaff.name}
                    </h3>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md">
                      {activeStaff.role === "admin" ? "Quản lý" : "Nhân viên"}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">
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
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
              {/* Wage Setting & Quick Stats Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
                {/* Wage Setting */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#059669] shrink-0" />
                    <span className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mức lương / giờ:
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={editingRateUserId === activeStaff.userId ? newRateValue : activeStaff.hourlyRate}
                      onChange={(e) => {
                        setEditingRateUserId(activeStaff.userId);
                        setNewRateValue(Number(e.target.value));
                      }}
                      step={1000}
                      min={0}
                      className="w-24 sm:w-28 px-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 text-right outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                    <span className="text-xs font-bold text-slate-500">đ</span>
                    {editingRateUserId === activeStaff.userId && (
                      <button
                        onClick={() => handleSaveRate(activeStaff.userId)}
                        disabled={savingRate}
                        className="px-2.5 py-1 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                      >
                        <Save className="w-3 h-3" />
                        Lưu
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary Badges */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Số ca</p>
                    <p className="text-sm sm:text-base font-black text-slate-800 mt-0.5">{activeStaff.totalShifts}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Tổng giờ</p>
                    <p className="text-sm sm:text-base font-black text-slate-800 mt-0.5">{activeStaff.totalActualHours.toFixed(1)}h</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[9px] sm:text-[10px] font-bold text-[#059669] uppercase">Lương kỳ này</p>
                    <p className="text-xs sm:text-sm font-black text-[#059669] mt-0.5 truncate">
                      {new Intl.NumberFormat('vi-VN').format(activeStaff.totalSalary)}đ
                    </p>
                  </div>
                </div>
              </div>

              {/* Shifts List Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-[#059669]" />
                    Danh Sách Ca Làm Việc ({activeStaff.shifts.length} ca)
                  </h4>
                </div>

                {activeStaff.shifts.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                    Nhân viên chưa có ca làm việc nào trong khoảng thời gian này
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeStaff.shifts.map((shift) => {
                      const hasNote = Boolean(shift.note);
                      const hasAdj = shift.hoursAdjustment !== 0 || shift.amountAdjustment !== 0;

                      const shiftDate = new Date(shift.date);
                      const dayName = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][shiftDate.getDay()];
                      const formattedDate = `${dayName}, ${shiftDate.getDate()}/${shiftDate.getMonth() + 1}/${shiftDate.getFullYear()}`;

                      return (
                        <div
                          key={shift.registrationId}
                          className="bg-white border border-slate-200/80 hover:border-emerald-300 rounded-2xl p-3 sm:p-4 shadow-2xs transition-all space-y-2.5"
                        >
                          {/* Shift Header Row */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-900 text-xs sm:text-sm">
                                  {shift.shiftName}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  ({shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)})
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                {formattedDate}
                              </p>
                            </div>

                            {/* Shift Salary */}
                            <div className="text-right">
                              <span className="font-black text-[#059669] text-sm sm:text-base font-mono">
                                {new Intl.NumberFormat('vi-VN').format(shift.shiftSalary)}đ
                              </span>
                              <div className="text-[10px] text-slate-400">
                                {shift.actualHours.toFixed(1)}h × {new Intl.NumberFormat('vi-VN').format(activeStaff.hourlyRate)}đ
                              </div>
                            </div>
                          </div>

                          {/* Adjustment Badge & Note (if any) */}
                          {(hasNote || hasAdj) && (
                            <div className={`p-2 rounded-xl border flex flex-col gap-0.5 text-xs ${
                              shift.type === "late" 
                                ? "bg-rose-50/80 border-rose-200 text-rose-800"
                                : shift.type === "ot"
                                ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                                : shift.type === "early_leave"
                                ? "bg-amber-50/80 border-amber-200 text-amber-800"
                                : "bg-slate-50 border-slate-200 text-slate-800"
                            }`}>
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <div className="flex items-center gap-1">
                                  {shift.type === "late" && <span>🔴 Đi trễ</span>}
                                  {shift.type === "ot" && <span>🟢 OT / Đi sớm</span>}
                                  {shift.type === "early_leave" && <span>🟠 Về sớm</span>}
                                  {shift.type === "bonus" && <span>🎁 Thưởng</span>}
                                  {shift.type === "penalty" && <span>⚠️ Phạt</span>}
                                  {shift.type === "custom" && <span>📝 Ghi chú</span>}

                                  {shift.hoursAdjustment !== 0 && (
                                    <span className="px-1 py-0.2 rounded bg-white/90 font-mono text-[10px]">
                                      {shift.hoursAdjustment > 0 ? `+${shift.hoursAdjustment}h` : `${shift.hoursAdjustment}h`}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {shift.note && (
                                <p className="text-[11px] font-medium italic">
                                  &ldquo;{shift.note}&rdquo;
                                </p>
                              )}
                            </div>
                          )}

                          {/* Action button to note/adjust */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                            <span className="text-slate-400">
                              Chuẩn {shift.standardHours}h → Thực tế: <strong className="text-slate-800">{shift.actualHours}h</strong>
                            </span>

                            <button
                              onClick={() => handleOpenAdjustment(activeStaff, shift)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>{hasNote || hasAdj ? "Sửa lỗi/OT" : "Ghi chú lỗi/OT"}</span>
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
      {/* SHIFT ADJUSTMENT & NOTE POPUP MODAL (100% RESPONSIVE ON IPHONE)           */}
      {/* ========================================================================= */}
      {adjustingShift && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
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


            {/* Hours Adjustment & Amount Adjustment */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] sm:text-xs font-bold text-slate-600">
                  Điều chỉnh giờ (h):
                </label>
                <input
                  type="number"
                  step={0.5}
                  value={adjustmentForm.hoursAdjustment}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, hoursAdjustment: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Ví dụ: -1 hoặc 1.5"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] sm:text-xs font-bold text-slate-600">
                  Thưởng / Phạt (VNĐ):
                </label>
                <input
                  type="number"
                  step={5000}
                  value={adjustmentForm.amountAdjustment}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amountAdjustment: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Note Textarea */}
            <div className="space-y-1">
              <label className="text-[11px] sm:text-xs font-bold text-slate-600 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                Ghi chú lý do / lỗi cụ thể:
              </label>
              <textarea
                value={adjustmentForm.note}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, note: e.target.value })}
                rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                placeholder="Ví dụ: Đi trễ từ 1 tiếng làm vì kẹt xe, đi sớm OT dọn dẹp quán..."
              />
            </div>

            {/* Preview Calculation */}
            <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Giờ ca tính lương:
              </span>
              <div className="font-bold text-[#059669]">
                {Math.max(0, adjustingShift.shift.standardHours + (Number(adjustmentForm.hoursAdjustment) || 0)).toFixed(1)}h
                {" = "}
                {new Intl.NumberFormat('vi-VN').format(
                  Math.round(
                    Math.max(0, adjustingShift.shift.standardHours + (Number(adjustmentForm.hoursAdjustment) || 0)) * adjustingShift.staff.hourlyRate + (Number(adjustmentForm.amountAdjustment) || 0)
                  )
                )}đ
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDeleteAdjustment}
                  disabled={savingAdjustment}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                  title="Xóa điều chỉnh ca và đưa về giờ chuẩn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>

                <button
                  type="button"
                  onClick={handleUnregisterShift}
                  disabled={savingAdjustment}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                  title="Xóa nhân viên khỏi ca này"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>Hủy ca</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingShift(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdjustment}
                  disabled={savingAdjustment}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#059669] hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  {savingAdjustment ? "Đang lưu..." : "Lưu điều chỉnh"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PHÂN CA TRỰC TIẾP TỪ BẢNG EXCEL */}
      {assigningSlot && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 md:p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm md:text-base">
                    Phân Ca Cho Nhân Viên
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {assigningSlot.shift.name} • {assigningSlot.formattedDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssigningSlot(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Chọn nhân viên làm ca này:
              </label>
              <select
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'admin' ? 'Quản trị' : 'Nhân viên'})
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-500 font-medium">
                Khung giờ: {assigningSlot.shift.start_time.slice(0, 5)} - {assigningSlot.shift.end_time.slice(0, 5)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssigningSlot(null)}
                disabled={assigningLoading}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmAssign}
                disabled={assigningLoading || !assignUserId}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#059669] hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{assigningLoading ? "Đang phân..." : "Xác nhận phân ca"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

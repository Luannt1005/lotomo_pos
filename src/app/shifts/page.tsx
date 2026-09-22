"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { Shift, ShiftRegistration, LockedWeek, ShiftSwap } from "@/types/database";
import { format, addDays, startOfWeek, subWeeks, addWeeks, isAfter, startOfDay, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Plus, Trash2, ChevronLeft, ChevronRight, Edit2, Users, X, Lock, Unlock, ArrowLeftRight, Check, Ban } from "lucide-react";

interface FormattedUser {
  id: string;
  email: string;
  role: string;
  username: string;
}

const getShiftBadgeStyle = (shiftName: string, index: number) => {
  const name = shiftName.toLowerCase();
  if (name.includes("sáng") || name.includes("morning")) {
    return {
      bg: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      border: "border-l-4 border-l-amber-500",
      dot: "bg-amber-500"
    };
  }
  if (name.includes("chiều") || name.includes("afternoon")) {
    return {
      bg: "bg-sky-500/10 text-sky-600 border-sky-500/20",
      border: "border-l-4 border-l-sky-500",
      dot: "bg-sky-500"
    };
  }
  if (name.includes("tối") || name.includes("night") || name.includes("khuya")) {
    return {
      bg: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
      border: "border-l-4 border-l-indigo-500",
      dot: "bg-indigo-500"
    };
  }
  const colors = [
    { bg: "bg-primary/10 text-primary border-primary/20", border: "border-l-4 border-l-primary", dot: "bg-primary" },
    { bg: "bg-blue-500/10 text-blue-600 border-blue-500/20", border: "border-l-4 border-l-blue-500", dot: "bg-blue-500" },
    { bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", border: "border-l-4 border-l-emerald-500", dot: "bg-emerald-500" },
    { bg: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", border: "border-l-4 border-l-indigo-500", dot: "bg-indigo-500" },
    { bg: "bg-purple-500/10 text-purple-600 border-purple-500/20", border: "border-l-4 border-l-purple-500", dot: "bg-purple-500" },
  ];
  return colors[index % colors.length];
};

export default function ShiftsPage() {
  const { role, user } = useAuthStore();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [registrations, setRegistrations] = useState<ShiftRegistration[]>([]);
  const [localRegistrations, setLocalRegistrations] = useState<ShiftRegistration[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lockedWeeks, setLockedWeeks] = useState<LockedWeek[]>([]);
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [users, setUsers] = useState<FormattedUser[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState(true);

  // Shifts management state
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [newShift, setNewShift] = useState({ name: "", start_time: "", end_time: "", max_staff: 1 });

  // Admin assignment state
  const [activeAssignCell, setActiveAssignCell] = useState<{ shiftId: string; dateStr: string } | null>(null);

  // Swap shifts state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapSourceReg, setSwapSourceReg] = useState<{ id: string; dateStr: string; shiftName: string } | null>(null);
  const [swapTargetUserId, setSwapTargetUserId] = useState<string>("");
  const [swapTargetRegId, setSwapTargetRegId] = useState<string>(""); // empty string means "cover request" (nhờ làm hộ)

  useEffect(() => {
    fetchData();
  }, [currentWeekStart]);

  useEffect(() => {
    if (role === 'admin' || user) {
      fetchUsersAndSwaps();
    }
  }, [role, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startStr = format(currentWeekStart, 'yyyy-MM-dd');
      const endStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
      
      const [shiftsRes, regsRes, lockedRes] = await Promise.all([
        fetch('/api/shifts'),
        fetch(`/api/shift-registrations?start_date=${startStr}&end_date=${endStr}`),
        fetch('/api/locked-weeks')
      ]);
      
      const shiftsData = await shiftsRes.json();
      const regsData = await regsRes.json();
      const lockedData = await lockedRes.json();
      
      const sortedShifts = Array.isArray(shiftsData) 
        ? [...shiftsData].sort((a, b) => a.start_time.localeCompare(b.start_time)) 
        : [];
      setShifts(sortedShifts);
      const safeRegs = Array.isArray(regsData) ? regsData : [];
      setRegistrations(safeRegs);
      setLocalRegistrations(JSON.parse(JSON.stringify(safeRegs)));
      setLockedWeeks(Array.isArray(lockedData) ? lockedData : []);
    } catch (error) {
      console.error(error);
      setShifts([]);
      setRegistrations([]);
      setLocalRegistrations([]);
      setLockedWeeks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersAndSwaps = async () => {
    try {
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      
      if (usersData && usersData.error) {
        console.error("Error fetching users:", usersData.error);
        if (role === 'admin') {
          alert(`LỖI HỆ THỐNG (ADMIN): Không thể tải danh sách nhân viên từ database. \n\nChi tiết: ${usersData.error}\n\nVui lòng kiểm tra lại cấu hình environment variables trên Vercel.`);
        }
      }
      
      setUsers(Array.isArray(usersData) ? usersData : []);

      if (user) {
        const swapsRes = await fetch(`/api/shift-swaps?target_id=${user.id}`);
        const swapsData = await swapsRes.json();
        
        // Also fetch swaps initiated by me to show status
        const mySwapsRes = await fetch(`/api/shift-swaps?requestor_id=${user.id}`);
        const mySwapsData = await mySwapsRes.json();
        
        const safeSwaps = Array.isArray(swapsData) ? swapsData : [];
        const safeMySwaps = Array.isArray(mySwapsData) ? mySwapsData : [];
        
        // Combine swaps and remove duplicates
        const allSwaps = [...safeSwaps, ...safeMySwaps].filter(
          (value, index, self) => self.findIndex(s => s.id === value.id) === index
        );
        setSwaps(allSwaps);
      }
    } catch (error) {
      console.error(error);
      setUsers([]);
      setSwaps([]);
    }
  };

  const isTodayDate = (date: Date) => format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const currentWeekStr = format(currentWeekStart, 'yyyy-MM-dd');
  const isWeekLocked = lockedWeeks.some(lw => lw.week_start === currentWeekStr);

  const handleToggleWeekLock = async () => {
    if (!user || role !== 'admin') return;
    const action = isWeekLocked ? 'unlock' : 'lock';
    const res = await fetch('/api/locked-weeks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_start: currentWeekStr,
        user_id: user.id,
        action
      })
    });
    if (res.ok) {
      fetchData();
    }
  };

  const handleSubmitShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShiftId) {
        const res = await fetch(`/api/shifts/${editingShiftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newShift)
        });
        if (res.ok) {
          setEditingShiftId(null);
          setNewShift({ name: "", start_time: "", end_time: "", max_staff: 1 });
          fetchData();
        }
      } else {
        const res = await fetch('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newShift)
        });
        if (res.ok) {
          setNewShift({ name: "", start_time: "", end_time: "", max_staff: 1 });
          fetchData();
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa ca này? Hủy bỏ toàn bộ đăng ký trong ca này.')) return;
    await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
    if (editingShiftId === id) {
      setEditingShiftId(null);
      setNewShift({ name: "", start_time: "", end_time: "", max_staff: 1 });
    }
    fetchData();
  };

  // Register for self (Local modification)
  const handleRegister = (shiftId: string, date: Date) => {
    if (!user) return;
    if (isWeekLocked && role !== 'admin') {
      alert("Tuần làm việc này đã bị KHÓA. Bạn không thể tự ý đăng ký.");
      return;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if already registered locally
    const exists = localRegistrations.some(r => r.shift_id === shiftId && r.user_id === user.id && r.date === dateStr);
    if (exists) {
      alert("Bạn đã đăng ký ca này rồi!");
      return;
    }

    const tempReg: ShiftRegistration = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      shift_id: shiftId,
      user_id: user.id,
      user_email: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Staff',
      date: dateStr,
      created_at: new Date().toISOString()
    };

    setLocalRegistrations(prev => [...prev, tempReg]);
  };

  // Admin assigns staff via dropdown (Local modification)
  const handleAdminAssign = (shiftId: string, dateStr: string, targetUserId: string) => {
    const selectedUser = users.find(u => u.id === targetUserId);
    if (!selectedUser) return;

    // Check if already registered locally
    const exists = localRegistrations.some(r => r.shift_id === shiftId && r.user_id === selectedUser.id && r.date === dateStr);
    if (exists) {
      alert("Nhân viên này đã được đăng ký ca này rồi!");
      return;
    }

    const tempReg: ShiftRegistration = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      shift_id: shiftId,
      user_id: selectedUser.id,
      user_email: selectedUser.username,
      date: dateStr,
      created_at: new Date().toISOString()
    };

    setLocalRegistrations(prev => [...prev, tempReg]);
    setActiveAssignCell(null);
  };

  // Unregister staff from a cell (Local modification)
  const handleUnregister = (regId: string) => {
    if (isWeekLocked && role !== 'admin') {
      alert("Tuần làm việc này đã bị KHÓA. Bạn không thể tự hủy đăng ký.");
      return;
    }
    setLocalRegistrations(prev => prev.filter(r => r.id !== regId));
  };

  // Batch Save all local changes to the Database
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const addedRegs = localRegistrations.filter(lr => lr.id.startsWith("temp_"));
      const deletedRegs = registrations.filter(r => !localRegistrations.some(lr => lr.id === r.id));

      // Perform all deletions and additions
      const deletePromises = deletedRegs.map(r => 
        fetch(`/api/shift-registrations/${r.id}`, { method: 'DELETE' })
      );

      const addPromises = addedRegs.map(r => 
        fetch('/api/shift-registrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shift_id: r.shift_id,
            user_id: r.user_id,
            user_email: r.user_email,
            date: r.date
          })
        })
      );

      const results = await Promise.all([...deletePromises, ...addPromises]);
      
      const failed = results.filter(res => !res.ok);
      if (failed.length > 0) {
        alert(`Đã lưu xong, tuy nhiên có ${failed.length} yêu cầu đăng ký gặp lỗi.`);
      } else {
        alert("Lưu lịch làm việc thành công!");
      }
      
      await fetchData();
    } catch (error) {
      console.error("Lỗi khi lưu lịch làm việc:", error);
      alert("Đã xảy ra lỗi khi lưu lịch làm việc.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset all local changes
  const handleResetChanges = () => {
    if (confirm("Bạn có chắc chắn muốn hủy bỏ toàn bộ các thay đổi chưa lưu?")) {
      setLocalRegistrations(JSON.parse(JSON.stringify(registrations)));
    }
  };

  const handleWeekChange = (newWeekStart: Date) => {
    const addedRegs = localRegistrations.filter(lr => lr.id.startsWith("temp_"));
    const deletedRegs = registrations.filter(r => !localRegistrations.some(lr => lr.id === r.id));
    const hasChanges = addedRegs.length > 0 || deletedRegs.length > 0;
    
    if (hasChanges && !confirm("Bạn có các thay đổi chưa được lưu trong tuần này. Nếu chuyển tuần, các thay đổi này sẽ bị mất. Bạn vẫn muốn tiếp tục?")) {
      return;
    }
    setCurrentWeekStart(newWeekStart);
  };

  // Create swap request
  const handleCreateSwapRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !swapSourceReg || !swapTargetUserId) return;

    const targetUser = users.find(u => u.id === swapTargetUserId);
    if (!targetUser) return;

    const body = {
      requestor_id: user.id,
      requestor_email: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Staff',
      requestor_reg_id: swapSourceReg.id,
      target_id: swapTargetUserId,
      target_email: targetUser.username,
      target_reg_id: swapTargetRegId || null,
      status: 'pending'
    };

    const res = await fetch('/api/shift-swaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      setShowSwapModal(false);
      setSwapSourceReg(null);
      setSwapTargetUserId("");
      setSwapTargetRegId("");
      fetchUsersAndSwaps();
      alert("Gửi yêu cầu hoán đổi ca làm thành công! Đang chờ đối tác duyệt.");
    } else {
      alert("Gửi yêu cầu thất bại!");
    }
  };

  // Accept / Reject swap request
  const handleHandleSwap = async (swapId: string, status: 'accepted' | 'rejected') => {
    const res = await fetch('/api/shift-swaps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: swapId, status })
    });
    if (res.ok) {
      fetchUsersAndSwaps();
      fetchData();
      alert(status === 'accepted' ? "Đã chấp nhận hoán ca!" : "Đã từ chối hoán ca!");
    } else {
      const data = await res.json();
      alert(data.error || "Thực hiện thất bại!");
    }
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  // Swap target user future registrations filter
  const targetUserFutureRegs = registrations.filter(
    r => r.user_id === swapTargetUserId && 
         isAfter(startOfDay(parseISO(r.date)), startOfDay(new Date()))
  );

  const pendingSwapsForMe = swaps.filter(s => s.target_id === user?.id && s.status === 'pending');
  const mySentSwaps = swaps.filter(s => s.requestor_id === user?.id);

  const addedRegs = localRegistrations.filter(lr => lr.id.startsWith("temp_"));
  const deletedRegs = registrations.filter(r => !localRegistrations.some(lr => lr.id === r.id));
  const hasChanges = addedRegs.length > 0 || deletedRegs.length > 0;

  if (loading && shifts.length === 0) return <div className="p-8">Đang tải lịch làm việc...</div>;

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-3 sm:space-y-4">
      
      
      {/* Pending Swaps Alerts */}
      {pendingSwapsForMe.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 md:p-6 space-y-3">
          <h2 className="font-bold text-sm text-primary flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 animate-pulse" />
            Yêu Cầu Hoán Ca Đang Chờ Bạn Duyệt
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {pendingSwapsForMe.map(swap => {
              // Find requestor's shift name & date
              const reqReg = registrations.find(r => r.id === swap.requestor_reg_id);
              const reqShift = shifts.find(s => s.id === reqReg?.shift_id);
              
              // Find target's shift name & date
              const tarReg = swap.target_reg_id ? registrations.find(r => r.id === swap.target_reg_id) : null;
              const tarShift = tarReg ? shifts.find(s => s.id === tarReg.shift_id) : null;

              return (
                <div key={swap.id} className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between gap-4">
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="font-bold text-foreground">{swap.requestor_email}</span> muốn hoán đổi ca làm với bạn:
                    </div>
                    <div className="text-primary font-medium mt-1">
                      Ca của họ: {reqShift?.name} ({reqReg ? format(parseISO(reqReg.date), 'dd/MM') : ''})
                    </div>
                    <div className="text-muted-foreground">
                      Ca của bạn: {tarReg ? `${tarShift?.name} (${format(parseISO(tarReg.date), 'dd/MM')})` : 'Nhờ bạn làm hộ ca này'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleHandleSwap(swap.id, 'accepted')}
                      className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Đồng ý
                    </button>
                    <button
                      onClick={() => handleHandleSwap(swap.id, 'rejected')}
                      className="flex-1 py-2 bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" /> Từ chối
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          {isWeekLocked && (
            <span className="bg-destructive/10 text-destructive text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 border border-destructive/20">
              <Lock className="w-3.5 h-3.5" /> Tuần đã khóa
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Save / Reset changes buttons if changed */}
          {hasChanges && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
              <button 
                onClick={handleResetChanges}
                disabled={isSaving}
                className="px-3 py-1.5 bg-secondary hover:bg-destructive/10 hover:text-destructive text-muted-foreground font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-40"
              >
                Hủy
              </button>
              <button 
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1 disabled:opacity-40"
              >
                {isSaving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Lưu...
                  </>
                ) : (
                  <>
                    Lưu ca
                  </>
                )}
              </button>
            </div>
          )}
          {/* Week switching controls */}
          <div className="flex items-center bg-secondary/80 rounded-xl p-0.5 sm:p-1 justify-between flex-1 md:flex-none">
            <button onClick={() => handleWeekChange(subWeeks(currentWeekStart, 1))} className="p-1.5 hover:bg-background rounded-lg transition-colors cursor-pointer" title="Tuần trước">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 sm:px-3 font-bold text-xs sm:text-sm">
              {format(weekDays[0], 'dd/MM')} - {format(weekDays[6], 'dd/MM')}
            </span>
            <button onClick={() => handleWeekChange(addWeeks(currentWeekStart, 1))} className="p-1.5 hover:bg-background rounded-lg transition-colors cursor-pointer" title="Tuần sau">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Admin Week Lock Toggle Button */}
          {role === 'admin' && (
            <button
              onClick={handleToggleWeekLock}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isWeekLocked 
                  ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20" 
                  : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
              }`}
            >
              {isWeekLocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Mở khóa
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Khóa tuần
                </>
              )}
            </button>
          )}

          {/* Admin Shift Manage Modal Trigger */}
          {role === 'admin' && (
            <button
              onClick={() => {
                setEditingShiftId(null);
                setNewShift({ name: "", start_time: "", end_time: "", max_staff: 1 });
                setShowShiftModal(true);
              }}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer hover:bg-primary/90 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Quản lý Ca
            </button>
          )}
        </div>
      </div>

      {/* Roster Grid Table (Compact & Optimized View) */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden overflow-x-auto shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-secondary/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="p-2 sm:p-2.5 font-bold text-foreground text-[10px] sm:text-xs uppercase tracking-wider w-[95px] min-w-[95px] sm:w-[110px] sm:min-w-[110px] sticky left-0 z-20 bg-secondary/80 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                Ca Làm
              </th>
              {weekDays.map(date => {
                const today = isTodayDate(date);
                return (
                  <th 
                    key={date.toString()} 
                    className={`p-1.5 sm:p-2 font-bold w-[95px] min-w-[95px] sm:w-[110px] sm:min-w-[110px] text-center border-l border-border/40 transition-colors ${
                      today ? "bg-primary/[0.04] text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <div className={`text-[9px] uppercase tracking-wider font-extrabold ${today ? "text-primary/70" : "text-muted-foreground/60"}`}>
                      {format(date, 'EEEE', { locale: vi })}
                    </div>
                    <div className={`text-xs sm:text-sm mt-0.5 font-black ${today ? "text-primary" : "text-foreground"}`}>
                      {format(date, 'dd/MM')}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shifts.map((shift, idx) => {
              const shiftStyle = getShiftBadgeStyle(shift.name, idx);
              return (
                <tr key={shift.id} className="hover:bg-muted/[0.02] transition-colors">
                  {/* Shift Details Cell (Sticky on left with opaque background) */}
                  <td className={`p-1.5 sm:p-2 bg-background sticky left-0 z-10 border-b border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.04)] ${shiftStyle.border}`}>
                    <div className="font-extrabold text-foreground text-xs uppercase tracking-tight flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${shiftStyle.dot}`} />
                      {shift.name}
                    </div>
                    <div className="text-muted-foreground text-[10px] font-semibold mt-1 bg-secondary/40 py-0.5 px-1 rounded border border-border/40 inline-block shadow-[0_1px_1px_rgba(0,0,0,0.02)]">
                      {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                    </div>
                    <div className="text-[9px] font-bold text-primary mt-1 flex items-center gap-1 opacity-85">
                      <Users className="w-2.5 h-2.5" /> Tối đa {shift.max_staff}
                    </div>
                  </td>
                  
                  {/* Roster day cell for this shift */}
                  {weekDays.map(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const dayRegs = localRegistrations.filter(r => r.shift_id === shift.id && r.date === dateStr);
                    const isFull = dayRegs.length >= shift.max_staff;
                    const myReg = dayRegs.find(r => r.user_id === user?.id);
                    const isFuture = isAfter(startOfDay(date), startOfDay(new Date()));
                    const today = isTodayDate(date);

                    return (
                      <td 
                        key={date.toString()} 
                        className={`p-1 sm:p-1.5 text-center border-l border-b border-border/40 align-top transition-colors ${
                          today ? "bg-primary/[0.01]" : ""
                        }`}
                      >
                        <div className="space-y-1">
                          {/* List registered staff */}
                          {dayRegs.map(reg => {
                            const isMe = reg.user_id === user?.id;
                            return (
                              <div 
                                key={reg.id} 
                                className={`relative flex items-center justify-between py-1 px-1.5 sm:px-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)] rounded-md text-[11px] transition-all group ${
                                  isMe 
                                    ? "bg-primary/10 border border-primary/50 text-primary font-black" 
                                    : "bg-background border border-border text-foreground font-black hover:border-primary/30"
                                }`}
                              >
                                <span className="truncate pr-0.5 flex items-center gap-1 font-bold text-[11px] leading-tight">
                                  {isMe && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                                  {reg.user_email}
                                </span>
                                
                                <div className="flex gap-0.5 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  {/* Swap button for staff's own future shifts */}
                                  {user && reg.user_id === user.id && isFuture && (
                                    <button
                                      onClick={() => {
                                        setSwapSourceReg({ id: reg.id, dateStr, shiftName: shift.name });
                                        setSwapTargetUserId("");
                                        setSwapTargetRegId("");
                                        setShowSwapModal(true);
                                      }}
                                      title="Hoán ca"
                                      className="text-primary hover:bg-primary/10 p-0.5 rounded transition-colors"
                                    >
                                      <ArrowLeftRight className="w-3 h-3" />
                                    </button>
                                  )}
                                  
                                  {/* Remove registration button */}
                                  {((role === 'admin') || (myReg && myReg.id === reg.id)) && (!isWeekLocked || role === 'admin') && (
                                    <button
                                      onClick={() => handleUnregister(reg.id)}
                                      className="text-destructive hover:bg-destructive/10 p-0.5 rounded transition-colors cursor-pointer"
                                      title="Xóa nhân viên khỏi ca"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Registration Button (For Staff) */}
                          {role !== 'admin' && !myReg && !isFull && !isWeekLocked && (
                            <button
                              onClick={() => handleRegister(shift.id, date)}
                              className="w-full py-1 border border-dashed border-primary/20 text-primary hover:border-primary hover:bg-primary/5 rounded-md text-[11px] font-bold transition-all cursor-pointer"
                            >
                              Đăng ký
                            </button>
                          )}

                          {role !== 'admin' && isWeekLocked && !myReg && (
                            <div className="text-[9px] text-muted-foreground/40 bg-secondary/10 py-1 rounded-md flex items-center justify-center gap-1 font-medium">
                              <Lock className="w-2.5 h-2.5" /> Khóa
                            </div>
                          )}

                          {/* Admin Dropdown Assignment (Always enabled for Admin) */}
                          {role === 'admin' && !isFull && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAdminAssign(shift.id, dateStr, e.target.value);
                                  e.target.value = "";
                                }
                              }}
                              className="w-full px-1 py-1 border border-dashed border-primary/30 text-primary hover:border-primary hover:bg-primary/5 rounded-md text-[11px] bg-background cursor-pointer outline-none transition-all text-center font-bold"
                              defaultValue=""
                            >
                              <option value="" disabled>+ Thêm NV</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Chưa có ca làm việc nào được cấu hình.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* My Swap Requests status list */}
      {mySentSwaps.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 md:p-6 space-y-3 max-w-3xl">
          <h3 className="font-bold text-sm text-foreground">Lịch Sử Hoán Ca Của Bạn</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {mySentSwaps.map(swap => {
              const reqReg = registrations.find(r => r.id === swap.requestor_reg_id);
              const reqShift = shifts.find(s => s.id === reqReg?.shift_id);
              const tarReg = swap.target_reg_id ? registrations.find(r => r.id === swap.target_reg_id) : null;
              const tarShift = tarReg ? shifts.find(s => s.id === tarReg.shift_id) : null;

              return (
                <div key={swap.id} className="flex justify-between items-center text-xs bg-secondary/30 p-3 rounded-xl border border-border/50">
                  <div>
                    Yêu cầu hoán ca <span className="font-semibold text-primary">{reqShift?.name} ({reqReg ? format(parseISO(reqReg.date), 'dd/MM') : ''})</span> sang cho <span className="font-semibold">{swap.target_email}</span>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {tarReg ? `Lấy ca: ${tarShift?.name} (${format(parseISO(tarReg.date), 'dd/MM')})` : 'Hình thức: Nhờ làm hộ'}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    swap.status === 'accepted' ? 'bg-primary/10 text-primary' :
                    swap.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {swap.status === 'accepted' ? 'Đã đồng ý' :
                     swap.status === 'rejected' ? 'Bị từ chối' : 'Đang chờ'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SWAP SHIFT MODAL */}
      {showSwapModal && swapSourceReg && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSwapRequest} className="bg-card w-full max-w-md rounded-3xl p-6 shadow-xl border border-border space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground">Yêu Cầu Hoán Ca</h2>
              <button type="button" onClick={() => setShowSwapModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <div className="bg-primary/5 border border-primary/20 p-3 rounded-2xl text-xs text-primary space-y-0.5">
              <div className="font-bold">Ca cần hoán đổi của bạn:</div>
              <div>Ca: {swapSourceReg.shiftName} - Ngày: {format(parseISO(swapSourceReg.dateStr), 'dd/MM/yyyy')}</div>
            </div>

            {/* Target employee select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Chọn đối tác hoán ca (Nhân viên khác):</label>
              <select
                required
                value={swapTargetUserId}
                onChange={e => {
                  setSwapTargetUserId(e.target.value);
                  setSwapTargetRegId("");
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
              >
                <option value="" disabled>-- Chọn Nhân Viên --</option>
                {users.filter(u => u.id !== user?.id).map(u => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>

            {/* Target shift select (Optional) */}
            {swapTargetUserId && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-xs font-semibold text-muted-foreground">Chọn ca hoán đổi của họ (Hoặc nhờ làm hộ):</label>
                <select
                  value={swapTargetRegId}
                  onChange={e => setSwapTargetRegId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
                >
                  <option value="">Chỉ nhờ làm hộ ca này (Không lấy ca của họ)</option>
                  {targetUserFutureRegs.map(reg => {
                    const shift = shifts.find(s => s.id === reg.shift_id);
                    return (
                      <option key={reg.id} value={reg.id}>
                        Ca {shift?.name} ({format(parseISO(reg.date), 'dd/MM/yyyy')})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <button
              disabled={!swapTargetUserId}
              type="submit"
              className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Gửi Yêu Cầu Hoán Ca
            </button>
          </form>
        </div>
      )}

      {/* SHIFT MANAGER MODAL (ADMIN ONLY) */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl p-6 shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-foreground">Quản lý Ca Làm</h2>
              <button onClick={() => setShowShiftModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6 overflow-y-auto flex-1 pr-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Danh sách Ca Hiện Tại</h3>
              {shifts.map(shift => (
                <div key={shift.id} className="flex justify-between items-center bg-secondary/50 p-3 rounded-2xl border border-border/50">
                  <div>
                    <div className="font-bold text-sm">{shift.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)} • {shift.max_staff} người
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingShiftId(shift.id);
                        setNewShift({
                          name: shift.name,
                          start_time: shift.start_time.substring(0, 5),
                          end_time: shift.end_time ? shift.end_time.substring(0, 5) : "",
                          max_staff: shift.max_staff
                        });
                      }}
                      className="text-primary p-2 hover:bg-primary/10 rounded-xl"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteShift(shift.id)} className="text-destructive p-2 hover:bg-destructive/10 rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {shifts.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-4">Chưa có ca làm nào</div>
              )}
            </div>

            <form onSubmit={handleSubmitShift} className="space-y-4 border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm">
                  {editingShiftId ? "Chỉnh sửa ca làm" : "Thêm ca mới"}
                </h3>
                {editingShiftId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingShiftId(null);
                      setNewShift({ name: "", start_time: "", end_time: "", max_staff: 1 });
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Tên ca (VD: Ca Sáng)</label>
                  <input required value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Giờ bắt đầu</label>
                  <input required type="time" value={newShift.start_time} onChange={e => setNewShift({...newShift, start_time: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Giờ kết thúc</label>
                  <input required type="time" value={newShift.end_time} onChange={e => setNewShift({...newShift, end_time: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Số nhân viên tối đa</label>
                  <input required type="number" min="1" value={newShift.max_staff} onChange={e => setNewShift({...newShift, max_staff: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
                </div>
              </div>
              
              <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm transition-opacity hover:opacity-90">
                {editingShiftId ? "Cập nhật Ca làm" : "Thêm Ca làm"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

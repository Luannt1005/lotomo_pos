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

export default function ShiftsPage() {
  const { role, user } = useAuthStore();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [registrations, setRegistrations] = useState<ShiftRegistration[]>([]);
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
      
      setShifts(shiftsData || []);
      setRegistrations(regsData || []);
      setLockedWeeks(lockedData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersAndSwaps = async () => {
    try {
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      setUsers(usersData || []);

      if (user) {
        const swapsRes = await fetch(`/api/shift-swaps?target_id=${user.id}`);
        const swapsData = await swapsRes.json();
        
        // Also fetch swaps initiated by me to show status
        const mySwapsRes = await fetch(`/api/shift-swaps?requestor_id=${user.id}`);
        const mySwapsData = await mySwapsRes.json();
        
        // Combine swaps and remove duplicates
        const allSwaps = [...swapsData, ...mySwapsData].filter(
          (value, index, self) => self.findIndex(s => s.id === value.id) === index
        );
        setSwaps(allSwaps);
      }
    } catch (error) {
      console.error(error);
    }
  };

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

  // Register for self
  const handleRegister = async (shiftId: string, date: Date) => {
    if (!user) return;
    if (isWeekLocked && role !== 'admin') {
      alert("Tuần làm việc này đã bị KHÓA. Bạn không thể tự ý đăng ký.");
      return;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    const res = await fetch('/api/shift-registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shift_id: shiftId,
        user_id: user.id,
        user_email: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Staff',
        date: dateStr
      })
    });
    if (res.ok) {
      fetchData();
    } else {
      alert("Lỗi hoặc đã đăng ký ca này!");
    }
  };

  // Admin assigns staff via dropdown
  const handleAdminAssign = async (shiftId: string, dateStr: string, targetUserId: string) => {
    const selectedUser = users.find(u => u.id === targetUserId);
    if (!selectedUser) return;

    const res = await fetch('/api/shift-registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shift_id: shiftId,
        user_id: selectedUser.id,
        user_email: selectedUser.username,
        date: dateStr
      })
    });
    if (res.ok) {
      setActiveAssignCell(null);
      fetchData();
    } else {
      alert("Nhân viên này đã được đăng ký hoặc lỗi!");
    }
  };

  const handleUnregister = async (regId: string) => {
    if (isWeekLocked && role !== 'admin') {
      alert("Tuần làm việc này đã bị KHÓA. Bạn không thể tự hủy đăng ký.");
      return;
    }
    await fetch(`/api/shift-registrations/${regId}`, { method: 'DELETE' });
    fetchData();
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

  if (loading && shifts.length === 0) return <div className="p-8">Đang tải lịch làm việc...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
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
                      <span className="font-bold text-foreground">@{swap.requestor_email}</span> muốn hoán đổi ca làm với bạn:
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
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Lịch Làm Việc</h1>
            {isWeekLocked && (
              <span className="bg-destructive/10 text-destructive text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" /> Đã khóa
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">Đăng ký và quản lý ca làm nhân viên</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Week switching controls */}
          <div className="flex items-center bg-secondary rounded-xl p-1 justify-between flex-1 md:flex-none">
            <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-2 hover:bg-background rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 font-medium text-xs md:text-sm">
              {format(weekDays[0], 'dd/MM')} - {format(weekDays[6], 'dd/MM')}
            </span>
            <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-2 hover:bg-background rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Admin Week Lock Toggle Button */}
          {role === 'admin' && (
            <button
              onClick={handleToggleWeekLock}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors ${
                isWeekLocked 
                  ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20" 
                  : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
              }`}
            >
              {isWeekLocked ? (
                <>
                  <Unlock className="w-4 h-4" /> Mở khóa tuần này
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Khóa tuần này
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
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Quản lý Ca
            </button>
          )}
        </div>
      </div>

      {/* Roster Grid Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-muted-foreground">
            <tr>
              <th className="p-4 font-medium min-w-[170px]">Ca Làm</th>
              {weekDays.map(date => (
                <th key={date.toString()} className="p-4 font-medium min-w-[150px] text-center border-l border-border/50">
                  <div className="text-xs">{format(date, 'EEEE', { locale: vi })}</div>
                  <div className="text-foreground text-base mt-1">{format(date, 'dd/MM')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shifts.map(shift => (
              <tr key={shift.id}>
                {/* Shift Details Cell */}
                <td className="p-4 bg-secondary/20">
                  <div className="font-bold text-foreground">{shift.name}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                  </div>
                  <div className="text-xs text-primary mt-2 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Tối đa {shift.max_staff}
                  </div>
                </td>
                
                {/* Roster day cell for this shift */}
                {weekDays.map(date => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const dayRegs = registrations.filter(r => r.shift_id === shift.id && r.date === dateStr);
                  const isFull = dayRegs.length >= shift.max_staff;
                  const myReg = dayRegs.find(r => r.user_id === user?.id);
                  const isFuture = isAfter(startOfDay(date), startOfDay(new Date()));

                  return (
                    <td key={date.toString()} className="p-2 text-center border-l border-border/50 align-top">
                      <div className="space-y-2">
                        {/* List registered staff */}
                        {dayRegs.map(reg => (
                          <div key={reg.id} className="bg-primary/10 text-primary text-xs py-1 px-2 rounded-md flex justify-between items-center group">
                            <span className="truncate">@{reg.user_email}</span>
                            
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                  className="text-primary hover:bg-primary/20 p-1 rounded"
                                >
                                  <ArrowLeftRight className="w-3 h-3" />
                                </button>
                              )}
                              
                              {/* Remove registration button */}
                              {((role === 'admin') || (myReg && myReg.id === reg.id)) && (!isWeekLocked || role === 'admin') && (
                                <button
                                  onClick={() => handleUnregister(reg.id)}
                                  className="text-destructive hover:bg-destructive/20 p-1 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Registration Button (For Staff) */}
                        {role !== 'admin' && !myReg && !isFull && !isWeekLocked && (
                          <button
                            onClick={() => handleRegister(shift.id, date)}
                            className="w-full py-1.5 border border-dashed border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground rounded-md text-xs transition-colors"
                          >
                            Đăng ký
                          </button>
                        )}

                        {role !== 'admin' && !myReg && isFull && !isWeekLocked && (
                          <div className="text-xs text-muted-foreground bg-secondary/50 py-1.5 rounded-md">
                            Đã đủ người
                          </div>
                        )}

                        {role !== 'admin' && isWeekLocked && !myReg && (
                          <div className="text-xs text-muted-foreground bg-secondary/30 py-1.5 rounded-md flex items-center justify-center gap-1">
                            <Lock className="w-3 h-3" /> Khóa
                          </div>
                        )}

                        {/* Admin Dropdown Assignment (Always enabled for Admin) */}
                        {role === 'admin' && (
                          <div className="relative">
                            {activeAssignCell?.shiftId === shift.id && activeAssignCell?.dateStr === dateStr ? (
                              <div className="absolute top-0 left-0 right-0 bg-card border border-border shadow-md rounded-lg p-1.5 z-10 space-y-1.5">
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAdminAssign(shift.id, dateStr, e.target.value);
                                    }
                                  }}
                                  className="w-full px-2 py-1 border border-border rounded text-xs bg-background"
                                  defaultValue=""
                                >
                                  <option value="" disabled>-- Chọn NV --</option>
                                  {users.map(u => (
                                    <option key={u.id} value={u.id}>@{u.username}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => setActiveAssignCell(null)}
                                  className="w-full py-0.5 text-[10px] bg-secondary text-muted-foreground rounded"
                                >
                                  Đóng
                                </button>
                              </div>
                            ) : (
                              !isFull && (
                                <button
                                  onClick={() => setActiveAssignCell({ shiftId: shift.id, dateStr })}
                                  className="w-full py-1 border border-dashed border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md text-xs transition-colors flex items-center justify-center gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Gán NV
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
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
                    Yêu cầu hoán ca <span className="font-semibold text-primary">{reqShift?.name} ({reqReg ? format(parseISO(reqReg.date), 'dd/MM') : ''})</span> sang cho <span className="font-semibold">@{swap.target_email}</span>
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
                  <option key={u.id} value={u.id}>@{u.username}</option>
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

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start_date');
  const end = searchParams.get('end_date');

  try {
    // 1. Lấy danh sách ca làm việc để tính số giờ chuẩn
    const { data: shifts, error: shiftsError } = await supabaseAdmin.from("shifts").select("*");
    if (shiftsError) throw shiftsError;

    // 2. Lấy lịch đăng ký ca trong khoảng thời gian đã chọn
    let query = supabaseAdmin.from("shift_registrations").select("*");
    if (start && end) {
      query = query.gte("date", start).lte("date", end);
    }
    const { data: registrations, error: regError } = await query;
    if (regError) throw regError;

    // 3. Lấy thông tin user (tên, email, mức lương, ghi chú ca làm)
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    const usersMap = new Map();
    usersData?.users.forEach(u => {
      const name = 
        u.user_metadata?.name || 
        u.user_metadata?.full_name || 
        u.user_metadata?.display_name || 
        u.email?.split('@')[0] || 
        'Nhân viên';
      
      const hourlyRate = 
        typeof u.user_metadata?.hourly_rate === 'number' 
          ? u.user_metadata.hourly_rate 
          : 20000; // Mặc định 20.000đ/giờ nếu chưa cấu hình

      const shiftNotes = u.user_metadata?.shift_notes || {};

      usersMap.set(u.id, {
        id: u.id,
        email: u.email,
        name,
        hourlyRate,
        shiftNotes,
        role: u.user_metadata?.role || 'staff'
      });
    });

    // 4. Map thông tin ca làm
    const shiftMap = new Map();
    shifts?.forEach(s => {
      const [startH, startM] = (s.start_time || "00:00").split(':').map(Number);
      const [endH, endM] = (s.end_time || "00:00").split(':').map(Number);
      let hours = (endH + endM/60) - (startH + startM/60);
      if (hours < 0) hours += 24; // Qua đêm
      shiftMap.set(s.id, { 
        id: s.id, 
        name: s.name, 
        startTime: s.start_time, 
        endTime: s.end_time, 
        hours 
      });
    });

    // 5. Khởi tạo đối tượng bảng lương cho từng nhân viên
    const payroll: Record<string, any> = {};

    // Khởi tạo trước cho tất cả các user đã đăng ký ca
    registrations?.forEach(reg => {
      const userInfo = usersMap.get(reg.user_id) || {
        id: reg.user_id,
        email: reg.user_email,
        name: reg.user_email?.split('@')[0] || "Nhân viên",
        hourlyRate: 20000,
        shiftNotes: {},
        role: 'staff'
      };

      if (!payroll[reg.user_id]) {
        payroll[reg.user_id] = {
          userId: reg.user_id,
          email: userInfo.email,
          name: userInfo.name,
          role: userInfo.role,
          hourlyRate: userInfo.hourlyRate,
          totalShifts: 0,
          totalStandardHours: 0,
          totalAdjustmentHours: 0,
          totalActualHours: 0,
          totalAmountAdjustment: 0,
          totalSalary: 0,
          shifts: []
        };
      }

      const shiftInfo = shiftMap.get(reg.shift_id) || {
        id: reg.shift_id,
        name: "Ca làm việc",
        startTime: "10:00",
        endTime: "15:00",
        hours: 5
      };

      const adjustment = userInfo.shiftNotes[reg.id] || null;
      const standardHours = shiftInfo.hours;
      const hoursAdjustment = adjustment ? Number(adjustment.hours_adjustment) || 0 : 0;
      const actualHours = Math.max(0, standardHours + hoursAdjustment);
      const amountAdjustment = adjustment ? Number(adjustment.amount_adjustment) || 0 : 0;
      const shiftSalary = Math.round(actualHours * userInfo.hourlyRate + amountAdjustment);

      const shiftItem = {
        registrationId: reg.id,
        shiftId: reg.shift_id,
        shiftName: shiftInfo.name,
        date: reg.date,
        startTime: shiftInfo.startTime,
        endTime: shiftInfo.endTime,
        standardHours,
        hoursAdjustment,
        actualHours,
        amountAdjustment,
        note: adjustment?.note || "",
        type: adjustment?.type || (hoursAdjustment < 0 ? "late" : hoursAdjustment > 0 ? "ot" : "standard"),
        shiftSalary,
        updatedAt: adjustment?.updated_at || null
      };

      payroll[reg.user_id].shifts.push(shiftItem);
      payroll[reg.user_id].totalShifts += 1;
      payroll[reg.user_id].totalStandardHours += standardHours;
      payroll[reg.user_id].totalAdjustmentHours += hoursAdjustment;
      payroll[reg.user_id].totalActualHours += actualHours;
      payroll[reg.user_id].totalAmountAdjustment += amountAdjustment;
      payroll[reg.user_id].totalSalary += shiftSalary;
    });

    // Thêm các user còn lại (nếu có nhân viên chưa có ca trong kỳ) để admin có thể cấu hình lương trước
    usersMap.forEach((userInfo, uId) => {
      if (!payroll[uId]) {
        payroll[uId] = {
          userId: uId,
          email: userInfo.email,
          name: userInfo.name,
          role: userInfo.role,
          hourlyRate: userInfo.hourlyRate,
          totalShifts: 0,
          totalStandardHours: 0,
          totalAdjustmentHours: 0,
          totalActualHours: 0,
          totalAmountAdjustment: 0,
          totalSalary: 0,
          shifts: []
        };
      }
    });

    // Sắp xếp ca làm trong từng nhân viên theo thứ tự ngày giảm dần (mới nhất lên đầu)
    Object.values(payroll).forEach((p: any) => {
      p.shifts.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    // Chuyển thành mảng và sắp xếp: người có số ca nhiều hơn lên trước
    const result = Object.values(payroll).sort((a: any, b: any) => b.totalShifts - a.totalShifts || b.totalSalary - a.totalSalary);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error in /api/payroll:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

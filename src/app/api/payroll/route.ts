import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start_date');
  const end = searchParams.get('end_date');

  try {
    // Lấy danh sách ca làm việc để tính số giờ
    const { data: shifts, error: shiftsError } = await supabaseAdmin.from("shifts").select("*");
    if (shiftsError) throw shiftsError;

    // Lấy lịch đăng ký trong khoảng thời gian
    let query = supabaseAdmin.from("shift_registrations").select("*");
    if (start && end) {
      query = query.gte("date", start).lte("date", end);
    }
    const { data: registrations, error: regError } = await query;
    if (regError) throw regError;

    // Lấy thông tin user (tùy chọn, để có tên đẹp hơn email)
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const usersMap = new Map();
    usersData?.users.forEach(u => {
      usersMap.set(u.id, u.user_metadata?.name || u.email);
    });

    const shiftMap = new Map();
    shifts?.forEach(s => {
      // Tính số giờ của ca
      const [startH, startM] = s.start_time.split(':').map(Number);
      const [endH, endM] = s.end_time.split(':').map(Number);
      let hours = (endH + endM/60) - (startH + startM/60);
      if (hours < 0) hours += 24; // Qua ngày
      shiftMap.set(s.id, { name: s.name, hours });
    });

    // Tính lương cho từng nhân viên
    const payroll: Record<string, { userId: string, email: string, name: string, totalHours: number, totalShifts: number }> = {};

    registrations?.forEach(reg => {
      if (!payroll[reg.user_id]) {
        payroll[reg.user_id] = {
          userId: reg.user_id,
          email: reg.user_email,
          name: usersMap.get(reg.user_id) || reg.user_email,
          totalHours: 0,
          totalShifts: 0
        };
      }
      
      const shiftInfo = shiftMap.get(reg.shift_id);
      if (shiftInfo) {
        payroll[reg.user_id].totalHours += shiftInfo.hours;
        payroll[reg.user_id].totalShifts += 1;
      }
    });

    return NextResponse.json(Object.values(payroll));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

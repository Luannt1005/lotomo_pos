import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });
    }

    // Lấy thông tin user hiện tại
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError || !userData?.user) {
      return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    const currentMetadata = userData.user.user_metadata || {};
    const updatedMetadata = { ...currentMetadata };

    if (action === "update_rate") {
      const { hourlyRate } = body;
      if (typeof hourlyRate !== "number" || hourlyRate < 0) {
        return NextResponse.json({ error: "Mức lương không hợp lệ" }, { status: 400 });
      }
      updatedMetadata.hourly_rate = hourlyRate;
    } else if (action === "update_shift_adjustment") {
      const { registrationId, note, type, hoursAdjustment, amountAdjustment } = body;
      if (!registrationId) {
        return NextResponse.json({ error: "Thiếu registrationId" }, { status: 400 });
      }

      const shiftNotes = { ...(currentMetadata.shift_notes || {}) };
      
      // Nếu không có note, không có điều chỉnh giờ, không có tiền thì xóa adjustment
      if (!note && !hoursAdjustment && !amountAdjustment) {
        delete shiftNotes[registrationId];
      } else {
        shiftNotes[registrationId] = {
          note: note || "",
          type: type || "custom", // 'late' | 'early_leave' | 'ot' | 'bonus' | 'penalty' | 'custom'
          hours_adjustment: Number(hoursAdjustment) || 0,
          amount_adjustment: Number(amountAdjustment) || 0,
          updated_at: new Date().toISOString()
        };
      }

      updatedMetadata.shift_notes = shiftNotes;
    } else if (action === "delete_shift_adjustment") {
      const { registrationId } = body;
      if (!registrationId) {
        return NextResponse.json({ error: "Thiếu registrationId" }, { status: 400 });
      }
      const shiftNotes = { ...(currentMetadata.shift_notes || {}) };
      delete shiftNotes[registrationId];
      updatedMetadata.shift_notes = shiftNotes;
    } else {
      return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: updatedMetadata
    });

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, metadata: updatedMetadata });
  } catch (err: any) {
    console.error("Error in /api/payroll/adjust:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

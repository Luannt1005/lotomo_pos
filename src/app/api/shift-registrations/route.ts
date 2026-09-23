import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = supabaseAdmin.from("shift_registrations").select("*");
  
  if (startDate && endDate) {
    query = query.gte("date", startDate).lte("date", endDate);
  }
  
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Ensure user_email is populated to satisfy the NOT NULL database constraint
    if (!body.user_email && body.user_id) {
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(body.user_id);
        if (userData?.user?.email) {
          body.user_email = userData.user.email;
        }
      } catch (err) {
        console.warn("Could not query user email from auth admin:", err);
      }
    }

    if (!body.user_email) {
      body.user_email = `${body.user_id || 'unknown'}@lotomo.local`;
    }

    const { data, error } = await supabaseAdmin
      .from("shift_registrations")
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert shift_registrations error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("POST /api/shift-registrations error:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ khi đăng ký ca" }, { status: 500 });
  }
}

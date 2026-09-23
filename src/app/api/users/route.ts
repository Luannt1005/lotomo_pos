import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { getCachedUsers } from "@/lib/usersCache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await getCachedUsers();
    const formattedUsers = users.map(u => {
    const staffName = u.user_metadata?.name || u.user_metadata?.full_name || u.user_metadata?.display_name || u.user_metadata?.username || u.email?.split('@')[0] || 'Nhân viên';
    return {
      id: u.id,
      email: u.email,
      role: u.user_metadata?.role || 'staff',
      name: staffName,
      username: staffName
    };
  });
  
    return NextResponse.json(formattedUsers);
  } catch (error: any) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: error.message || "Lỗi tải người dùng" }, { status: 500 });
  }
}

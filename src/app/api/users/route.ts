import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is missing in this environment (Vercel/Production)!");
    return NextResponse.json({ 
      error: "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. If deploying on Vercel, please add this variable with your Supabase service_role secret key in Vercel project settings." 
    }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("Supabase admin.listUsers error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  const users = data?.users || [];
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
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  const formattedUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.user_metadata?.role || 'staff',
    username: u.user_metadata?.display_name || u.user_metadata?.username || u.email?.split('@')[0] || 'Staff'
  }));
  
  return NextResponse.json(formattedUsers);
}

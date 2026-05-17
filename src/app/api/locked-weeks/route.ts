import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin.from("locked_weeks").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { week_start, user_id, action } = await req.json();
  
  if (action === 'lock') {
    const { data, error } = await supabaseAdmin.from("locked_weeks").insert([{ week_start, locked_by: user_id }]).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    const { error } = await supabaseAdmin.from("locked_weeks").delete().eq("week_start", week_start);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }
}

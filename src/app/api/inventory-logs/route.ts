import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date"); // YYYY-MM-DD
  
  let query = supabaseAdmin
    .from("inventory_logs")
    .select(`
      id, type, quantity, cost_per_unit_at_time, note, created_at,
      ingredients ( id, name, unit )
    `)
    .order("created_at", { ascending: false });

  if (dateStr) {
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    query = query.gte("created_at", startOfDay.toISOString())
                 .lte("created_at", endOfDay.toISOString());
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

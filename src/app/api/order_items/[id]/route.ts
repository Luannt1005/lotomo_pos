import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { data, error } = await supabaseAdmin
    .from("order_items")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Supabase Error (PATCH /api/order_items/[id]):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

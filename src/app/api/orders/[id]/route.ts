import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Fetch order items with product details
  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select(`
      *,
      products (
        id,
        name,
        category,
        image_url
      )
    `)
    .eq("order_id", id);

  if (error) {
    console.error("Supabase Error (GET /api/orders/[id]):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ items: data || [] });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Supabase Error (PATCH /api/orders/[id]):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

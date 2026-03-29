import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        products (
          name
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase Error (GET /api/orders):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      items,
      total_amount, 
      discount_amount,
      payment_method, 
      is_paid, 
      paid_at, 
      status: reqStatus 
    } = body;

    // 1. Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([{ 
        total_amount, 
        discount_amount: discount_amount || 0,
        payment_method, 
        is_paid, 
        paid_at, 
        status: reqStatus || 'preparing' 
      }])
      .select()
      .single();

    if (orderError) {
      console.error("Supabase Error (POST /api/orders - order):", orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // 2. Create order items (Atomic-like)
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      size: item.size,
      sugar: item.sugar,
      ice: item.ice,
      toppings: item.toppings,
      note: item.note,
      status: 'preparing',
      unit_price: item.unit_price,
      total_price: item.total_price
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Supabase Error (POST /api/orders - items):", itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json(order);
  } catch (err: any) {
    console.error("Runtime Error (POST /api/orders):", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

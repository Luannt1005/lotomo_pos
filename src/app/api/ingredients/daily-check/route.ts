import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { items } = await request.json();
    // items: { id: string, actual_quantity: number, old_quantity: number, cost_per_unit_at_time: number }[]

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    // Since Supabase doesn't have transactions in the JS client via RPC unless we write a Postgres function,
    // we'll update one by one for now or use upsert if possible.
    // It's better to update one by one.
    
    for (const item of items) {
      const diff = item.actual_quantity - item.old_quantity;
      
      if (diff !== 0) {
        // 1. Insert log
        const { error: logError } = await supabaseAdmin.from("inventory_logs").insert({
          ingredient_id: item.id,
          type: "adjustment",
          quantity: diff,
          cost_per_unit_at_time: item.cost_per_unit_at_time || 0,
          note: "Kiểm kho cuối ca",
        });

        if (logError) throw logError;

        // 2. Update stock
        const { error: updateError } = await supabaseAdmin
          .from("ingredients")
          .update({ stock_quantity: item.actual_quantity })
          .eq("id", item.id);

        if (updateError) throw updateError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

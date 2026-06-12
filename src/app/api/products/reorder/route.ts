import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { id1, created1, id2, created2 } = await request.json();
    
    // Swap their created_at timestamps to swap their order
    const { error: err1 } = await supabaseAdmin.from("products").update({ created_at: created2 }).eq("id", id1);
    const { error: err2 } = await supabaseAdmin.from("products").update({ created_at: created1 }).eq("id", id2);
    
    if (err1) throw err1;
    if (err2) throw err2;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reorder Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

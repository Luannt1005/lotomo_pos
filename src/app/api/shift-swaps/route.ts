import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('target_id');
  const requestorId = searchParams.get('requestor_id');
  
  let query = supabaseAdmin.from("shift_swaps").select("*");
  
  if (targetId) {
    query = query.eq("target_id", targetId);
  }
  if (requestorId) {
    query = query.eq("requestor_id", requestorId);
  }
  
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("shift_swaps").insert([body]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  
  if (status === 'accepted') {
    // 1. Get the swap details
    const { data: swap, error: swapErr } = await supabaseAdmin.from("shift_swaps").select("*").eq("id", id).single();
    if (swapErr || !swap) return NextResponse.json({ error: "Yêu cầu không tồn tại" }, { status: 404 });
    
    // 2. Fetch registrations to confirm details
    const { data: regA, error: regAErr } = await supabaseAdmin.from("shift_registrations").select("*").eq("id", swap.requestor_reg_id).single();
    if (regAErr || !regA) return NextResponse.json({ error: "Ca của người yêu cầu không còn tồn tại" }, { status: 404 });
    
    if (swap.target_reg_id) {
      // It's a mutual swap
      const { data: regB, error: regBErr } = await supabaseAdmin.from("shift_registrations").select("*").eq("id", swap.target_reg_id).single();
      if (regBErr || !regB) return NextResponse.json({ error: "Ca hoán đổi của đối tác không còn tồn tại" }, { status: 404 });
      
      // Perform mutual swap: A's reg gets B's user, B's reg gets A's user
      const updateA = supabaseAdmin.from("shift_registrations").update({
        user_id: swap.target_id,
        user_email: swap.target_email
      }).eq("id", swap.requestor_reg_id);
      
      const updateB = supabaseAdmin.from("shift_registrations").update({
        user_id: swap.requestor_id,
        user_email: swap.requestor_email
      }).eq("id", swap.target_reg_id);
      
      const [resA, resB] = await Promise.all([updateA, updateB]);
      if (resA.error || resB.error) {
        return NextResponse.json({ error: "Lỗi khi thực hiện hoán đổi ca làm" }, { status: 500 });
      }
    } else {
      // It's a cover request: B takes A's shift
      const { error: coverErr } = await supabaseAdmin.from("shift_registrations").update({
        user_id: swap.target_id,
        user_email: swap.target_email
      }).eq("id", swap.requestor_reg_id);
      
      if (coverErr) {
        return NextResponse.json({ error: "Lỗi khi chuyển giao ca làm" }, { status: 500 });
      }
    }
  }
  
  // Update swap request status
  const { data, error } = await supabaseAdmin.from("shift_swaps").update({ status }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

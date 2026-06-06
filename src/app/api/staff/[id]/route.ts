import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, role, password, isActive } = body;

    const updatePayload: any = {};
    if (name !== undefined || role !== undefined) {
      updatePayload.user_metadata = { name, role };
    }
    if (password) {
      updatePayload.password = password;
    }
    if (isActive !== undefined) {
      // Supabase ban functionality via admin API
      updatePayload.ban_duration = isActive ? 'none' : '87600h'; // 10 years ban if not active
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload);

    if (error) throw error;
    return NextResponse.json(data.user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

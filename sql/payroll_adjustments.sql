-- =====================================================================
-- LOTOMO POS: BẢNG GHI CHÚ & ĐIỀU CHỈNH CA LÀM VIỆC (SHIFT ADJUSTMENTS)
-- =====================================================================
-- Tính năng hiện tại đã hoạt động trực tiếp 100% thông qua Supabase user_metadata
-- File SQL này dùng để tham khảo hoặc lưu trữ mở rộng nếu cần tạo bảng riêng trong PostgreSQL.

CREATE TABLE IF NOT EXISTS public.shift_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES public.shift_registrations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('standard', 'late', 'early_leave', 'ot', 'bonus', 'penalty', 'custom')),
    hours_adjustment NUMERIC(4, 2) NOT NULL DEFAULT 0, -- Âm nếu trễ/về sớm, dương nếu OT
    amount_adjustment INTEGER NOT NULL DEFAULT 0, -- Tiền thưởng (+), tiền phạt (-)
    note TEXT, -- Ghi chú chi tiết lý do (ví dụ: đi trễ 1 tiếng, OT dọn quán...)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.shift_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on shift_adjustments" ON public.shift_adjustments FOR ALL USING (true);

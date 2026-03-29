"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Tag, Calendar, Clock } from "lucide-react";
import { Discount } from "@/types/database";

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Discount | null>(null);

  // Form
  const [label, setLabel] = useState("");
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [specificDate, setSpecificDate] = useState<string>("");
  const [minOrder, setMinOrder] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/discounts");
    const data = await res.json();
    if (!data.error) setDiscounts(data);
    setLoading(false);
  };

  const openAdd = () => {
    setEditingItem(null);
    setLabel(""); setType("percentage"); setValue("");
    setDayOfWeek(null); setSpecificDate(""); setMinOrder(""); setIsActive(true);
    setIsModalOpen(true);
  };

  const openEdit = (d: Discount) => {
    setEditingItem(d);
    setLabel(d.label); setType(d.type); setValue(d.value.toString());
    setDayOfWeek(d.day_of_week); setSpecificDate(d.specific_date || "");
    setMinOrder(d.min_order_value?.toString() || ""); setIsActive(d.is_active);
    setIsModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      label, type, value: parseInt(value),
      day_of_week: dayOfWeek,
      specific_date: specificDate || null,
      min_order_value: parseInt(minOrder) || null,
      is_active: isActive
    };
    const method = editingItem ? "PATCH" : "POST";
    const url = editingItem ? `/api/discounts/${editingItem.id}` : "/api/discounts";
    await fetch(url, { method, body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
    setIsModalOpen(false);
    fetchData();
  };

  const deleteItem = async (id: string) => {
    if (confirm("Xoá khuyến mãi này?")) {
      await fetch(`/api/discounts/${id}`, { method: "DELETE" });
      fetchData();
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  const DAYS = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

  return (
    <div className="p-10 h-full flex flex-col bg-[#f8f9fa]">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">QUẢN LÝ KHUYẾN MÃI</h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest opacity-50">Thiết lập các chương trình giảm giá tự động</p>
        </div>
        <button onClick={openAdd} className="bg-primary text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Thêm chương trình
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
        {loading ? (
          <div className="col-span-full py-20 text-center font-black uppercase tracking-widest opacity-20 animate-pulse">Đang tải...</div>
        ) : discounts.length === 0 ? (
          <div className="col-span-full py-20 text-center font-black uppercase tracking-widest opacity-10 italic">Chưa có khuyến mãi nào</div>
        ) : discounts.map(d => (
          <div key={d.id} className={`bg-white rounded-[2.5rem] p-8 border-4 transition-all relative group ${d.is_active ? "border-white shadow-xl" : "border-dashed border-muted opacity-60"}`}>
             <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${d.is_active ? "bg-primary text-white shadow-lg" : "bg-muted text-muted-foreground"}`}>
                   <Tag className="w-6 h-6" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                   <button onClick={() => openEdit(d)} className="p-3 bg-secondary rounded-xl hover:bg-primary hover:text-white transition-all"><Pencil className="w-4 h-4"/></button>
                   <button onClick={() => deleteItem(d.id)} className="p-3 bg-destructive/5 text-destructive rounded-xl hover:bg-destructive hover:text-white transition-all"><Trash2 className="w-4 h-4"/></button>
                </div>
             </div>
             
             <h3 className="text-xl font-black uppercase tracking-tight mb-2 line-clamp-2">{d.label}</h3>
             
             <div className="text-3xl font-black text-primary tracking-tighter mb-6">
                {d.type === 'percentage' ? `${d.value}% OFF` : `-${formatCurrency(d.value)}`}
             </div>

             <div className="space-y-3 pt-6 border-t border-black/5">
                {d.specific_date ? (
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-500 bg-orange-50 px-3 py-1.5 rounded-lg w-fit">
                        <Calendar className="w-3 h-3"/> {new Date(d.specific_date).toLocaleDateString('vi-VN')}
                    </div>
                ) : d.day_of_week !== null ? (
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
                        <Clock className="w-3 h-3"/> Hàng {DAYS[d.day_of_week]}
                    </div>
                ) : (
                    <div className="text-[10px] font-black uppercase opacity-30">Áp dụng mọi ngày</div>
                )}
                
                {d.min_order_value && (
                    <div className="text-[10px] font-black uppercase opacity-40">Đơn từ {formatCurrency(d.min_order_value)}</div>
                )}
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border-4 border-white">
              <div className="p-8 border-b bg-muted/10 flex justify-between items-center">
                 <h2 className="text-2xl font-black uppercase tracking-tighter">{editingItem ? "Sửa khuyến mãi" : "Thêm khuyến mãi"}</h2>
                 <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center font-bold">X</button>
              </div>
              <form onSubmit={save} className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Tên chương trình</label>
                    <input required value={label} onChange={e => setLabel(e.target.value)} className="w-full bg-muted/20 rounded-2xl px-6 py-4 font-black text-lg outline-none focus:bg-white border-2 border-transparent focus:border-primary/20" placeholder="VD: GIẢM 50% CUỐI TUẦN" />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Kiểu giảm</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-muted/20 rounded-2xl px-6 py-4 font-black outline-none border-2 border-transparent focus:border-primary/20">
                            <option value="percentage">Phần trăm (%)</option>
                            <option value="fixed">Số tiền cố định (đ)</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Mức giảm</label>
                        <input required type="number" value={value} onChange={e => setValue(e.target.value)} className="w-full bg-muted/20 rounded-2xl px-6 py-4 font-black outline-none focus:bg-white border-2 border-transparent focus:border-primary/20" placeholder="50" />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Thời gian áp dụng</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => { setDayOfWeek(null); setSpecificDate(""); }} className={`py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 ${dayOfWeek === null && !specificDate ? "bg-primary text-white" : "bg-muted"}`}>Mọi ngày</button>
                        <button type="button" onClick={() => setDayOfWeek(0)} className={`py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 ${dayOfWeek !== null ? "bg-primary text-white" : "bg-muted"}`}>Thứ trong tuần</button>
                    </div>
                    
                    {dayOfWeek !== null && (
                        <div className="grid grid-cols-4 gap-2 pt-2 animate-in slide-in-from-top-2">
                            {DAYS.map((d, i) => (
                                <button key={i} type="button" onClick={() => setDayOfWeek(i)} className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter border-2 ${dayOfWeek === i ? "bg-primary text-white" : "bg-muted"}`}>{d}</button>
                            ))}
                        </div>
                    )}
                    
                    <div className="pt-4 mt-4 border-t border-dashed">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Hoặc một ngày cụ thể</label>
                        <input type="date" value={specificDate} onChange={e => { setSpecificDate(e.target.value); setDayOfWeek(null); }} className="w-full bg-muted/20 rounded-xl px-4 py-3 font-black outline-none" />
                    </div>
                 </div>

                 <div className="flex items-center gap-4 pt-6">
                    <button type="submit" className="flex-1 bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Lưu khuyến mãi</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

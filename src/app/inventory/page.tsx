"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Package, History, X } from "lucide-react";
import Link from "next/link";
import { Ingredient } from "@/types/database";
import { useAuthStore } from "@/store/auth";

export default function InventoryPage() {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isDailyCheckModalOpen, setIsDailyCheckModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  
  // Daily check items
  const [dailyCheckItems, setDailyCheckItems] = useState<{id: string, actual_quantity: number, old_quantity: number, cost_per_unit_at_time: number}[]>([]);
  
  // Forms
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("g");
  
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockTotalCost, setRestockTotalCost] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ingredients");
      const data = await res.json();
      if (!data.error) setIngredients(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setEditingItem(null);
    setName("");
    setUnit("g");
    setIsModalOpen(true);
  };

  const openEdit = (item: Ingredient) => {
    setEditingItem(item);
    setName(item.name);
    setUnit(item.unit);
    setIsModalOpen(true);
  };

  const saveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, unit };
    const method = editingItem ? "PATCH" : "POST";
    const url = editingItem ? `/api/ingredients/${editingItem.id}` : "/api/ingredients";
    
    try {
      const res = await fetch(url, { method, body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      if (res.ok) { 
        setIsModalOpen(false); 
        fetchData(); 
      } else {
        const err = await res.json();
        alert("Lỗi lưu nguyên liệu: " + (err.error || "Không xác định"));
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + e.message);
    }
  };

  const deleteIngredient = async (id: string) => {
    if (confirm("Xoá nguyên liệu này? Các công thức đang dùng có thể bị lỗi.")) {
      try {
        const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
        if (res.ok) {
           fetchData();
        } else {
           const err = await res.json();
           alert("Lỗi khi xoá: " + (err.error || "Không xác định"));
        }
      } catch (e: any) {
        alert("Lỗi kết nối: " + e.message);
      }
    }
  };

  const openRestock = (item: Ingredient) => {
    setEditingItem(item);
    setRestockQuantity("");
    setRestockTotalCost("");
    setIsRestockModalOpen(true);
  };

  const saveRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    const payload = { 
        quantity: parseInt(restockQuantity) || 0,
        total_cost: parseInt(restockTotalCost) || 0
    };

    try {
      const res = await fetch(`/api/ingredients/${editingItem.id}/restock`, { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      if (res.ok) { 
        setIsRestockModalOpen(false); 
        fetchData(); 
      } else {
        const err = await res.json();
        alert("Lỗi nhập kho: " + (err.error || "Không xác định"));
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + e.message);
    }
  };

  const openDailyCheck = () => {
    setDailyCheckItems(ingredients.map(i => ({
      id: i.id,
      actual_quantity: i.stock_quantity,
      old_quantity: i.stock_quantity,
      cost_per_unit_at_time: i.unit_cost
    })));
    setIsDailyCheckModalOpen(true);
  };

  const handleDailyCheckChange = (id: string, newQty: string) => {
    setDailyCheckItems(prev => prev.map(item => 
      item.id === id ? { ...item, actual_quantity: parseInt(newQty) || 0 } : item
    ));
  };

  const saveDailyCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/ingredients/daily-check", {
        method: "POST",
        body: JSON.stringify({ items: dailyCheckItems }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        setIsDailyCheckModalOpen(false);
        fetchData();
        alert("Đã cập nhật kho cuối ca thành công!");
      } else {
        const err = await res.json();
        alert("Lỗi kiểm kho: " + (err.error || "Không xác định"));
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + e.message);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-2 md:p-6 h-full flex flex-col bg-muted/5 w-full space-y-3">
      {/* Header section - responsive padding and spacing */}
      <div className="flex flex-row justify-between items-center px-1">
        <div className="flex items-center gap-1.5 md:gap-3">
          <h1 className="text-base md:text-3xl font-black tracking-tighter uppercase">KHO</h1>
          <span className="text-[7px] md:text-xs font-bold text-muted-foreground uppercase opacity-60 bg-muted px-1.5 py-0.5 rounded">Tồn kho</span>
        </div>
        
        <div className="flex items-center gap-1.5 md:gap-3">
          <Link href="/inventory/history" className="bg-white text-muted-foreground border border-border font-black p-2 md:px-6 md:py-3 rounded-xl flex items-center justify-center gap-1 hover:bg-black hover:text-white transition-all uppercase tracking-widest text-[8px] md:text-xs shadow-sm">
            <History className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden md:inline">LỊCH SỬ</span>
          </Link>
          <button onClick={openDailyCheck} className="bg-amber-500 text-white font-black px-2.5 py-2 md:px-6 md:py-3 rounded-xl flex items-center justify-center gap-1 hover:bg-amber-600 transition-all uppercase tracking-widest text-[8px] md:text-xs shadow-md whitespace-nowrap">
            KIỂM KHO
          </button>
          {isAdmin && (
            <button onClick={openAdd} className="bg-primary text-white font-black px-2.5 py-2 md:px-6 md:py-3 rounded-xl flex items-center justify-center gap-1 hover:bg-primary/90 transition-all uppercase tracking-widest text-[8px] md:text-xs shadow-md whitespace-nowrap">
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /> THÊM MỚI
            </button>
          )}
        </div>
      </div>

      {/* Roster / Inventory table wrapper */}
      <div className="flex-1 overflow-auto w-full">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-left border-collapse table-auto text-xs md:text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground">
                <th className="px-3.5 py-3 md:px-6 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-wider opacity-60">Tên Nguyên Liệu</th>
                <th className="px-3.5 py-3 md:px-6 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-wider opacity-60">Tồn Kho</th>
                <th className="px-2 py-3 md:px-6 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-wider opacity-60">ĐVT</th>
                <th className="px-3.5 py-3 md:px-6 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-wider opacity-60">Giá Vốn</th>
                {isAdmin && <th className="px-3.5 py-3 md:px-6 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-wider opacity-60 text-right">Thao Tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ingredients.map((item) => (
                <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-3.5 py-3 md:px-6 md:py-4 font-black uppercase tracking-tight text-xs md:text-sm">{item.name}</td>
                  <td className="px-3.5 py-3 md:px-6 md:py-4 font-bold text-primary">{new Intl.NumberFormat("vi-VN").format(item.stock_quantity)}</td>
                  <td className="px-2 py-3 md:px-6 md:py-4 font-bold opacity-70 uppercase text-[10px] md:text-xs">{item.unit}</td>
                  <td className="px-3.5 py-3 md:px-6 md:py-4 font-bold text-foreground/80">{formatCurrency(item.unit_cost)}</td>
                  {isAdmin && (
                    <td className="px-3.5 py-2 md:px-6 md:py-4 text-right">
                      <div className="flex justify-end items-center gap-1 md:gap-2">
                        <button onClick={() => openRestock(item)} className="p-1.5 md:p-2 border rounded-xl hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all text-primary border-primary/20" title="Nhập kho">
                          <Package className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                        <button onClick={() => openEdit(item)} className="p-1.5 md:p-2 border border-border rounded-xl hover:bg-secondary transition-all text-muted-foreground">
                          <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                        <button onClick={() => deleteIngredient(item.id)} className="p-1.5 md:p-2 border border-destructive/20 rounded-xl hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all text-destructive">
                          <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {ingredients.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">Chưa có nguyên liệu nào. Hãy thêm mới!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-card border border-border rounded-2xl md:rounded-[2rem] p-5 md:p-8 w-full max-w-sm shadow-xl animate-in zoom-in-95">
            <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight mb-4 md:mb-6">{editingItem ? "Sửa Nguyên Liệu" : "Thêm Nguyên Liệu"}</h2>
            <form onSubmit={saveIngredient} className="space-y-4">
              <div>
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1.5">Tên Nguyên Liệu</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 md:px-4 md:py-3 font-semibold text-xs md:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="VD: Bột Matcha" />
              </div>
              <div>
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1.5">Đơn Vị Tính (ĐVT)</label>
                <input required value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 md:px-4 md:py-3 font-semibold text-xs md:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="VD: g, ml, ly, ống hút..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-border rounded-xl font-bold uppercase text-[10px] md:text-xs hover:bg-secondary transition-all">Huỷ</button>
                <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold uppercase text-[10px] md:text-xs shadow-lg hover:opacity-90 transition-all">Lưu Lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Restock */}
      {isRestockModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-card border border-border rounded-2xl md:rounded-[2rem] p-5 md:p-8 w-full max-w-sm shadow-xl animate-in zoom-in-95">
            <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight mb-1">Nhập kho</h2>
            <p className="text-xs md:text-sm font-bold text-primary mb-4 md:mb-6">Nguyên liệu: {editingItem.name}</p>
            <form onSubmit={saveRestock} className="space-y-4">
              <div>
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1.5">Số lượng nhập (Đơn vị: {editingItem.unit})</label>
                <input required type="number" min="1" value={restockQuantity} onChange={e => setRestockQuantity(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 md:px-4 md:py-3 font-semibold text-xs md:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="VD: 1000" />
              </div>
              <div>
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1.5">Tổng tiền thanh toán (VNĐ)</label>
                <input required type="number" min="0" value={restockTotalCost} onChange={e => setRestockTotalCost(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 md:px-4 md:py-3 font-semibold text-xs md:text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="VD: 500000" />
                <p className="text-[8px] md:text-[10px] opacity-55 mt-1.5 font-medium">Hệ thống sẽ tự động chia đều để tính ra giá vốn gốc.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsRestockModalOpen(false)} className="flex-1 py-2.5 border border-border rounded-xl font-bold uppercase text-[10px] md:text-xs hover:bg-secondary transition-all">Huỷ</button>
                <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold uppercase text-[10px] md:text-xs shadow-lg hover:opacity-90 transition-all">Xác Nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Daily Check - Highly optimized for iPhone */}
      {isDailyCheckModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex justify-center items-center p-3 md:p-4">
          <div className="bg-card border border-border rounded-2xl md:rounded-[2rem] p-4 md:p-6 lg:p-8 w-full max-w-lg shadow-xl animate-in zoom-in-95 flex flex-col max-h-[92vh]">
            
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-base md:text-2xl font-black uppercase tracking-tight text-amber-500">Kiểm Kho Cuối Ca</h2>
                <p className="text-[10px] md:text-sm font-bold text-muted-foreground mt-0.5">Cập nhật lượng thực tế để tính toán mua hàng cho ngày mai.</p>
              </div>
              <button onClick={() => setIsDailyCheckModalOpen(false)} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveDailyCheck} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-auto bg-muted/10 rounded-xl p-2 md:p-4 border border-border space-y-2 max-h-[50vh]">
                {ingredients.map(item => {
                  const checkItem = dailyCheckItems.find(d => d.id === item.id);
                  const isLow = (checkItem?.actual_quantity || 0) < item.stock_quantity;
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 p-2.5 bg-background rounded-xl border border-border shadow-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs md:text-sm uppercase truncate text-foreground/90">{item.name}</p>
                        <p className="text-[9px] md:text-xs font-bold text-muted-foreground mt-0.5">
                          Tồn trên app: <span className="text-primary font-black">{item.stock_quantity} {item.unit}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            value={checkItem?.actual_quantity ?? ""}
                            onChange={e => handleDailyCheckChange(item.id, e.target.value)}
                            className={`w-20 md:w-24 bg-muted/30 border rounded-lg px-2.5 py-1.5 md:py-2 font-black text-right text-xs md:text-sm outline-none transition-all ${isLow ? 'border-red-500/40 text-red-600 focus:ring-1 focus:ring-red-500' : 'border-border focus:ring-1 focus:ring-primary'}`}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black opacity-30 pointer-events-none uppercase">{item.unit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {ingredients.length === 0 && (
                  <p className="text-center text-xs font-bold text-muted-foreground py-8">Chưa có nguyên liệu nào.</p>
                )}
              </div>

              <div className="flex gap-3 pt-4 mt-auto">
                <button type="button" onClick={() => setIsDailyCheckModalOpen(false)} className="flex-1 py-2.5 border border-border rounded-xl font-bold uppercase text-[10px] md:text-xs hover:bg-secondary transition-all">Huỷ</button>
                <button type="submit" className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-bold uppercase text-[10px] md:text-xs shadow-lg hover:bg-amber-600 transition-all">Cập Nhật Kho</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

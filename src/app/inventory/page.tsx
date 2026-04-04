"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { Ingredient } from "@/types/database";

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  
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

  const formatCurrency = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-2 md:p-6 h-full flex flex-col bg-muted/5 w-full">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm md:text-3xl font-black tracking-tighter uppercase">KHO</h1>
          <p className="text-[7px] md:text-sm font-medium text-muted-foreground uppercase opacity-50">Tồn kho</p>
        </div>
        <button onClick={openAdd} className="bg-primary text-white font-black px-3 md:px-6 py-1.5 md:py-3 rounded-lg md:rounded-2xl flex items-center gap-2 hover:bg-primary/90 transition-all uppercase tracking-widest text-[8px] md:text-xs shadow-md">
          <Plus className="w-3 h-3 md:w-4 md:h-4" /> THÊM MỚI
        </button>
      </div>

      <div className="flex-1 overflow-auto w-full">
        <div className="bg-white rounded-xl lg:rounded-[2rem] shadow-sm border border-black/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-50">Tên Nguyên Liệu</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-50">Tồn Kho</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-50">ĐVT</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-50">Giá Vốn</th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-50 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-black uppercase tracking-tight text-sm">{item.name}</td>
                  <td className="px-6 py-4 font-bold text-primary">{new Intl.NumberFormat("vi-VN").format(item.stock_quantity)}</td>
                  <td className="px-6 py-4 font-bold opacity-70">{item.unit}</td>
                  <td className="px-6 py-4 font-bold">{formatCurrency(item.unit_cost)}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button onClick={() => openRestock(item)} className="p-2 border rounded-xl hover:bg-primary hover:text-white hover:border-primary transition-all text-primary border-primary/20" title="Nhập kho">
                      <Package className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(item)} className="p-2 border rounded-xl hover:bg-black hover:text-white transition-all text-muted-foreground">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteIngredient(item.id)} className="p-2 border rounded-xl hover:bg-red-500 hover:text-white transition-all text-red-500 hover:border-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-[2rem] p-6 lg:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-6">{editingItem ? "Sửa Nguyên Liệu" : "Thêm Nguyên Liệu"}</h2>
            <form onSubmit={saveIngredient} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-2">Tên Nguyên Liệu</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-muted/30 border-2 rounded-xl px-4 py-3 font-semibold focus:border-primary transition-all outline-none" placeholder="VD: Bột Matcha" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-2">Đơn Vị Tính (ĐVT)</label>
                <input required value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-muted/30 border-2 rounded-xl px-4 py-3 font-semibold focus:border-primary transition-all outline-none" placeholder="VD: g, ml, ly, ống hút..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border-2 rounded-xl font-black uppercase text-xs hover:bg-muted transition-all">Huỷ</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-primary/90 transition-all">Lưu Lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Restock */}
      {isRestockModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-[2rem] p-6 lg:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Nhập kho</h2>
            <p className="text-sm font-bold text-primary mb-6">Nguyên liệu: {editingItem.name}</p>
            <form onSubmit={saveRestock} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-2">Số lượng nhập (Đơn vị: {editingItem.unit})</label>
                <input required type="number" min="1" value={restockQuantity} onChange={e => setRestockQuantity(e.target.value)} className="w-full bg-muted/30 border-2 rounded-xl px-4 py-3 font-semibold focus:border-primary transition-all outline-none" placeholder="VD: 1000" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-2">Tổng tiền thanh toán (VNĐ)</label>
                <input required type="number" min="0" value={restockTotalCost} onChange={e => setRestockTotalCost(e.target.value)} className="w-full bg-muted/30 border-2 rounded-xl px-4 py-3 font-semibold focus:border-primary transition-all outline-none" placeholder="VD: 500000" />
                <p className="text-[10px] opacity-50 mt-2 font-medium">Hệ thống sẽ tự động chia đều để tìm ra giá vốn/ĐVT.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsRestockModalOpen(false)} className="flex-1 py-3 border-2 rounded-xl font-black uppercase text-xs hover:bg-muted transition-all">Huỷ</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-primary/90 transition-all">Xác Nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

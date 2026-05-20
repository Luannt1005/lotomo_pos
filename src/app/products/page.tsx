"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Coffee, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { Product, Category, Size, Topping } from "@/types/database";
import { useAuthStore } from "@/store/auth";
import { supabase } from "@/lib/supabase";

export default function ProductsPage() {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';
  const [activeTab, setActiveTab] = useState<"products" | "toppings">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [allToppings, setAllToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isToppingModalOpen, setIsToppingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Product Form
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("matcha");
  const [availableSizes, setAvailableSizes] = useState<{ [key in Size]: { active: boolean; price: string } }>({
    S: { active: false, price: "" },
    M: { active: true, price: "" },
    L: { active: false, price: "" },
  });
  const [imageUrl, setImageUrl] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Topping Form
  const [toppingName, setToppingName] = useState("");
  const [toppingPrice, setToppingPrice] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await fetch("/api/products");
      const pData = await pRes.json();
      if (!pData.error) setProducts(pData);
      
      const tRes = await fetch("/api/toppings");
      const tData = await tRes.json();
      if (!tData.error) setAllToppings(tData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("Kích thước file quá lớn (tối đa 5MB)");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể upload ảnh lên server");
      }

      setImageUrl(data.url);
    } catch (err: any) {
      console.error("Error uploading image:", err);
      alert("Lỗi tải ảnh lên: " + (err.message || "Không rõ nguyên nhân"));
    } finally {
      setUploading(false);
    }
  };

  const openAddProduct = () => {
    setEditingItem(null);
    setName("");
    setCategory("matcha");
    setAvailableSizes({
      S: { active: false, price: "" },
      M: { active: true, price: "" },
      L: { active: false, price: "" },
    });
    setImageUrl("");
    setIsAvailable(true);
    setIsProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingItem(p);
    setName(p.name);
    setCategory(p.category);
    const sizesMap: any = { S: { active: false, price: "" }, M: { active: false, price: "" }, L: { active: false, price: "" } };
    p.sizes.forEach(s => { sizesMap[s.size] = { active: true, price: s.price.toString() }; });
    setAvailableSizes(sizesMap);
    setImageUrl(p.image_url || "");
    setIsAvailable(p.is_available);
    setIsProductModalOpen(true);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const sizes = Object.entries(availableSizes)
      .filter(([_, d]) => d.active)
      .map(([s, d]) => ({ size: s as Size, price: parseInt(d.price) || 0 }));

    if (sizes.length === 0) return alert("Chọn ít nhất 1 size");

    const payload = { name, category, sizes, image_url: imageUrl || null, is_available: isAvailable };
    const method = editingItem ? "PATCH" : "POST";
    const url = editingItem ? `/api/products/${editingItem.id}` : "/api/products";
    
    try {
      const res = await fetch(url, { method, body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      if (res.ok) { 
        setIsProductModalOpen(false); 
        fetchData(); 
      } else {
        const err = await res.json();
        alert("Lỗi khi lưu sản phẩm: " + (err.error || "Không xác định"));
      }
    } catch (e: any) {
      alert("Lỗi kết nối server: " + e.message);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm("Xoá sản phẩm này? Chú ý: Nếu sản phẩm đã từng có trong đơn hàng, bạn sẽ không thể xoá được để bảo toàn dữ liệu.")) {
      try {
        const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
        if (res.ok) {
           fetchData();
        } else {
           const err = await res.json();
           if (err.error?.includes("violates foreign key constraint")) {
              alert("Lỗi: Sản phẩm này đang có trong một đơn hàng cũ. Bạn không thể xoá sản phẩm này, nhưng có thể tắt 'Khả dụng' để ngừng bán.");
           } else {
              alert("Lỗi khi xoá: " + (err.error || "Không xác định"));
           }
        }
      } catch (e: any) {
        alert("Lỗi kết nối: " + e.message);
      }
    }
  };

  // Topping CRUD
  const openAddTopping = () => { setEditingItem(null); setToppingName(""); setToppingPrice(""); setIsToppingModalOpen(true); };
  const openEditTopping = (t: Topping) => { setEditingItem(t); setToppingName(t.name); setToppingPrice(t.price.toString()); setIsToppingModalOpen(true); };
  const saveTopping = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: toppingName, price: parseInt(toppingPrice) || 0 };
    const method = editingItem ? "PATCH" : "POST";
    const url = editingItem ? `/api/toppings/${editingItem.id}` : "/api/toppings";
    try {
      const res = await fetch(url, { method, body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      if (res.ok) { 
        setIsToppingModalOpen(false); 
        fetchData(); 
      } else {
        const err = await res.json();
        alert("Lỗi lưu topping: " + (err.error || "Không xác định"));
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + e.message);
    }
  };
  const deleteTopping = async (id: string) => {
    if (confirm("Xoá topping này?")) {
      await fetch(`/api/toppings/${id}`, { method: "DELETE" });
      fetchData();
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  return (
    <div className="p-2 md:p-6 h-full flex flex-col bg-muted/5">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm md:text-3xl font-black tracking-tighter uppercase">SẢN PHẨM</h1>
          <div className="flex gap-1">
            <button onClick={() => setActiveTab("products")} className={`px-2 py-0.5 rounded-md font-black text-[7px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === "products" ? "bg-primary text-white shadow-md" : "bg-white text-muted-foreground hover:bg-muted"}`}>Món</button>
            <button onClick={() => setActiveTab("toppings")} className={`px-2 py-0.5 rounded-md font-black text-[7px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === "toppings" ? "bg-primary text-white shadow-md" : "bg-white text-muted-foreground hover:bg-muted"}`}>Topping</button>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={activeTab === "products" ? openAddProduct : openAddTopping}
            className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 font-black uppercase text-[8px] md:text-xs tracking-widest shadow-md transition-all active:scale-95"
          >
            <Plus className="w-3 h-3 md:w-4 md:h-4" />
            THÊM
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-white border border-black/5 rounded-xl lg:rounded-[2.5rem] shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/10">
              <th className="p-2.5 md:p-4 lg:p-5 font-black text-muted-foreground uppercase text-[8px] lg:text-[9px] tracking-widest">{activeTab === "products" ? "Sản phẩm" : "Tên Topping"}</th>
              <th className="p-2.5 md:p-4 lg:p-5 font-black text-muted-foreground uppercase text-[8px] lg:text-[9px] tracking-widest">{activeTab === "products" ? "Phân loại" : "Đơn giá"}</th>
              {activeTab === "products" && <th className="p-2.5 md:p-4 lg:p-5 font-black text-muted-foreground uppercase text-[8px] lg:text-[9px] tracking-widest">Size & Giá</th>}
              {isAdmin && <th className="p-2.5 md:p-4 lg:p-5 font-black text-muted-foreground uppercase text-[8px] lg:text-[9px] tracking-widest text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-10 text-center font-black uppercase text-[10px] tracking-widest opacity-20 animate-pulse">Loading...</td></tr>
            ) : (activeTab === "products" ? products : allToppings).length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center font-black uppercase text-[10px] tracking-widest opacity-10">Empty</td></tr>
            ) : (
              (activeTab === "products" ? products : allToppings).map((item: any) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-primary/5 transition-all group">
                  <td className="p-2.5 md:p-4 lg:p-5">
                    <div className="flex items-center gap-2 md:gap-3">
                      {activeTab === "products" && (
                        item.image_url ? <img src={item.image_url} className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover border shadow-sm shrink-0" /> : <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-muted flex items-center justify-center text-primary/10 border shrink-0"><Coffee className="w-4 h-4 md:w-5 md:h-5"/></div>
                      )}
                      <span className="font-black text-xs md:text-sm tracking-tight uppercase">{item.name}</span>
                    </div>
                  </td>
                  <td className="p-2.5 md:p-4 lg:p-5 capitalize font-black text-[8px] md:text-[10px] tracking-widest text-muted-foreground">
                    {activeTab === "products" ? item.category : formatCurrency(item.price)}
                  </td>
                  {activeTab === "products" && (
                    <td className="p-2.5 md:p-4 lg:p-5">
                       <div className="flex flex-wrap gap-1">
                        {item.sizes.map((s: any, idx: number) => (
                          <div key={idx} className="bg-primary/5 text-primary px-1.5 py-0.5 rounded-md text-[7px] md:text-[9px] font-black uppercase tracking-tight whitespace-nowrap">
                            {s.size}: {formatCurrency(s.price)}
                          </div>
                        ))}
                      </div>
                    </td>
                  )}
                  {isAdmin && (
                    <td className="p-2.5 md:p-4 lg:p-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => activeTab === "products" ? openEditProduct(item) : openEditTopping(item)} className="p-1.5 md:p-2.5 bg-secondary text-secondary-foreground hover:bg-primary hover:text-white rounded-lg transition-all shadow-sm active:scale-95">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => activeTab === "products" ? deleteProduct(item.id) : deleteTopping(item.id)} className="p-1.5 md:p-2.5 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white rounded-lg transition-all shadow-sm active:scale-95">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-white animate-in zoom-in-95 max-h-[90vh] flex flex-col">
             <div className="p-6 border-b flex justify-between items-center bg-muted/10 shrink-0">
                <h2 className="text-2xl font-black tracking-tighter uppercase">{editingItem ? "Sửa món" : "Thêm món"}</h2>
                <button onClick={() => setIsProductModalOpen(false)} className="w-10 h-10 bg-muted hover:bg-destructive hover:text-white rounded-xl flex items-center justify-center transition-all">
                    <X className="w-5 h-5" />
                </button>
             </div>
             <form onSubmit={saveProduct} className="p-8 space-y-6 overflow-y-auto flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-1 gap-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Tên món</label>
                      <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-muted/20 focus:bg-white border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 py-3 outline-none font-black text-lg tracking-tight" placeholder="VD: MATCHA LATTE" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Phân loại</label>
                      <div className="flex gap-1.5">
                        {["matcha", "trà sữa", "trà"].map(cat => (
                            <button key={cat} type="button" onClick={() => setCategory(cat as any)} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border-2 transition-all ${category === cat ? "bg-primary text-white border-primary shadow-lg" : "bg-muted text-muted-foreground border-transparent hover:border-primary/10"}`}>{cat}</button>
                        ))}
                      </div>
                   </div>
                   <div className="space-y-4">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Size & Giá</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['S', 'M', 'L'] as Size[]).map(s => (
                            <div key={s} className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 ${availableSizes[s].active ? "border-primary bg-primary/5" : "border-transparent bg-muted/20 opacity-40"}`}>
                               <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setAvailableSizes(prev => ({ ...prev, [s]: { ...prev[s], active: !prev[s].active } }))} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${availableSizes[s].active ? "bg-primary text-white" : "bg-white border-2"}`}><Check className={`w-4 h-4 ${availableSizes[s].active ? "opacity-100" : "opacity-0"}`}/></button>
                                <span className="font-black text-sm">SIZE {s}</span>
                               </div>
                               <input disabled={!availableSizes[s].active} type="number" value={availableSizes[s].price} onChange={e => setAvailableSizes(prev => ({ ...prev, [s]: { ...prev[s], price: e.target.value } }))} className="w-full bg-white rounded-lg px-3 py-1.5 font-black text-sm outline-none" placeholder="Giá..." />
                            </div>
                        ))}
                      </div>
                   </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Hình ảnh sản phẩm</label>
                       <div className="flex flex-col sm:flex-row gap-4 items-center bg-muted/15 p-4 rounded-2xl border border-dashed border-black/10">
                          {/* Image Preview */}
                          <div className="relative w-24 h-24 rounded-2xl bg-muted flex items-center justify-center overflow-hidden border shrink-0">
                             {imageUrl ? (
                                <>
                                   <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                   <button 
                                      type="button" 
                                      onClick={() => setImageUrl("")} 
                                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center shadow-md active:scale-90 transition-all font-black text-xs"
                                      title="Xóa ảnh"
                                   >
                                      <X className="w-3.5 h-3.5" />
                                   </button>
                                </>
                             ) : (
                                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                             )}
                          </div>

                          {/* Upload controls */}
                          <div className="flex-1 w-full space-y-2">
                             <div className="relative">
                                <input 
                                   type="file" 
                                   accept="image/*" 
                                   onChange={handleImageUpload} 
                                   disabled={uploading}
                                   className="hidden" 
                                   id="product-image-upload" 
                                />
                                <label 
                                   htmlFor="product-image-upload"
                                   className={`flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed rounded-xl cursor-pointer font-black text-[10px] uppercase tracking-wider transition-all duration-300 ${
                                      uploading 
                                         ? "bg-muted border-muted-foreground/20 text-muted-foreground pointer-events-none" 
                                         : "bg-white border-primary/30 text-primary hover:bg-primary/5 hover:border-primary shadow-sm"
                                   }`}
                                >
                                   {uploading ? (
                                      <>
                                         <Loader2 className="w-4 h-4 animate-spin" />
                                         Đang tải lên...
                                      </>
                                   ) : (
                                      <>
                                         <Upload className="w-4 h-4" />
                                         Tải ảnh lên (Max 5MB)
                                      </>
                                   )}
                                </label>
                             </div>
                             
                             <div className="flex items-center gap-2">
                                <span className="text-[8px] font-bold uppercase opacity-30 tracking-widest shrink-0">Hoặc URL:</span>
                                <input 
                                   value={imageUrl} 
                                   onChange={e => setImageUrl(e.target.value)} 
                                   className="flex-1 bg-white focus:bg-white border border-black/10 focus:border-primary/20 rounded-lg px-2.5 py-1 outline-none font-medium text-[10px] text-muted-foreground truncate" 
                                   placeholder="https://..." 
                                />
                             </div>
                          </div>
                       </div>
                    </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-8 py-3 bg-muted rounded-xl font-black uppercase text-[10px] tracking-widest">Huỷ</button>
                    <button type="submit" className="px-12 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Lưu sản phẩm</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Topping Modal */}
      {isToppingModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-white animate-in zoom-in-95 max-h-[90vh] flex flex-col">
             <div className="p-6 border-b flex justify-between items-center bg-muted/10 shrink-0">
                <h2 className="text-xl font-black tracking-tighter uppercase">{editingItem ? "Sửa Topping" : "Thêm Topping"}</h2>
                <button onClick={() => setIsToppingModalOpen(false)} className="w-10 h-10 bg-muted hover:bg-destructive hover:text-white rounded-xl flex items-center justify-center transition-all"><X className="w-5 h-5"/></button>
             </div>
             <form onSubmit={saveTopping} className="p-8 space-y-6 overflow-y-auto flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Tên Topping</label>
                    <input required value={toppingName} onChange={e => setToppingName(e.target.value)} className="w-full bg-muted/20 focus:bg-white border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 py-3 outline-none font-black text-lg tracking-tight text-primary" placeholder="VD: TRÂN CHÂU" />
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Giá bán</label>
                    <input required type="number" value={toppingPrice} onChange={e => setToppingPrice(e.target.value)} className="w-full bg-muted/20 focus:bg-white border-2 border-transparent focus:border-primary/20 rounded-2xl px-5 py-3 outline-none font-black text-lg tracking-tight" placeholder="VD: 10000" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsToppingModalOpen(false)} className="px-8 py-3 bg-muted rounded-xl font-black uppercase text-[10px] tracking-widest">Huỷ</button>
                    <button type="submit" className="px-12 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Lưu</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Product, Size, SugarLevel, IceLevel, Topping, Discount, MilkType } from "@/types/database";
import { useCartStore } from "@/store/cart";
import { Plus, Minus, X, ShoppingCart, Coffee, CheckCircle2, Trash2, Check, Edit3, Tag } from "lucide-react";
import { getActiveDiscount, calculateDiscount } from "@/lib/discounts";

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allToppings, setAllToppings] = useState<Topping[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  
  const { items, addItem, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();
  
  // Customization Dialog State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [size, setSize] = useState<Size>("M");
  const [sugar, setSugar] = useState<SugarLevel>("100%");
  const [ice, setIce] = useState<IceLevel>("bình thường");
  const [milk, setMilk] = useState<MilkType>("sữa tươi");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [note, setNote] = useState("");
  
  // Checkout State
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"tiền mặt" | "chuyển khoản">("tiền mặt");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const activeDiscount = getActiveDiscount(discounts);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, tRes, dRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/toppings"),
        fetch("/api/discounts")
      ]);
      
      const pData = await pRes.json();
      const tData = await tRes.json();
      const dData = await dRes.json();
      
      if (!pData.error) setProducts(pData.filter((p: Product) => p.is_available));
      if (!tData.error) setAllToppings(tData);
      if (!dData.error) setDiscounts(dData);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const calculateUnitPrice = () => {
    if (!selectedProduct) return 0;
    const sizeData = selectedProduct.sizes.find(s => s.size === size);
    let price = sizeData ? sizeData.price : 0;
    if (selectedProduct.category === 'matcha' && (milk === 'sữa Oat' || milk === 'sữa Meiji')) price += 5000;
    selectedToppings.forEach(name => {
      const topping = allToppings.find(t => t.name === name);
      if (topping) price += topping.price;
    });
    return price;
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const unitPrice = calculateUnitPrice();
    const cartItemId = crypto.randomUUID();
    addItem({
      ...selectedProduct,
      cartItemId,
      quantity: 1,
      size,
      sugar,
      ice,
      milk: selectedProduct.category === 'matcha' ? milk : undefined,
      toppings: selectedToppings,
      unit_price: unitPrice,
      total_price: unitPrice,
      note: note || ""
    });
    setSelectedProduct(null);
    resetCustomization();
  };

  const resetCustomization = () => {
    setSize("M");
    setSugar("100%");
    setIce("bình thường");
    setMilk("sữa tươi");
    setSelectedToppings([]);
    setNote("");
  };

  useEffect(() => {
    if (selectedProduct) {
      if (!selectedProduct.sizes.find(s => s.size === "M")) { setSize(selectedProduct.sizes[0]?.size || "S"); } 
      else { setSize("M"); }
    }
  }, [selectedProduct]);

  const toggleTopping = (name: string) => {
    if (selectedToppings.includes(name)) { setSelectedToppings(prev => prev.filter(t => t !== name)); } 
    else { setSelectedToppings(prev => [...prev, name]); }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setIsCheckingOut(true);
    const subtotal = getTotal();
    const discountAmount = calculateDiscount(subtotal, activeDiscount);
    const totalAmount = subtotal - discountAmount;

    const orderItemsPayload = items.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      size: item.size,
      sugar: item.sugar,
      ice: item.ice,
      milk: item.milk,
      toppings: item.toppings,
      unit_price: item.unit_price,
      total_price: item.total_price,
      note: item.note,
      name: item.name 
    }));

    const payload = {
      total_amount: totalAmount,
      discount_amount: discountAmount, // Including it even if DB doesn't have it yet for future proofing
      status: "preparing",
      payment_method: paymentMethod,
      is_paid: true,
      paid_at: new Date().toISOString(),
      items: orderItemsPayload
    };

    try {
      const res = await fetch("/api/orders", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        clearCart();
        setIsCheckingOut(false);
        setIsCartOpen(false);
        setCheckoutNotice(true);
        setTimeout(() => setCheckoutNotice(false), 2000);
      }
    } catch (e) {
      alert("Thanh toán lỗi!");
      setIsCheckingOut(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  return (
    <div className="flex lg:flex-row flex-col h-full w-full bg-[#f8f9fa] overflow-hidden antialiased relative">
      {/* Products Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activeDiscount && (
          <div className="bg-primary/95 text-white py-2 px-6 flex items-center justify-center gap-3 animate-pulse border-b border-white/20">
            <Tag className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">{activeDiscount.label}</span>
          </div>
        )}
        <div className="p-3 lg:p-6 bg-white/50 backdrop-blur-xl border-b flex gap-2 lg:gap-3 overflow-x-auto no-scrollbar scroll-smooth">
          {["all", "matcha", "trà sữa", "trà trái cây"].map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 lg:px-10 py-2 lg:py-4 rounded-xl lg:rounded-[2rem] font-black text-[9px] lg:text-xs uppercase tracking-widest transition-all duration-500 border-2 shrink-0 ${activeCategory === cat ? "bg-primary text-white border-primary shadow-lg lg:shadow-2xl scale-105" : "bg-white text-muted-foreground border-transparent hover:border-black/5"}`}>{cat}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-primary/30"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1.5 md:gap-4 lg:gap-6">
              {products.filter(p => activeCategory === "all" || p.category === activeCategory).map((p) => (
                <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-white rounded-lg md:rounded-[2rem] lg:rounded-[2.5rem] p-1.5 md:p-4 lg:p-5 cursor-pointer hover:shadow-2xl transition-all duration-500 active:scale-95 flex flex-col items-center text-center shadow-sm border-2 border-transparent hover:border-primary/20">
                  <div className="w-full aspect-square mb-1 md:mb-3 lg:mb-4 rounded-md md:rounded-[1.5rem] lg:rounded-[2rem] bg-[#f1f3f5] flex items-center justify-center overflow-hidden"><Coffee className="w-4 h-4 md:w-10 md:h-10 lg:w-12 lg:h-12 text-primary/10" /></div>
                  <h3 className="font-black text-[7px] md:text-xs lg:text-sm uppercase tracking-tighter mb-0.5 lg:mb-2 line-clamp-2 leading-tight">{p.name}</h3>
                  <div className="mt-auto font-black text-primary text-[8px] md:text-sm lg:text-base">{formatCurrency(p.sizes[0]?.price || 0)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checkout Sidebar / Mobile Drawer Overlay */}
      <div className={`
        fixed inset-0 lg:static z-[90] lg:z-20 transition-all duration-500 lg:translate-x-0
        ${isCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
      `}>
          {/* Overlay for mobile */}
          <div className="lg:hidden absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          
          <div className="absolute right-0 top-0 bottom-0 lg:relative lg:w-[380px] w-full max-w-[280px] sm:max-w-sm lg:h-full h-full bg-white lg:shadow-[0_0_100px_rgba(0,0,0,0.05)] shadow-2xl border-l flex flex-col z-20">
             <div className="p-4 lg:p-8 border-b flex justify-between items-center bg-[#f8f9fa] lg:bg-white">
                <h2 className="text-lg lg:text-2xl font-black uppercase tracking-tighter flex items-center gap-2"><ShoppingCart className="w-4 h-4 lg:w-6 lg:h-6 text-primary" /> Cart ({items.length})</h2>
                <button onClick={() => setIsCartOpen(false)} className="lg:hidden w-8 h-8 bg-muted rounded-xl flex items-center justify-center font-bold text-xs shadow-sm">X</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-2 lg:p-6 space-y-2 lg:space-y-4">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 py-10 lg:py-40">
                        <ShoppingCart className="w-12 h-12 lg:w-20 lg:h-20 mb-2" />
                        <span className="font-black uppercase text-[10px] lg:text-xs">Empty</span>
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.cartItemId} className="bg-[#f8f9fa] rounded-[1rem] lg:rounded-[2rem] p-3 lg:p-5 space-y-2 lg:space-y-3">
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-1">
                                  <h4 className="font-black text-[10px] lg:text-sm uppercase tracking-tight leading-none">{item.name}</h4>
                                   <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-primary mt-1">
                                      {item.size}
                                      {item.milk && ` • ${item.milk}`}
                                      {item.sugar !== "100%" && ` • ${item.sugar} đ`}
                                      {item.ice !== "bình thường" && ` • ${item.ice} đá`}
                                   </p>
                                  {item.toppings.length > 0 && <p className="text-[7px] lg:text-[10px] italic text-muted-foreground mt-0.5 line-clamp-1">+ {item.toppings.join(", ")}</p>}
                                  {item.note && <p className="text-[7px] lg:text-[10px] bg-yellow-100 text-yellow-800 px-1 lg:px-2 py-[2px] rounded uppercase mt-1 font-bold flex items-center gap-1 w-fit"><Edit3 className="w-[8px] h-[8px]"/> {item.note}</p>}
                                </div>
                                <span className="font-black text-primary text-[10px] lg:text-sm tracking-tighter shrink-0">{formatCurrency(item.total_price)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-black/5">
                                <div className="flex items-center gap-2 bg-white px-1 py-0.5 lg:px-2 lg:py-1 rounded-lg lg:rounded-xl shadow-sm">
                                    <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-5 h-5 lg:w-7 lg:h-7 flex items-center justify-center bg-muted rounded-md lg:rounded-lg active:scale-90"><Minus className="w-2 h-2 lg:w-3 lg:h-3"/></button>
                                    <span className="font-black text-xs lg:text-sm">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-5 h-5 lg:w-7 lg:h-7 flex items-center justify-center bg-muted rounded-md lg:rounded-lg active:scale-90"><Plus className="w-2 h-2 lg:w-3 lg:h-3"/></button>
                                </div>
                                <button onClick={() => removeItem(item.cartItemId)} className="text-destructive hover:scale-110 p-1.5"><Trash2 className="w-4 h-4 lg:w-5 lg:h-5"/></button>
                            </div>
                        </div>
                    ))
                )}
             </div>

             <div className="p-4 lg:p-5 space-y-3 bg-white border-t rounded-t-[2rem] lg:rounded-t-[2.5rem] shadow-2xl">
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black uppercase opacity-30">Tạm tính</span>
                        <span className="text-sm font-black text-foreground/80">{formatCurrency(getTotal())}</span>
                    </div>
                    {calculateDiscount(getTotal(), activeDiscount) > 0 && (
                        <div className="flex justify-between items-center text-red-500 tracking-tighter px-1">
                            <span className="text-[10px] font-black uppercase flex items-center gap-1.5"><Tag className="w-3 h-3"/> Giảm giá</span>
                            <span className="text-sm font-black">-{formatCurrency(calculateDiscount(getTotal(), activeDiscount))}</span>
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-center font-black pt-2 border-t border-black/5 px-1">
                    <span className="text-[8px] font-black uppercase opacity-30">Tổng cộng</span>
                    <span className="text-xl lg:text-2xl text-primary tracking-tighter">{formatCurrency(getTotal() - calculateDiscount(getTotal(), activeDiscount))}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   {["tiền mặt", "chuyển khoản"].map(m => (
                       <button key={m} onClick={() => setPaymentMethod(m as any)} className={`py-2 rounded-xl font-black uppercase text-[8px] lg:text-[9px] tracking-widest border-2 transition-all ${paymentMethod === m ? "bg-primary text-white border-primary shadow-md" : "bg-muted text-muted-foreground border-transparent"}`}>{m}</button>
                   ))}
                </div>
                <button disabled={items.length === 0 || isCheckingOut} onClick={handleCheckout} className="w-full bg-primary text-white py-3 lg:py-4 rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-30">
                    {isCheckingOut ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div> : "Thanh Toán"}
                </button>
             </div>
          </div>
      </div>

      {/* Floating Action Button for mobile cart */}
      <button 
        onClick={() => setIsCartOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-[80] bg-primary text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center animate-bounce duration-1000"
      >
          <div className="relative">
             <ShoppingCart className="w-6 h-6"/>
             {items.length > 0 && (
                <span className="absolute -top-3 -right-3 bg-red-500 text-[10px] font-black w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                   {items.length}
                </span>
             )}
          </div>
      </button>

      {checkoutNotice && (
        <div className="fixed top-6 lg:top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10">
            <div className="bg-primary text-white px-6 lg:px-8 py-2.5 lg:py-3 rounded-full flex items-center gap-3 font-black uppercase text-[9px] lg:text-[10px] tracking-widest shadow-2xl border-4 border-white"><CheckCircle2 className="w-5 h-5"/> ORDERED!</div>
        </div>
      )}

      {/* Responsive Customization Dialog */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-1 lg:p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-[420px] rounded-2xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[98vh] border-[1px] lg:border-[4px] border-white animate-in zoom-in-95 duration-500">
              <div className="px-3 py-2 lg:px-6 lg:py-4 border-b flex justify-between items-center bg-[#f8f9fa]">
                 <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-primary"/>
                    <div>
                        <h2 className="text-[14px] lg:text-lg font-black uppercase tracking-tight leading-none line-clamp-1">{selectedProduct.name}</h2>
                        <span className="font-black text-primary text-[11px] lg:text-sm tracking-tighter">{formatCurrency(calculateUnitPrice())}</span>
                    </div>
                 </div>
                 <button onClick={() => setSelectedProduct(null)} className="w-8 h-8 bg-muted hover:bg-destructive hover:text-white rounded-lg flex items-center justify-center transition-all font-black text-xs">X</button>
              </div>

              <div className="flex-1 px-3 py-2 lg:p-6 space-y-2 lg:space-y-4 overflow-y-auto no-scrollbar">
                 {/* Row 1: Size */}
                 <div className="flex items-center gap-3">
                    <label className="text-[7px] lg:text-[9px] font-black uppercase tracking-widest opacity-40 w-10 lg:w-12 shrink-0 text-left">Size</label>
                    <div className="flex-1 grid grid-cols-3 gap-1.5 lg:gap-2">
                        {selectedProduct.sizes.map(s => (
                            <button key={s.size} onClick={() => setSize(s.size)} className={`py-1 lg:py-1.5 rounded-lg border-2 font-black transition-all text-[8px] lg:text-[10px] uppercase ${size === s.size ? "bg-primary text-white border-primary shadow-sm" : "bg-muted border-transparent text-muted-foreground"}`}>{s.size}</button>
                        ))}
                    </div>
                 </div>

                 {/* Row 2: Đường */}
                 <div className="flex items-center gap-3">
                    <label className="text-[7px] lg:text-[9px] font-black uppercase tracking-widest opacity-40 w-10 lg:w-12 shrink-0 text-left">Đường</label>
                    <div className="flex-1 grid grid-cols-3 gap-1.5 lg:gap-2">
                        {(['0%', '50%', '100%'] as SugarLevel[]).map(s => (
                            <button key={s} onClick={() => setSugar(s)} className={`py-1 lg:py-1.5 rounded-lg border-2 font-black uppercase text-[8px] lg:text-[10px] tracking-widest transition-all ${sugar === s ? "bg-primary text-white border-primary shadow-sm" : "bg-muted border-transparent text-muted-foreground"}`}>{s}</button>
                        ))}
                    </div>
                 </div>

                 {/* Row 3: Đá */}
                 <div className="flex items-center gap-3">
                    <label className="text-[7px] lg:text-[9px] font-black uppercase tracking-widest opacity-40 w-10 lg:w-12 shrink-0 text-left">Đá</label>
                    <div className="flex-1 grid grid-cols-3 gap-1.5 lg:gap-2">
                        {(['không đá', 'ít đá', 'bình thường'] as IceLevel[]).map(i => (
                            <button key={i} onClick={() => setIce(i)} className={`py-1 lg:py-1.5 rounded-lg border-2 font-black uppercase text-[7px] lg:text-[10px] tracking-tighter transition-all ${ice === i ? "bg-primary text-white border-primary shadow-sm" : "bg-muted border-transparent text-muted-foreground"}`}>
                              {i === 'không đá' ? 'Không' : i === 'ít đá' ? 'Ít' : 'Thường'}
                            </button>
                        ))}
                    </div>
                 </div>

                 {/* Row 4: Sữa (Optional) */}
                 {selectedProduct.category === 'matcha' && (
                  <div className="flex items-center gap-3 animate-in slide-in-from-left-2">
                      <label className="text-[7px] lg:text-[9px] font-black uppercase tracking-widest opacity-40 w-10 lg:w-12 shrink-0 text-left">Sữa (+5K)</label>
                      <div className="flex-1 grid grid-cols-3 gap-1.5 lg:gap-2">
                          {(['sữa tươi', 'sữa Oat', 'sữa Meiji'] as MilkType[]).map(m => (
                              <button key={m} onClick={() => setMilk(m)} className={`py-1 lg:py-1.5 rounded-lg border-2 font-black uppercase text-[7px] lg:text-[10px] tracking-tighter transition-all ${milk === m ? "bg-primary text-white border-primary shadow-sm" : "bg-muted border-transparent text-muted-foreground"}`}>
                                {m === 'sữa tươi' ? 'Tươi' : m === 'sữa Oat' ? 'Oat' : 'Meiji'}
                              </button>
                          ))}
                      </div>
                  </div>
                 )}

                 {/* Toppings Section */}
                 <div className="space-y-1">
                    <label className="text-[7px] lg:text-[9px] font-black uppercase tracking-widest opacity-40">Toppings</label>
                    <div className="grid grid-cols-2 gap-1 lg:gap-2 max-h-[90px] lg:max-h-[120px] overflow-y-auto no-scrollbar pr-1 bg-[#f8f9fa] p-1.5 lg:p-2 rounded-xl border border-black/5">
                        {allToppings.map(t => (
                            <button key={t.id} onClick={() => toggleTopping(t.name)} className={`p-1.5 lg:p-2 rounded-lg lg:rounded-xl border-2 flex justify-between items-center transition-all ${selectedToppings.includes(t.name) ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-white border-transparent text-muted-foreground opacity-70"}`}>
                                <span className="font-black uppercase text-[7px] lg:text-[9px] tracking-tight line-clamp-1">{t.name}</span>
                                <Check className={`w-2.5 h-2.5 ${selectedToppings.includes(t.name) ? "opacity-100" : "opacity-0"}`} />
                            </button>
                        ))}
                    </div>
                 </div>

                 {/* Note */}
                 <div className="space-y-1">
                    <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full bg-[#f8f9fa] border-2 border-transparent focus:border-primary/20 rounded-xl p-1.5 lg:p-2 outline-none font-bold text-[10px] lg:text-xs h-8 lg:h-12 resize-none" placeholder="Ghi chú..."></textarea>
                 </div>
              </div>

              <div className="p-3 lg:p-6 border-t bg-[#f8f9fa] flex items-center justify-between">
                  <div className="flex flex-col leading-none"><span className="text-[7px] font-black opacity-30 uppercase tracking-widest">Tạm tính</span><span className="text-sm lg:text-3xl font-black text-primary tracking-tighter">{formatCurrency(calculateUnitPrice())}</span></div>
                  <button onClick={handleAddToCart} className="px-5 lg:px-10 py-2.5 lg:py-4 bg-primary text-white rounded-xl font-black uppercase text-[10px] lg:text-xs tracking-widest shadow-xl active:scale-95 transition-all">THÊM MÓN</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

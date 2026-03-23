"use client";

import { useEffect, useState } from "react";
import { Product, Size, SugarLevel, IceLevel, Topping } from "@/types/database";
import { useCartStore } from "@/store/cart";
import { Plus, Minus, X, ShoppingCart, Coffee, CheckCircle2, Trash2, Check, Edit3 } from "lucide-react";

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allToppings, setAllToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  
  const { items, addItem, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();
  
  // Customization Dialog State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [size, setSize] = useState<Size>("M");
  const [sugar, setSugar] = useState<SugarLevel>("100%");
  const [ice, setIce] = useState<IceLevel>("bình thường");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [note, setNote] = useState("");
  
  // Checkout State
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"tiền mặt" | "chuyển khoản">("tiền mặt");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await fetch("/api/products");
      const pData = await pRes.json();
      if (!pData.error) setProducts(pData.filter((p: Product) => p.is_available));
      
      const tRes = await fetch("/api/toppings");
      const tData = await tRes.json();
      if (!tData.error) setAllToppings(tData);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const calculateUnitPrice = () => {
    if (!selectedProduct) return 0;
    const sizeData = selectedProduct.sizes.find(s => s.size === size);
    let price = sizeData ? sizeData.price : 0;
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

  // --- Improved Printing Logic for Xprinter 365B ---
  const printLabels = (orderItems: any[]) => {
    // 1. Create a hidden iframe for clean printing
    const frameId = 'print-frame';
    let frame = document.getElementById(frameId) as HTMLIFrameElement;
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = frameId;
      frame.style.display = 'none';
      document.body.appendChild(frame);
    }

    const doc = frame.contentWindow?.document;
    if (!doc) return;

    const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    let labelsHtml = '';

    orderItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        labelsHtml += `
          <div class="label">
            <div class="header">
              <span class="shop">LOTOMO TEA</span>
              <span class="time">${now}</span>
            </div>
            <div class="product-name">${item.name} (${item.size})</div>
            <div class="options">
              ${item.sugar} Đường - ${item.ice} Đá
            </div>
            ${item.toppings.length > 0 ? `<div class="toppings">Top: ${item.toppings.join(', ')}</div>` : ''}
            ${item.note ? `<div class="note">Ghi chú: ${item.note}</div>` : ''}
            <div class="footer">
               <span>Số: ${i + 1}/${item.quantity}</span>
               <span>Đơn: #${item.order_id?.slice(-4).toUpperCase() || 'POS'}</span>
            </div>
          </div>
        `;
      }
    });

    const style = `
      <style>
        @page { 
          size: 50mm 30mm; 
          margin: 0; 
        }
        @media print {
          html, body { margin: 0; padding: 0; }
          /* Suppress browser headers/footers */
          header, footer { display: none !important; }
        }
        body { 
          margin: 0; 
          padding: 0; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          -webkit-print-color-adjust: exact;
        }
        .label { 
          width: 50mm; 
          height: 30mm; 
          padding: 1.5mm 3mm; 
          box-sizing: border-box; 
          display: flex; 
          flex-direction: column; 
          page-break-after: always;
          overflow: hidden;
          background: white;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          border-bottom: 0.1mm solid #000; 
          padding-bottom: 0.4mm; 
          margin-bottom: 0.8mm; 
        }
        .shop { font-size: 6.5pt; font-weight: 900; letter-spacing: 0.5px; }
        .time { font-size: 5.5pt; font-weight: 500; opacity: 0.7; }
        .product-name { 
          font-size: 10.5pt; 
          font-weight: 900; 
          text-transform: uppercase; 
          margin-bottom: 0.5mm;
          line-height: 1.1;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .options { font-size: 7.5pt; font-weight: 700; margin-bottom: 0.3mm; }
        .toppings { 
          font-size: 6.5pt; 
          font-weight: 500;
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
          opacity: 0.8;
        }
        .note { 
          font-size: 6.5pt; 
          font-style: italic;
          background: #f0f0f0; 
          padding: 0.3mm 0.8mm; 
          border-radius: 0.4mm; 
          margin-top: 0.8mm;
          line-height: 1.1;
        }
        .footer { 
          margin-top: auto; 
          font-size: 5.5pt; 
          font-weight: 700;
          display: flex; 
          justify-content: space-between; 
          color: #333;
          border-top: 0.1mm dashed #ccc;
          padding-top: 0.5mm;
        }
      </style>
    `;

    doc.open();
    doc.write(`<html><head>${style}</head><body>${labelsHtml}</body></html>`);
    doc.close();

    // Trigger print
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    }, 500);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setIsCheckingOut(true);
    const totalAmount = getTotal();
    const orderItemsPayload = items.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      size: item.size,
      sugar: item.sugar,
      ice: item.ice,
      toppings: item.toppings,
      unit_price: item.unit_price,
      total_price: item.total_price,
      note: item.note,
      name: item.name // Added for label printing
    }));

    const payload = {
      total_amount: totalAmount,
      status: "preparing",
      payment_method: paymentMethod,
      is_paid: true,
      paid_at: new Date().toISOString(),
      items: orderItemsPayload
    };

    try {
      const res = await fetch("/api/orders", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      const orderData = await res.json();
      
      if (res.ok) {
        // Trigger label printing
        printLabels(orderItemsPayload.map(i => ({ ...i, order_id: orderData.id })));
        
        clearCart();
        setIsCheckingOut(false);
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
    <div className="flex h-full w-full bg-[#f8f9fa] overflow-hidden antialiased">
      {/* Products Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-6 bg-white/50 backdrop-blur-xl border-b flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
          {["all", "matcha", "trà sữa", "cà phê"].map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-10 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all duration-500 border-2 ${activeCategory === cat ? "bg-primary text-white border-primary shadow-2xl scale-105" : "bg-white text-muted-foreground border-transparent hover:border-black/5"}`}>{cat}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-primary/30"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {products.filter(p => activeCategory === "all" || p.category === activeCategory).map((p) => (
                <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-white rounded-[2.5rem] p-5 cursor-pointer hover:shadow-2xl transition-all duration-500 active:scale-95 flex flex-col items-center text-center shadow-sm border-2 border-transparent hover:border-primary/20">
                  <div className="w-full aspect-square mb-4 rounded-[2rem] bg-[#f1f3f5] flex items-center justify-center overflow-hidden"><Coffee className="w-12 h-12 text-primary/10" /></div>
                  <h3 className="font-black text-sm uppercase tracking-tighter mb-2">{p.name}</h3>
                  <div className="mt-auto font-black text-primary">{formatCurrency(p.sizes[0]?.price || 0)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checkout Sidebar */}
      <div className="w-[380px] flex flex-col h-full bg-white shadow-[0_0_100px_rgba(0,0,0,0.05)] border-l z-20">
         <div className="p-8 border-b">
            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><ShoppingCart className="w-6 h-6 text-primary" /> Cart ({items.length})</h2>
         </div>
         
         <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10 py-40">
                    <ShoppingCart className="w-20 h-20 mb-4" />
                    <span className="font-black uppercase text-xs">Empty</span>
                </div>
            ) : (
                items.map(item => (
                    <div key={item.cartItemId} className="bg-[#f8f9fa] rounded-[2rem] p-5 space-y-3 animate-in fade-in slide-in-from-right-4">
                        <div className="flex justify-between items-start">
                           <div>
                              <h4 className="font-black text-sm uppercase tracking-tight">{item.name}</h4>
                              <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">{item.size} • {item.sugar} đường • {item.ice} đá</p>
                              {item.toppings.length > 0 && <p className="text-[10px] italic text-muted-foreground mt-1 line-clamp-1">+ {item.toppings.join(", ")}</p>}
                              {item.note && <p className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-md mt-2 font-bold flex items-center gap-1 w-fit"><Edit3 className="w-2 h-2"/> {item.note}</p>}
                           </div>
                           <span className="font-black text-primary text-sm tracking-tighter shrink-0">{formatCurrency(item.total_price)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-black/5">
                            <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl shadow-sm">
                                <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-7 h-7 flex items-center justify-center bg-muted rounded-lg active:scale-90"><Minus className="w-3 h-3"/></button>
                                <span className="font-black">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-7 h-7 flex items-center justify-center bg-muted rounded-lg active:scale-90"><Plus className="w-3 h-3"/></button>
                            </div>
                            <button onClick={() => removeItem(item.cartItemId)} className="text-destructive hover:scale-110 p-2"><Trash2 className="w-5 h-5"/></button>
                        </div>
                    </div>
                ))
            )}
         </div>

         <div className="p-8 space-y-6 bg-white border-t rounded-t-[3rem] shadow-2xl">
            <div className="flex justify-between items-center font-black">
                <span className="text-[10px] font-black uppercase opacity-30">Total</span>
                <span className="text-3xl text-primary tracking-tighter">{formatCurrency(getTotal())}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
               {["tiền mặt", "chuyển khoản"].map(m => (
                   <button key={m} onClick={() => setPaymentMethod(m as any)} className={`py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 transition-all ${paymentMethod === m ? "bg-primary text-white border-primary shadow-lg" : "bg-muted text-muted-foreground border-transparent"}`}>{m}</button>
               ))}
            </div>
            <button disabled={items.length === 0 || isCheckingOut} onClick={handleCheckout} className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all disabled:opacity-30">
                {isCheckingOut ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div> : "Thanh Toán"}
            </button>
         </div>
      </div>

      {checkoutNotice && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10">
            <div className="bg-primary text-white px-8 py-3 rounded-full flex items-center gap-3 font-black uppercase text-[10px] tracking-widest shadow-2xl border-4 border-white"><CheckCircle2 className="w-5 h-5"/> ORDERED!</div>
        </div>
      )}

      {/* Anti-Scroll Vertical Customization Dialog */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-[460px] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[96vh] border-[4px] border-white animate-in zoom-in-95 duration-500">
              <div className="px-6 py-4 border-b flex justify-between items-center bg-[#f8f9fa]">
                 <div className="flex items-center gap-3">
                    <Coffee className="w-5 h-5 text-primary"/>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight leading-none">{selectedProduct.name}</h2>
                        <span className="font-black text-primary text-sm tracking-tighter">{formatCurrency(calculateUnitPrice())}</span>
                    </div>
                 </div>
                 <button onClick={() => setSelectedProduct(null)} className="w-8 h-8 bg-muted hover:bg-destructive hover:text-white rounded-lg flex items-center justify-center transition-all font-bold">X</button>
              </div>

              <div className="flex-1 p-6 space-y-4 overflow-hidden">
                 <div className="flex items-center gap-4">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-30 w-12">Size</label>
                    <div className="flex-1 grid grid-cols-3 gap-1.5">
                        {selectedProduct.sizes.map(s => (
                            <button key={s.size} onClick={() => setSize(s.size)} className={`py-2 rounded-xl border-2 font-black transition-all text-[10px] uppercase ${size === s.size ? "bg-primary text-white border-primary shadow-md" : "bg-muted border-transparent text-muted-foreground"}`}>{s.size}</button>
                        ))}
                    </div>
                 </div>

                 <div className="flex items-center gap-4">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-30 w-12">Đường</label>
                    <div className="flex-1 grid grid-cols-3 gap-1.5">
                        {(['0%', '50%', '100%'] as SugarLevel[]).map(s => (
                            <button key={s} onClick={() => setSugar(s)} className={`py-2 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${sugar === s ? "bg-primary text-white border-primary shadow-sm" : "bg-muted border-transparent text-muted-foreground"}`}>{s}</button>
                        ))}
                    </div>
                 </div>

                 <div className="flex items-center gap-4">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-30 w-12">Đá</label>
                    <div className="flex-1 grid grid-cols-3 gap-1.5">
                        {(['không đá', 'ít đá', 'bình thường'] as IceLevel[]).map(i => (
                            <button key={i} onClick={() => setIce(i)} className={`py-2 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${ice === i ? "bg-primary text-white border-primary shadow-sm" : "bg-muted border-transparent text-muted-foreground"}`}>{i}</button>
                        ))}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-30">Toppings</label>
                    <div className="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto no-scrollbar pr-1 bg-[#f8f9fa] p-2 rounded-2xl border border-black/5">
                        {allToppings.map(t => (
                            <button key={t.id} onClick={() => toggleTopping(t.name)} className={`p-2.5 rounded-xl border-2 flex justify-between items-center transition-all ${selectedToppings.includes(t.name) ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-white border-transparent text-muted-foreground opacity-70"}`}>
                                <span className="font-black uppercase text-[8px] tracking-tight">{t.name}</span>
                                <Check className={`w-3 h-3 ${selectedToppings.includes(t.name) ? "opacity-100" : "opacity-0"}`} />
                            </button>
                        ))}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full bg-[#f8f9fa] border-2 border-transparent focus:border-primary/20 rounded-2xl p-3 outline-none font-bold text-xs h-12 resize-none" placeholder="Ghi chú..."></textarea>
                 </div>
              </div>

              <div className="p-6 border-t bg-[#f8f9fa] flex items-center justify-between">
                  <div className="flex flex-col leading-none"><span className="text-[8px] font-black opacity-30 uppercase tracking-widest">Tạm tính</span><span className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(calculateUnitPrice())}</span></div>
                  <button onClick={handleAddToCart} className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">THÊM MÓN</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

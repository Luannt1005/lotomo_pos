"use client";

import { useEffect, useState } from "react";
import { Order, OrderItem, Product, OrderStatus } from "@/types/database";
import { CheckCircle2, PlayCircle, Eye, RefreshCw, MessageSquare, Check, Loader2 } from "lucide-react";

type OrderWithItems = Order & {
  order_items: (OrderItem & { products: Pick<Product, 'name'> })[];
};

export default function ManageOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("preparing");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  
  // Modal for extra details/actions
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(false), 30000);
    return () => clearInterval(interval);
  }, [dateFilter]); // Refetch when date changes

  const fetchOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const url = dateFilter ? `/api/orders?date=${dateFilter}` : "/api/orders";
      const res = await fetch(url);
      const data = await res.json();
      if (!data.error) setOrders(data);
    } catch (e) {}
    if (showLoading) setLoading(false);
  };

  const filteredOrders = orders.filter(o => {
    const statusMatch = statusFilter === "all" || o.status === statusFilter;
    return statusMatch;
  });

  const updateItemStatus = async (itemId: string, newStatus: OrderStatus, orderId: string) => {
    try {
      await fetch(`/api/order_items/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
          headers: { "Content-Type": "application/json" }
      });
      // Update local state
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            order_items: o.order_items.map(i => i.id === itemId ? { ...i, status: newStatus } : i)
          };
        }
        return o;
      }));
    } catch (e) {}
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
          headers: { "Content-Type": "application/json" }
      });
      fetchOrders(false);
    } catch (e) {}
  };

  const markAllItemsDone = async (order: OrderWithItems) => {
    try {
      // Update all items in DB
      await Promise.all(order.order_items.map(item => 
        fetch(`/api/order_items/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: 'done' }),
          headers: { "Content-Type": "application/json" }
        })
      ));
      
      // Also update the order status to done
      await updateOrderStatus(order.id, 'done');
    } catch (e) {}
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  const formatDate = (isoString: string) => new Intl.DateTimeFormat("vi-VN", { hour: '2-digit', minute: '2-digit' }).format(new Date(isoString));

  return (
    <div className="p-2 md:p-6 h-full flex flex-col bg-muted/5">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
          <div className="flex items-center gap-3">
            <h1 className="text-sm md:text-3xl font-black uppercase tracking-tighter">PHA CHẾ</h1>
            <div className="flex gap-1">
              {[ "preparing", "done", "all"].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setStatusFilter(s as any)}
                    className={`px-2 py-0.5 rounded-md font-black uppercase text-[7px] tracking-widest transition-all ${statusFilter === s ? "bg-primary text-white" : "bg-white text-muted-foreground"}`}
                  >
                    {s === "all" ? "Tất cả" : s === "preparing" ? "Làm" : "Xong"}
                  </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-lg border border-black/5 self-start">
             <label className="text-[7px] font-black uppercase opacity-30 tracking-widest">Ngày:</label>
             <input 
                type="date" 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent font-black text-[9px] outline-none cursor-pointer"
             />
          </div>
        </div>
        <button onClick={() => fetchOrders()} className="p-2 bg-white text-primary rounded-xl shadow-md hover:rotate-180 transition-all border border-black/5 shrink-0"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-auto bg-white border border-black/5 rounded-2xl lg:rounded-[2.5rem] shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-muted/10 z-10">
            <tr className="border-b">
              <th className="p-3 lg:p-6 font-black text-muted-foreground uppercase text-[8px] lg:text-[9px] tracking-widest">Thời gian</th>
              <th className="p-3 lg:p-6 font-black text-muted-foreground uppercase text-[8px] lg:text-[9px] tracking-widest">Sản phẩm</th>
              <th className="p-3 lg:p-6 font-black text-muted-foreground uppercase text-[8px] lg:text-[9px] tracking-widest text-center">Tổng Tiền</th>
              <th className="p-3 lg:p-6 font-black text-muted-foreground uppercase text-[8px] lg:text-[9px] tracking-widest text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-10 text-center font-black uppercase text-[10px] opacity-20 animate-pulse">Loading orders...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={4} className="p-10 text-center font-black uppercase text-[10px] opacity-10">Empty</td></tr>
            ) : (
              filteredOrders.map((o) => (
                <tr key={o.id} className={`border-b group transition-all ${o.status === 'done' ? 'bg-muted/5' : 'bg-white'}`}>
                  <td className="p-2 lg:p-6 align-top whitespace-nowrap">
                    <div className="font-black text-[9px] lg:text-lg leading-tight uppercase">{formatDate(o.created_at)}</div>
                    <div className="text-[6px] lg:text-[8px] font-black text-muted-foreground opacity-40">#{o.id.slice(-6).toUpperCase()}</div>
                  </td>
                  <td className="p-2 lg:p-6">
                    <div className="space-y-1 lg:space-y-3">
                       {o.order_items.map(item => (
                          <div key={item.id} className={`flex items-start gap-2 lg:gap-4 p-2 lg:p-3 rounded-xl lg:rounded-2xl transition-all border ${item.status === 'done' ? 'bg-green-50/20 border-green-50/50 opacity-40' : 'bg-muted/10 border-transparent'}`}>
                             <button 
                                onClick={() => updateItemStatus(item.id, item.status === 'done' ? 'preparing' : 'done', o.id)}
                                className={`shrink-0 w-6 h-6 lg:w-8 lg:h-8 rounded-md lg:rounded-lg flex items-center justify-center transition-all shadow-sm lg:shadow-md ${item.status === 'done' ? 'bg-green-500 text-white' : 'bg-white text-muted-foreground border active:scale-90'}`}
                             >
                                {item.status === 'done' ? <Check className="w-3 h-3 lg:w-5 lg:h-5 stroke-[4]"/> : <div className="w-2 h-2 lg:w-3 lg:h-3 border-2 rounded-full border-primary/20"/>}
                             </button>
                             <div className="flex-1 min-w-0">
                                <h4 className={`font-black uppercase tracking-tight text-[8px] lg:text-sm line-clamp-2 ${item.status === 'done' ? 'line-through' : ''}`}>
                                   <span className="text-primary font-black mr-1 lg:mr-2 bg-primary/10 px-1 py-0.5 rounded text-[7px] lg:text-[10px]">{item.quantity}x</span>
                                   {item.products?.name} 
                                </h4>
                                <p className="text-[6px] lg:text-[8px] font-black opacity-30 mt-0.5 tracking-widest leading-tight">
                                    {item.size}
                                    {item.milk && ` • ${item.milk}`}
                                    {item.sugar !== "100%" && ` • ${item.sugar} đ`}
                                    {item.ice !== "bình thường" && ` • ${item.ice} đá`}
                                 </p>
                                {item.toppings && item.toppings.length > 0 && (
                                   <div className="mt-1 text-[6px] lg:text-[8px] font-black text-primary/80 uppercase bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded inline-block tracking-tight">
                                      + {item.toppings.join(", ")}
                                   </div>
                                )}
                                {item.note && <div className="mt-1 text-[6px] lg:text-[8px] text-yellow-800 font-bold bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-100 italic line-clamp-1">Note: {item.note}</div>}
                             </div>
                          </div>
                       ))}
                    </div>
                  </td>
                  <td className="p-3 lg:p-6 align-top text-center">
                    <div className="font-black text-[10px] lg:text-xl text-primary tracking-tighter">{formatCurrency(o.total_amount)}</div>
                    <div className={`mt-1 lg:mt-2 inline-flex items-center gap-1.5 px-2 lg:px-3 py-0.5 lg:py-1 rounded-md lg:rounded-lg text-[6px] lg:text-[8px] font-black uppercase tracking-widest ${o.status === 'preparing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {o.status === 'preparing' ? <PlayCircle className="w-2 h-2 lg:w-2.5 lg:h-2.5 animate-spin-slow"/> : <CheckCircle2 className="w-2 h-2 lg:w-2.5 lg:h-2.5"/>}
                      {o.status === 'preparing' ? "Làm" : "Xong"}
                    </div>
                  </td>
                  <td className="p-3 lg:p-6 align-top text-right">
                    <div className="flex flex-col gap-1.5 lg:gap-2 items-end">
                       <button onClick={() => setSelectedOrder(o)} className="p-2 lg:p-3 bg-secondary text-secondary-foreground hover:bg-primary hover:text-white rounded-lg lg:rounded-xl transition-all shadow-sm lg:shadow-md active:scale-95"><Eye className="w-3 h-3 lg:w-5 lg:h-5"/></button>
                       {o.status === 'preparing' && (
                          <button onClick={() => markAllItemsDone(o)} className="p-2 lg:p-3 bg-green-500 text-white hover:bg-green-600 rounded-lg lg:rounded-xl transition-all shadow-sm lg:shadow-lg active:scale-95"><CheckCircle2 className="w-3 h-3 lg:w-5 lg:h-5"/></button>
                       )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Simplified Modal just for reference */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border-4 border-white">
              <div className="p-6 border-b flex justify-between items-center bg-muted/10">
                 <h2 className="text-xl font-black uppercase tracking-tighter">Chi tiết đơn</h2>
                 <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 bg-muted hover:bg-destructive hover:text-white rounded-xl flex items-center justify-center transition-all font-bold">X</button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
                    {selectedOrder.order_items.map(item => (
                       <div key={item.id} className="flex justify-between items-start text-sm border-b border-black/5 pb-2 last:border-b-0 last:pb-0">
                          <div className="flex-1">
                             <div>
                                <span className="font-black opacity-30 mr-2">{item.quantity}x</span>
                                <span className="font-black uppercase">{item.products?.name}</span>
                             </div>
                             <div className="text-[8px] font-black opacity-45 uppercase tracking-wider mt-0.5 flex flex-wrap gap-1 items-center">
                                <span>{item.size}</span>
                                {item.milk && <span>• {item.milk}</span>}
                                {item.sugar !== "100%" && <span>• {item.sugar} đường</span>}
                                {item.ice !== "bình thường" && <span>• {item.ice}</span>}
                             </div>
                             {item.toppings && item.toppings.length > 0 && (
                                <div className="text-[8px] font-black text-primary uppercase tracking-tight mt-1">
                                   + {item.toppings.join(", ")}
                                </div>
                             )}
                             {item.note && (
                                <div className="text-[8px] text-yellow-800 font-bold bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100 italic mt-1 inline-block">
                                   Ghi chú: {item.note}
                                </div>
                             )}
                          </div>
                          <span className="font-black whitespace-nowrap ml-2">{formatCurrency(item.total_price)}</span>
                       </div>
                    ))}
                 </div>
                 <div className="pt-4 border-t flex justify-between items-end">
                    <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">TỔNG CỘNG</span>
                    <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(selectedOrder.total_amount)}</span>
                 </div>
                 <button onClick={() => setSelectedOrder(null)} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4">Xong</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

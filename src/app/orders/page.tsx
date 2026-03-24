"use client";

import { useEffect, useState } from "react";
import { Order, OrderItem, Product, OrderStatus } from "@/types/database";
import { CheckCircle2, PlayCircle, Eye, RefreshCw, MessageSquare, Check, Loader2 } from "lucide-react";

type OrderWithItems = Order & {
  order_items: (OrderItem & { products: Pick<Product, 'name'> })[];
};

export default function OrdersPage() {
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
  }, []);

  const fetchOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (!data.error) setOrders(data);
    } catch (e) {}
    if (showLoading) setLoading(false);
  };

  const filteredOrders = orders.filter(o => {
    const orderDate = o.created_at.split('T')[0];
    const statusMatch = statusFilter === "all" || o.status === statusFilter;
    const dateMatch = !dateFilter || orderDate === dateFilter;
    return statusMatch && dateMatch;
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
    <div className="p-6 h-full flex flex-col bg-muted/5">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">QUẢN LÝ PHA CHẾ</h1>
            <div className="flex gap-2 mt-2">
              {[ "preparing", "done", "all"].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setStatusFilter(s as any)}
                    className={`px-4 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${statusFilter === s ? "bg-primary text-white shadow-lg" : "bg-white text-muted-foreground hover:bg-muted"}`}
                  >
                    {s === "all" ? "Tất cả" : s === "preparing" ? "ĐANG LÀM" : "HOÀN TẤT"}
                  </button>
              ))}
            </div>
          </div>
          
          <div className="h-12 w-[2px] bg-black/5 mx-2" />

          <div className="space-y-1">
             <label className="text-[8px] font-black uppercase opacity-30 tracking-widest pl-1">Lọc theo ngày</label>
             <input 
                type="date" 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
                className="block bg-white border-2 border-white shadow-sm rounded-xl px-4 py-1.5 font-black text-xs outline-none focus:border-primary/20 transition-all cursor-pointer"
             />
          </div>
        </div>
        <button onClick={() => fetchOrders()} className="p-4 bg-white text-primary rounded-2xl shadow-xl hover:scale-110 active:rotate-180 transition-all border-2 border-white"><RefreshCw className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-auto bg-white border-2 border-white rounded-[2.5rem] shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-muted/10 z-10">
            <tr className="border-b">
              <th className="p-6 font-black text-muted-foreground uppercase text-[9px] tracking-widest">Thời gian</th>
              <th className="p-6 font-black text-muted-foreground uppercase text-[9px] tracking-widest">Sản phẩm</th>
              <th className="p-6 font-black text-muted-foreground uppercase text-[9px] tracking-widest text-center">Tổng Tiền</th>
              <th className="p-6 font-black text-muted-foreground uppercase text-[9px] tracking-widest text-right">Chi tiết</th>
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
                  <td className="p-6 align-top">
                    <div className="font-black text-lg leading-tight uppercase">{formatDate(o.created_at)}</div>
                    <div className="text-[8px] font-black text-muted-foreground tracking-widest opacity-40">#{o.id.slice(-6).toUpperCase()}</div>
                  </td>
                  <td className="p-6">
                    <div className="space-y-3">
                       {o.order_items.map(item => (
                          <div key={item.id} className={`flex items-start gap-4 p-3 rounded-2xl transition-all border-2 ${item.status === 'done' ? 'bg-green-50/20 border-green-50/50 opacity-40' : 'bg-muted/10 border-transparent'}`}>
                             <button 
                                onClick={() => updateItemStatus(item.id, item.status === 'done' ? 'preparing' : 'done', o.id)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md ${item.status === 'done' ? 'bg-green-500 text-white' : 'bg-white text-muted-foreground border-2 active:scale-90'}`}
                             >
                                {item.status === 'done' ? <Check className="w-5 h-5 stroke-[4]"/> : <div className="w-3 h-3 border-2 rounded-full border-primary/20"/>}
                             </button>
                             <div className="flex-1">
                                <h4 className={`font-black uppercase tracking-tight text-sm ${item.status === 'done' ? 'line-through' : ''}`}>
                                   <span className="text-primary font-black mr-2 bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">{item.quantity}x</span>
                                   {item.products?.name} 
                                </h4>
                                <p className="text-[8px] font-black opacity-30 mt-0.5 tracking-widest">
                                    {item.size}
                                    {item.sugar !== "100%" && ` • ${item.sugar} đường`}
                                    {item.ice !== "bình thường" && ` • ${item.ice} đá`}
                                 </p>
                                {item.note && <div className="mt-1 text-[8px] text-yellow-800 font-bold bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100 italic">Note: {item.note}</div>}
                             </div>
                          </div>
                       ))}
                    </div>
                  </td>
                  <td className="p-6 align-top text-center">
                    <div className="font-black text-xl text-primary tracking-tighter">{formatCurrency(o.total_amount)}</div>
                    <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${o.status === 'preparing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {o.status === 'preparing' ? <PlayCircle className="w-2.5 h-2.5 animate-spin-slow"/> : <CheckCircle2 className="w-2.5 h-2.5"/>}
                      {o.status === 'preparing' ? "Làm" : "Xong"}
                    </div>
                  </td>
                  <td className="p-6 align-top text-right">
                    <div className="flex flex-col gap-2 items-end">
                       <button onClick={() => setSelectedOrder(o)} className="p-3 bg-secondary text-secondary-foreground hover:bg-primary hover:text-white rounded-xl transition-all shadow-md active:scale-95"><Eye className="w-5 h-5"/></button>
                       {o.status === 'preparing' && (
                          <button onClick={() => markAllItemsDone(o)} className="p-3 bg-green-500 text-white hover:bg-green-600 rounded-xl transition-all shadow-lg active:scale-95"><CheckCircle2 className="w-5 h-5"/></button>
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
                 <h2 className="text-xl font-black uppercase tracking-tighter">ORDER DETAILS</h2>
                 <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 bg-muted hover:bg-destructive hover:text-white rounded-xl flex items-center justify-center transition-all font-bold">X</button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="space-y-4">
                    {selectedOrder.order_items.map(item => (
                       <div key={item.id} className="flex justify-between items-center text-sm">
                          <div>
                             <span className="font-black opacity-30 mr-2">{item.quantity}x</span>
                             <span className="font-black uppercase">{item.products?.name}</span>
                          </div>
                          <span className="font-black">{formatCurrency(item.total_price)}</span>
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

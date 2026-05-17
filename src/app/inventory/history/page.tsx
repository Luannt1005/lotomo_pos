"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { InventoryLog } from "@/types/database";

export default function InventoryHistoryPage() {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(() => {
    const d = new Date();
    // Get YYYY-MM-DD
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory-logs${filterDate ? `?date=${filterDate}` : ""}`);
      const data = await res.json();
      if (!data.error) setLogs(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "import": return <span className="text-green-600 font-black bg-green-100 px-2 py-1 rounded-md">NHẬP KHO</span>;
      case "export": return <span className="text-orange-600 font-black bg-orange-100 px-2 py-1 rounded-md">XUẤT KHO</span>;
      case "sale": return <span className="text-red-600 font-black bg-red-100 px-2 py-1 rounded-md">BÁN HÀNG</span>;
      case "adjustment": return <span className="text-amber-600 font-black bg-amber-100 px-2 py-1 rounded-md">ĐIỀU CHỈNH</span>;
      default: return <span className="text-gray-600 font-black bg-gray-100 px-2 py-1 rounded-md uppercase">{type}</span>;
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} - ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div className="p-2 md:p-6 h-full flex flex-col bg-muted/5 w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/inventory" className="p-3 bg-white border border-black/5 rounded-2xl hover:bg-black hover:text-white transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm md:text-3xl font-black tracking-tighter uppercase">LỊCH SỬ KHO</h1>
            <p className="text-[7px] md:text-sm font-medium text-muted-foreground uppercase opacity-50">Nhập, xuất, kiểm kho</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-black/5">
          <label className="text-[10px] md:text-xs font-black uppercase text-muted-foreground">Theo ngày:</label>
          <input 
            type="date" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-transparent font-bold outline-none text-sm cursor-pointer"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto w-full">
        <div className="bg-white rounded-xl lg:rounded-[2rem] shadow-sm border border-black/5 overflow-hidden min-h-[50vh]">
          {loading ? (
            <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-50">Thời gian</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-50">Nguyên liệu</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-50">Loại</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-50 text-right">Số lượng</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-50">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isPositive = log.quantity > 0;
                  const qtyColor = isPositive ? "text-green-600" : (log.quantity < 0 ? "text-red-600" : "text-amber-500");
                  const qtyPrefix = isPositive ? "+" : "";
                  
                  return (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-bold text-muted-foreground text-sm">{formatTime(log.created_at)}</td>
                      <td className="px-6 py-4 font-black uppercase tracking-tight text-sm">
                        {log.ingredients?.name || "Đã xoá"}
                        {log.type === "import" && log.cost_per_unit_at_time > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-1 opacity-70">
                            Giá nhập: {formatCurrency(log.cost_per_unit_at_time)}/{log.ingredients?.unit}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[10px]">{getTypeLabel(log.type)}</td>
                      <td className={`px-6 py-4 font-black text-right ${qtyColor}`}>
                        {qtyPrefix}{log.quantity} <span className="opacity-70 text-[10px] ml-1">{log.ingredients?.unit}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-sm text-muted-foreground">{log.note || "-"}</td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-bold">Không có dữ liệu trong ngày này.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

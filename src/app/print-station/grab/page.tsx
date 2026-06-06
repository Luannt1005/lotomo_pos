"use client";

import { useEffect, useState } from "react";
import { Printer, RefreshCw, Activity } from "lucide-react";

export default function GrabPrintStationPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    setIsPolling(true);
    addLog("ĐANG KHỞI ĐỘNG TRẠM IN GRAB... Đã kết nối thành công với máy chủ.");

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/grab-print-queue");
        if (!res.ok) return;
        const queue = await res.json();
        
        if (queue && queue.length > 0) {
          for (const order of queue) {
            addLog(`Phát hiện đơn Grab mới: #${order.grabID} - ${order.items?.length} món. Bắt đầu in...`);
            
            // In tem
            printLabels(order.items, order.grabID);
            
            // Đánh dấu đã in
            await fetch("/api/grab-print-queue", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: order.id })
            });
          }
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra đơn hàng Grab:", error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => {
      const newLogs = [`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`, ...prev];
      return newLogs.slice(0, 50);
    });
  };

  const printLabels = (orderItems: any[], grabID: string) => {
    const frameId = 'print-frame-grab';
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
               <span class="shop">GRABFOOD</span>
               <span class="time">${now}</span>
            </div>
            <div class="product-name">${item.name} (${item.size})</div>
            <div class="options">
              ${item.milk ? `<span class="milk">${item.milk.toUpperCase()}</span>` : ''}
              ${item.milk && (item.sugar !== "100%" || item.ice !== "Bình thường") ? ' • ' : ''}
              ${item.sugar !== "100%" ? `${item.sugar} Đường` : ''} 
              ${item.sugar !== "100%" && item.ice !== "Bình thường" ? ' - ' : ''}
              ${item.ice !== "Bình thường" ? `${item.ice} Đá` : ''}
            </div>
            ${item.toppings?.length > 0 ? `<div class="toppings">Top: ${item.toppings.join(', ')}</div>` : ''}
            ${item.note ? `<div class="note">Ghi chú: ${item.note}</div>` : ''}
            <div class="footer">
               <span>Số: ${i + 1}/${item.quantity}</span>
               <span class="price"></span>
               <span>Mã: #${grabID.slice(-4).toUpperCase()}</span>
            </div>
          </div>
        `;
      }
    });

    const style = `
      <style>
        @page { size: 40mm 30mm; margin: 0; }
        @media print {
          html, body { margin: 0; padding: 0; }
          header, footer { display: none !important; }
        }
        body { 
          margin: 0; padding: 0; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          -webkit-print-color-adjust: exact;
        }
        .label { 
          width: 40mm; height: 30mm; 
          padding: 1.2mm 2.5mm; box-sizing: border-box; 
          display: flex; flex-direction: column; 
          page-break-after: always; overflow: hidden; background: white;
        }
        .header { display: flex; justify-content: space-between; border-bottom: 0.1mm solid #000; padding-bottom: 0.3mm; margin-bottom: 0.5mm; }
        .shop { font-size: 6.5pt; font-weight: 900; letter-spacing: 0.1mm; color: #00B14F; }
        .time { font-size: 5pt; font-weight: 500; opacity: 0.7; }
        .product-name { font-size: 8.5pt; font-weight: 950; text-transform: uppercase; margin-bottom: 0.4mm; line-height: 1.0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .options { font-size: 7pt; font-weight: 700; margin-bottom: 0.2mm; line-height: 1.1; }
        .milk { background: #000; color: #fff; padding: 0.1mm 0.4mm; border-radius: 0.2mm; font-size: 6.5pt; margin-right: 0.5mm; }
        .toppings { font-size: 6pt; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.8; }
        .note { font-size: 6pt; font-style: italic; background: #f4f4f4; padding: 0.2mm 0.6mm; border-radius: 0.4mm; margin-top: 0.6mm; line-height: 1.05; }
        .footer { margin-top: auto; font-size: 5pt; font-weight: 700; display: flex; justify-content: space-between; color: #333; border-top: 0.1mm dashed #ccc; padding-top: 0.4mm; }
        .price { font-size: 6pt; color: #000; font-weight: 900; }
      </style>
    `;

    doc.open();
    doc.write(`<html><head>${style}</head><body>${labelsHtml}</body></html>`);
    doc.close();

    addLog(`Đang gửi lệnh in ${orderItems.length} món Grab xuống máy in...`);
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    }, 500);
  };

  return (
    <div className="p-8 h-full max-w-4xl mx-auto flex flex-col gap-6">
      <div className="bg-[#00B14F] text-white p-8 rounded-[2.5rem] shadow-2xl flex items-center justify-between">
         <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
               <Printer className="w-8 h-8"/>
            </div>
            <div>
               <h1 className="text-3xl font-black uppercase tracking-tighter">TRẠM IN GRAB</h1>
               <p className="font-medium text-white/80 mt-1 flex items-center gap-2">
                  <Activity className="w-4 h-4"/> 
                  {isPolling ? "Hệ thống đang hoạt động độc lập." : "Đang kiểm tra kết nối..."}
               </p>
            </div>
         </div>
         <div className="flex items-center gap-3 bg-white/10 px-6 py-3 rounded-full font-black uppercase tracking-widest text-sm">
             <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></div>
             ONLINE
         </div>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border-4 border-white p-6 overflow-hidden flex flex-col">
         <h2 className="font-black uppercase tracking-widest text-muted-foreground mb-4 text-xs">Lịch sử hoạt động Grab</h2>
         <div className="flex-1 overflow-y-auto space-y-2 font-mono text-sm">
            {logs.length === 0 ? (
               <div className="h-full flex items-center justify-center opacity-30 font-bold">Chưa có hoạt động nào...</div>
            ) : (
               logs.map((log, index) => (
                  <div key={index} className="p-3 bg-muted/20 rounded-xl border border-black/5 text-muted-foreground">
                    {log}
                  </div>
               ))
            )}
         </div>
      </div>
    </div>
  );
}

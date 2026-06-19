"use client";

import { useEffect, useState, useRef } from "react";
import { Printer, CheckCircle2, RefreshCw, Activity } from "lucide-react";

export default function PrintStationPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [useRawBT, setUseRawBT] = useState(false);
  const lastCheckTimeRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    const saved = localStorage.getItem("use_rawbt");
    if (saved === "true") setUseRawBT(true);
  }, []);

  useEffect(() => {
    setIsPolling(true);
    addLog("ĐANG KHỞI ĐỘNG TRẠM IN... Đã kết nối thành công với máy chủ.");

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/orders");
        if (!res.ok) return;
        const data = await res.json();
        
        if (data && Array.isArray(data)) {
          // Lọc các đơn hàng mới được tạo SAU thời gian kiểm tra cuối cùng
          const newOrders = data.filter((o: any) => new Date(o.created_at) > new Date(lastCheckTimeRef.current));
          
          if (newOrders.length > 0) {
            // Sắp xếp theo cũ nhất -> mới nhất để in theo đúng thứ tự
            newOrders.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            
            for (const order of newOrders) {
              const orderDiscount = order.discount_amount || 0;
              const subtotal = order.total_amount + orderDiscount;
              const discountRatio = subtotal > 0 ? order.total_amount / subtotal : 1;

              addLog(`Phát hiện đơn hàng mới: #${order.id.slice(-6).toUpperCase()} - ${order.order_items?.length} món. Bắt đầu in...`);
              
              // Chuyển đổi định dạng dữ liệu cho hàm in
              const orderItemsPayload = order.order_items.map((item: any) => ({
                quantity: item.quantity,
                size: item.size,
                sugar: item.sugar,
                ice: item.ice,
                milk: item.milk,
                toppings: item.toppings || [],
                note: item.note,
                unit_price: item.unit_price * discountRatio, // Giá sau giảm
                total_price: item.total_price * discountRatio,
                name: item.products?.name,
                order_id: order.id
              }));

              await printLabels(orderItemsPayload);
            }
            // Cập nhật mốc thời gian sau khi duyệt xong
            lastCheckTimeRef.current = new Date().toISOString();
          }
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra đơn hàng:", error);
      }
    }, 5000); // Lắng nghe 5 giây/lần

    return () => clearInterval(pollInterval);
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => {
      const newLogs = [`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`, ...prev];
      return newLogs.slice(0, 50); // Chỉ giữ lại 50 dòng log gần nhất cho nhẹ máy
    });
  };

  const removeAccents = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  const generateTsplLabel = (item: any, nowStr: string) => {
    const lines: string[] = [];
    lines.push("SIZE 40 mm,30 mm");
    lines.push("GAP 2 mm,0 mm");
    lines.push("DIRECTION 1,0");
    lines.push("OFFSET 0 mm");
    lines.push("REFERENCE 0,0");
    lines.push("CLS");
    lines.push("CODEPAGE UTF-8");

    // Shop header
    lines.push(`TEXT 15,10,"3",0,1,1,"lo to mo"`);
    lines.push(`TEXT 180,15,"2",0,1,1,"${nowStr.split(" ")[0]}"`);
    lines.push("BAR 15,35,290,1");

    // Product Name (remove accent to avoid printer encoding issues with standard fonts)
    const rawProdName = removeAccents(`${item.name} (${item.size})`).toUpperCase();
    if (rawProdName.length > 18) {
      lines.push(`TEXT 15,45,"3",0,1,1,"${rawProdName.substring(0, 18)}"`);
      lines.push(`TEXT 15,75,"3",0,1,1,"${rawProdName.substring(18, 36)}"`);
    } else {
      lines.push(`TEXT 15,45,"3",0,1,1,"${rawProdName}"`);
    }

    // Options (Milk, Sugar, Ice)
    let optionsParts = [];
    if (item.milk) optionsParts.push(removeAccents(item.milk).toUpperCase());
    if (item.sugar && item.sugar !== "100%") optionsParts.push(`${item.sugar} Duong`);
    if (item.ice && item.ice !== "bình thường") optionsParts.push(`${removeAccents(item.ice)} Da`);
    
    if (optionsParts.length > 0) {
      lines.push(`TEXT 15,105,"2",0,1,1,"${optionsParts.join(" - ")}"`);
    }

    // Toppings
    if (item.toppings && item.toppings.length > 0) {
      const toppingsStr = removeAccents(`Top: ${item.toppings.join(", ")}`);
      lines.push(`TEXT 15,130,"2",0,1,1,"${toppingsStr.substring(0, 28)}"`);
    }

    // Note
    if (item.note) {
      const noteStr = removeAccents(`Note: ${item.note}`);
      lines.push(`TEXT 15,155,"2",0,1,1,"${noteStr.substring(0, 28)}"`);
    }

    // Footer
    lines.push("BAR 15,185,290,1");
    const formattedPrice = new Intl.NumberFormat("vi-VN").format(item.unit_price) + "d";
    const orderStr = `Don:#${item.order_id?.slice(-4).toUpperCase() || 'POS'}`;

    lines.push(`TEXT 15,195,"2",0,1,1,"${orderStr}"`);
    lines.push(`TEXT 160,195,"3",0,1,1,"${formattedPrice}"`);
    
    lines.push("PRINT 1,1");
    return lines.join("\r\n") + "\r\n";
  };

  const printViaRawBT = (tsplContent: string) => {
    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket("ws://127.0.0.1:40213/");
      socket.binaryType = "arraybuffer";
      
      socket.onerror = (err) => {
        console.error("RawBT WebSocket connection error:", err);
        reject(new Error("Không thể kết nối với RawBT. Hãy đảm bảo ứng dụng RawBT đã được mở và dịch vụ WebSocket đang chạy."));
      };
      
      socket.onopen = () => {
        const encoder = new TextEncoder();
        const data = encoder.encode(tsplContent);
        socket.send(data);
        socket.close();
        resolve();
      };
    });
  };

  // --- Logic In Máy Xprinter 365B ---
  const printLabels = (orderItems: any[]) => {
    return new Promise<void>(async (resolve) => {
      const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

      if (useRawBT) {
        addLog(`Đang biên dịch và gửi lệnh in ${orderItems.length} món sang RawBT...`);
        let fullTspl = "";
        orderItems.forEach(item => {
          for (let i = 0; i < item.quantity; i++) {
            fullTspl += generateTsplLabel(item, now);
          }
        });

        try {
          await printViaRawBT(fullTspl);
          addLog("In thành công qua RawBT (Android).");
        } catch (err: any) {
          addLog(`LỖI IN RAWBT: ${err.message}`);
          alert(err.message);
        }
        resolve();
        return;
      }

      // Create a temporary unique iframe to avoid race conditions with multiple print documents
      const frame = document.createElement('iframe');
      frame.style.display = 'none';
      document.body.appendChild(frame);

      const doc = frame.contentWindow?.document;
      if (!doc) {
        resolve();
        return;
      }

      let labelsHtml = '';

      orderItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          labelsHtml += `
            <div class="label">
              <div class="header">
                 <span class="shop">lơ tơ mơ</span>
                 <span class="time">${now}</span>
              </div>
              <div class="product-name">${item.name} (${item.size})</div>
              <div class="options">
                ${item.milk ? `<span class="milk">${item.milk.toUpperCase()}</span>` : ''}
                ${item.milk && (item.sugar !== "100%" || item.ice !== "bình thường") ? ' • ' : ''}
                ${item.sugar !== "100%" ? `${item.sugar} Đường` : ''} 
                ${item.sugar !== "100%" && item.ice !== "bình thường" ? ' - ' : ''}
                ${item.ice !== "bình thường" ? `${item.ice} Đá` : ''}
              </div>
              ${item.toppings.length > 0 ? `<div class="toppings">Top: ${item.toppings.join(', ')}</div>` : ''}
              ${item.note ? `<div class="note">Ghi chú: ${item.note}</div>` : ''}
              <div class="footer">
                 <span>Số: ${i + 1}/${item.quantity}</span>
                 <span class="price">${new Intl.NumberFormat("vi-VN").format(item.unit_price)}đ</span>
                 <span>Đơn: #${item.order_id?.slice(-4).toUpperCase() || 'POS'}</span>
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
          .shop { font-size: 6.5pt; font-weight: 900; letter-spacing: 0.1mm; text-transform: lowercase; }
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

      addLog(`Đang gửi lệnh in ${orderItems.length} món xuống máy Xprinter...`);
      setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } catch (e) {
          console.error("Lỗi khi gọi print():", e);
        }
        // Cleanup the temporary iframe after print invocation
        setTimeout(() => {
          if (document.body.contains(frame)) {
            document.body.removeChild(frame);
          }
        }, 2000);
        resolve();
      }, 500);
    });
  };

  return (
    <div className="p-8 h-full max-w-4xl mx-auto flex flex-col gap-6">
      <div className="bg-primary text-white p-8 rounded-[2.5rem] shadow-2xl flex items-center justify-between">
         <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
               <Printer className="w-8 h-8"/>
            </div>
            <div>
               <h1 className="text-3xl font-black uppercase tracking-tighter">TRẠM MÁY IN</h1>
               <p className="font-medium text-primary-foreground/70 mt-1 flex items-center gap-2">
                  <Activity className="w-4 h-4"/> 
                  {isPolling ? "Hệ thống đang hoạt động. Cứ để trang web này bật, không cần tắt." : "Đang kiểm tra kết nối..."}
               </p>
            </div>
         </div>
         <div className="flex items-center gap-3 bg-white/10 px-6 py-3 rounded-full font-black uppercase tracking-widest text-sm">
             <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping"></div>
             ONLINE
         </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-4 border-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <h3 className="font-black uppercase tracking-tight text-lg">Cấu hình máy in</h3>
            <p className="text-sm text-muted-foreground">Chọn phương thức in tự động thích hợp cho thiết bị Android trung gian này.</p>
         </div>
         <button 
            onClick={() => {
              const newVal = !useRawBT;
              setUseRawBT(newVal);
              localStorage.setItem("use_rawbt", String(newVal));
            }} 
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border-2 ${useRawBT ? "bg-primary text-white border-primary shadow-md" : "bg-muted text-muted-foreground border-transparent hover:border-black/5"}`}
         >
            {useRawBT ? "Đang in tự động qua RawBT (Không hiện hộp thoại)" : "In qua trình duyệt (Mặc định)"}
         </button>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border-4 border-white p-6 overflow-hidden flex flex-col">
         <h2 className="font-black uppercase tracking-widest text-muted-foreground mb-4 text-xs">Lịch sử hoạt động</h2>
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

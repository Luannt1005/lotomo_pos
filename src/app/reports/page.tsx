"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Order, OrderItem, Product } from "@/types/database";
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  Tag, 
  Calendar, 
  Coffee, 
  BarChart3,
  Loader2,
  ChevronRight,
  Info,
  Award
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

type OrderWithItems = Order & {
  order_items: (OrderItem & { products: Pick<Product, 'name' | 'category'> })[];
};

type PredefinedRange = "today" | "yesterday" | "last7days" | "last30days" | "custom";

export default function ReportsPage() {
  const { role, isLoading: authLoading } = useAuthStore();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [rangeType, setRangeType] = useState<PredefinedRange>("last7days");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Interactive Chart Tooltips
  const [hoveredDailyPoint, setHoveredDailyPoint] = useState<{
    index: number;
    x: number;
    y: number;
    date: string;
    revenue: number;
  } | null>(null);

  const [hoveredHourlyBar, setHoveredHourlyBar] = useState<{
    index: number;
    x: number;
    y: number;
    label: string;
    count: number;
    revenue: number;
  } | null>(null);

  useEffect(() => {
    if (role === 'admin') {
      fetchData();
    }
  }, [role, rangeType, startDate, endDate]);

  const handleRangeChange = (type: PredefinedRange) => {
    setRangeType(type);
    const today = new Date();
    if (type === "today") {
      const dStr = format(today, "yyyy-MM-dd");
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (type === "yesterday") {
      const dStr = format(subDays(today, 1), "yyyy-MM-dd");
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (type === "last7days") {
      setStartDate(format(subDays(today, 6), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
    } else if (type === "last30days") {
      setStartDate(format(subDays(today, 29), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = `/api/orders?start_date=${startDate}&end_date=${endDate}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.error) {
        setOrders(data);
      }
    } catch (e) {
      console.error("Lỗi khi tải báo cáo:", e);
    } finally {
      setLoading(false);
    }
  };

  // Helper formatting functions
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-primary/40">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="font-black uppercase text-xs tracking-wider">Đang kiểm tra quyền...</span>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#f8f9fa] max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
          <Info className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Quyền Truy Cập Bị Từ Chối</h1>
        <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
          Chỉ quản trị viên (Admin) mới có quyền truy cập và phân tích báo cáo doanh số cửa hàng.
        </p>
      </div>
    );
  }

  // --- STATS COMPUTATION ---
  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  let totalItemsSold = 0;
  const categoryRevenue: { [key: string]: number } = {
    matcha: 0,
    "trà sữa": 0,
    trà: 0,
    khác: 0,
  };
  const categoryItemsCount: { [key: string]: number } = {
    matcha: 0,
    "trà sữa": 0,
    trà: 0,
    khác: 0,
  };
  const sizeCount: { [key: string]: number } = {
    S: 0,
    M: 0,
    L: 0,
  };
  const sizeRevenue: { [key: string]: number } = {
    S: 0,
    M: 0,
    L: 0,
  };

  let cashRevenue = 0;
  let cashOrders = 0;
  let transferRevenue = 0;
  let transferOrders = 0;

  const productSales: { 
    [key: string]: { 
      name: string; 
      category: string; 
      quantity: number; 
      revenue: number; 
    } 
  } = {};

  orders.forEach(o => {
    if (o.payment_method === "tiền mặt") {
      cashRevenue += o.total_amount;
      cashOrders++;
    } else if (o.payment_method === "chuyển khoản") {
      transferRevenue += o.total_amount;
      transferOrders++;
    }

    o.order_items?.forEach(item => {
      totalItemsSold += item.quantity;
      const cat = (item.products?.category || "khác").toLowerCase();
      const revenue = item.total_price;
      
      const mappedCat = categoryRevenue[cat] !== undefined ? cat : "khác";
      categoryRevenue[mappedCat] += revenue;
      categoryItemsCount[mappedCat] += item.quantity;

      const sz = (item.size || "M").toUpperCase();
      if (sizeCount[sz] !== undefined) {
        sizeCount[sz] += item.quantity;
        sizeRevenue[sz] += revenue;
      }

      const pId = item.product_id;
      if (pId) {
        const pName = item.products?.name || "Sản phẩm không rõ";
        const pCat = item.products?.category || "khác";
        if (!productSales[pId]) {
          productSales[pId] = {
            name: pName,
            category: pCat,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[pId].quantity += item.quantity;
        productSales[pId].revenue += revenue;
      }
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // --- DAILY TREND DATA ---
  const dateList: string[] = [];
  let current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dateList.push(format(current, "yyyy-MM-dd"));
    current.setDate(current.getDate() + 1);
  }

  const dailyData = dateList.map(dateStr => {
    const dayOrders = orders.filter(o => o.created_at.startsWith(dateStr));
    const revenue = dayOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const count = dayOrders.length;
    return {
      date: dateStr,
      displayDate: format(parseISO(dateStr), "dd/MM"),
      revenue,
      count,
    };
  });

  const maxDailyRevenue = Math.max(...dailyData.map(d => d.revenue), 100000);

  // --- HOURLY DISTRIBUTION ---
  const hourBins = [
    { label: "07:00 - 09:00", start: 7, end: 9, count: 0, revenue: 0 },
    { label: "09:00 - 11:00", start: 9, end: 11, count: 0, revenue: 0 },
    { label: "11:00 - 13:00", start: 11, end: 13, count: 0, revenue: 0 },
    { label: "13:00 - 15:00", start: 13, end: 15, count: 0, revenue: 0 },
    { label: "15:00 - 17:00", start: 15, end: 17, count: 0, revenue: 0 },
    { label: "17:00 - 19:00", start: 17, end: 19, count: 0, revenue: 0 },
    { label: "19:00 - 21:00", start: 19, end: 21, count: 0, revenue: 0 },
    { label: "21:00 - 23:00", start: 21, end: 23, count: 0, revenue: 0 },
  ];

  orders.forEach(o => {
    const oDate = new Date(o.created_at);
    const hour = oDate.getHours();
    hourBins.forEach(bin => {
      if (hour >= bin.start && hour < bin.end) {
        bin.count++;
        bin.revenue += o.total_amount;
      }
    });
  });

  const maxHourlyCount = Math.max(...hourBins.map(b => b.count), 1);

  // --- SVG Dimensions Config ---
  const svgWidth = 800;
  const svgHeight = 280;
  const margin = { top: 30, right: 30, bottom: 40, left: 65 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 bg-[#f8f9fa] min-h-screen">
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-black/5 shadow-2xs">
            Khoảng thời gian:
          </span>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Predefined range buttons */}
          <div className="flex bg-white rounded-xl p-1 shadow-sm border border-black/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {(["today", "yesterday", "last7days", "last30days", "custom"] as PredefinedRange[]).map((type) => (
              <button
                key={type}
                onClick={() => handleRangeChange(type)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  rangeType === type
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {type === "today" ? "Hôm nay" :
                 type === "yesterday" ? "Hôm qua" :
                 type === "last7days" ? "7 ngày" :
                 type === "last30days" ? "30 ngày" : "Tùy chọn"}
              </button>
            ))}
          </div>

          {/* Custom Date Picker Inputs */}
          {rangeType === "custom" && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-black/5 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[10px] font-black outline-none w-24 text-center cursor-pointer"
              />
              <span className="text-muted-foreground text-[10px] font-bold shrink-0">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[10px] font-black outline-none w-24 text-center cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-primary/30">
          <Loader2 className="w-10 h-10 animate-spin" />
          <span className="font-black text-xs uppercase tracking-widest">Đang tải báo cáo...</span>
        </div>
      ) : (
        <>
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            {/* Card 1: Revenue */}
            <div className="bg-white p-4 lg:p-6 rounded-[1.5rem] border border-black/5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[2rem] flex items-center justify-center transition-all group-hover:bg-primary/10">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Doanh Thu</span>
                <h3 className="text-lg lg:text-2xl font-black text-foreground tracking-tight line-clamp-1">{formatCurrency(totalRevenue)}</h3>
              </div>
              <p className="text-[9px] text-muted-foreground/80 mt-4 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3 text-green-500" /> Tổng doanh thu sau giảm giá.
              </p>
            </div>

            {/* Card 2: Orders Count */}
            <div className="bg-white p-4 lg:p-6 rounded-[1.5rem] border border-black/5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-[2rem] flex items-center justify-center transition-all group-hover:bg-blue-500/10">
                <ShoppingBag className="w-6 h-6 text-blue-500" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Số Đơn Hàng</span>
                <h3 className="text-lg lg:text-2xl font-black text-foreground tracking-tight line-clamp-1">{totalOrders} đơn</h3>
              </div>
              <p className="text-[9px] text-muted-foreground/80 mt-4 flex items-center gap-1 font-medium">
                Số lượng hóa đơn đã phục vụ.
              </p>
            </div>

            {/* Card 3: AOV */}
            <div className="bg-white p-4 lg:p-6 rounded-[1.5rem] border border-black/5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-[2rem] flex items-center justify-center transition-all group-hover:bg-amber-500/10">
                <Award className="w-6 h-6 text-amber-500" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Giá Trị Đơn Trung Bình</span>
                <h3 className="text-lg lg:text-2xl font-black text-foreground tracking-tight line-clamp-1">{formatCurrency(avgOrderValue)}</h3>
              </div>
              <p className="text-[9px] text-muted-foreground/80 mt-4 flex items-center gap-1 font-medium">
                Giá trị trung bình trên một đơn hàng.
              </p>
            </div>

            {/* Card 4: Total Items Sold */}
            <div className="bg-white p-4 lg:p-6 rounded-[1.5rem] border border-black/5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/5 rounded-bl-[2rem] flex items-center justify-center transition-all group-hover:bg-green-500/10">
                <Coffee className="w-6 h-6 text-green-500" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Sản Phẩm Đã Bán</span>
                <h3 className="text-lg lg:text-2xl font-black text-foreground tracking-tight line-clamp-1">{totalItemsSold} ly</h3>
              </div>
              <p className="text-[9px] text-muted-foreground/80 mt-4 flex items-center gap-1 font-medium">
                Tổng số ly nước đã pha chế.
              </p>
            </div>
          </div>

          {/* MAIN CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. Area Chart: Daily Revenue Trend */}
            <div className="bg-white p-4 lg:p-6 rounded-[2rem] border border-black/5 shadow-sm lg:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-xs lg:text-sm font-black uppercase tracking-wider text-foreground">Xu Hướng Doanh Thu Ngày</h3>
                <p className="text-[10px] text-muted-foreground">Biểu đồ thể hiện biến động thu nhập qua các ngày trong kỳ.</p>
              </div>

              {/* Chart Canvas */}
              <div className="relative mt-6 flex-1 min-h-[240px] overflow-x-auto no-scrollbar">
                {dailyData.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase font-black opacity-20">Không có dữ liệu</div>
                ) : (
                  <div className="min-w-[600px] w-full h-full relative">
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = margin.top + ratio * chartHeight;
                        const labelValue = maxDailyRevenue * (1 - ratio);
                        return (
                          <g key={i}>
                            <line 
                              x1={margin.left} 
                              y1={y} 
                              x2={margin.left + chartWidth} 
                              y2={y} 
                              className="stroke-muted/30 stroke-1 stroke-dasharray-[4,4]" 
                            />
                            <text 
                              x={margin.left - 8} 
                              y={y + 3} 
                              className="fill-muted-foreground/60 text-[9px] font-black text-right uppercase tracking-tighter" 
                              textAnchor="end"
                            >
                              {formatCurrency(labelValue).split(" ₫")[0]}
                            </text>
                          </g>
                        );
                      })}

                      {/* Generate Line & Area paths */}
                      {(() => {
                        const points = dailyData.map((d, index) => {
                          const x = margin.left + (dailyData.length > 1 ? (index / (dailyData.length - 1)) * chartWidth : chartWidth / 2);
                          const y = margin.top + (1 - d.revenue / maxDailyRevenue) * chartHeight;
                          return { x, y, ...d };
                        });

                        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(" ");
                        const areaPath = points.length > 0 
                          ? `${linePath} L ${points[points.length - 1].x} ${margin.top + chartHeight} L ${points[0].x} ${margin.top + chartHeight} Z`
                          : "";

                        return (
                          <>
                            {/* Area Fill Gradient Definition */}
                            <defs>
                              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00" />
                              </linearGradient>
                            </defs>

                            {/* Area Path */}
                            {areaPath && (
                              <path 
                                d={areaPath} 
                                fill="url(#chartGradient)" 
                                className="transition-all duration-500" 
                              />
                            )}

                            {/* Line Path */}
                            {linePath && (
                              <path 
                                d={linePath} 
                                fill="none" 
                                className="stroke-primary stroke-3 stroke-round transition-all duration-500" 
                              />
                            )}

                            {/* Interactive Circles / Grid Bars */}
                            {points.map((p, i) => {
                              const isHovered = hoveredDailyPoint?.index === i;
                              return (
                                <g key={i}>
                                  {/* Hidden vertical hover zones */}
                                  <rect
                                    x={p.x - (chartWidth / dailyData.length) / 2}
                                    y={margin.top}
                                    width={chartWidth / dailyData.length}
                                    height={chartHeight}
                                    className="fill-transparent cursor-pointer"
                                    onMouseEnter={() => setHoveredDailyPoint({
                                      index: i,
                                      x: p.x,
                                      y: p.y,
                                      date: p.date,
                                      revenue: p.revenue
                                    })}
                                    onMouseLeave={() => setHoveredDailyPoint(null)}
                                  />
                                  <circle 
                                    cx={p.x} 
                                    cy={p.y} 
                                    r={isHovered ? 6 : 4} 
                                    className={`stroke-white stroke-2 fill-primary transition-all duration-200 pointer-events-none ${isHovered ? "scale-125 shadow-lg" : ""}`}
                                  />
                                </g>
                              );
                            })}

                            {/* X-axis labels */}
                            {points.filter((_, idx) => {
                              if (dailyData.length <= 10) return true;
                              if (dailyData.length <= 20) return idx % 2 === 0;
                              return idx % 5 === 0;
                            }).map((p, idx) => (
                              <text
                                key={idx}
                                x={p.x}
                                y={margin.top + chartHeight + 18}
                                className="fill-muted-foreground/60 text-[9px] font-black uppercase tracking-tighter"
                                textAnchor="middle"
                              >
                                {p.displayDate}
                              </text>
                            ))}
                          </>
                        );
                      })()}
                    </svg>

                    {/* HTML Tooltip Card overlay */}
                    {hoveredDailyPoint && (
                      <div 
                        className="absolute bg-slate-900 text-white rounded-xl p-3 shadow-xl pointer-events-none text-left z-20 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1 border border-white/10"
                        style={{
                          left: `${(hoveredDailyPoint.x / svgWidth) * 100}%`,
                          top: `${(hoveredDailyPoint.y / svgHeight) * 100 - 85}%`,
                          transform: "translateX(-50%)",
                        }}
                      >
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                          {hoveredDailyPoint.date}
                        </span>
                        <span className="text-xs font-black text-primary-foreground">
                          Doanh thu: {formatCurrency(hoveredDailyPoint.revenue)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Ring Chart: Revenue by Category */}
            <div className="bg-white p-4 lg:p-6 rounded-[2rem] border border-black/5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs lg:text-sm font-black uppercase tracking-wider text-foreground">Doanh Thu Theo Nhóm</h3>
                <p className="text-[10px] text-muted-foreground">Phân bổ doanh thu của các danh mục nước chính.</p>
              </div>

              {/* Donut Content */}
              <div className="flex flex-col items-center justify-center py-6 gap-6">
                {totalRevenue === 0 ? (
                  <div className="text-[10px] uppercase font-black opacity-20 py-20">Không có dữ liệu</div>
                ) : (
                  <>
                    {/* SVG Donut Circle */}
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                        {(() => {
                          const cats = Object.keys(categoryRevenue);
                          const colors = ["#6366f1", "#f59e0b", "#10b981", "#64748b"];
                          let accumulatedPercent = 0;
                          
                          return cats.map((cat, idx) => {
                            const val = categoryRevenue[cat];
                            const percent = val / totalRevenue;
                            if (percent === 0) return null;

                            const radius = 45;
                            const circ = 2 * Math.PI * radius; // ~282.74
                            const strokeDash = percent * circ;
                            const strokeOffset = -accumulatedPercent * circ;
                            accumulatedPercent += percent;

                            return (
                              <circle
                                key={cat}
                                cx="60"
                                cy="60"
                                r={radius}
                                fill="transparent"
                                stroke={colors[idx]}
                                strokeWidth="12"
                                strokeDasharray={`${strokeDash} ${circ}`}
                                strokeDashoffset={strokeOffset}
                                className="transition-all duration-700"
                              />
                            );
                          });
                        })()}
                      </svg>
                      {/* Center total text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground leading-none">Tổng cộng</span>
                        <span className="text-xs lg:text-sm font-black text-foreground mt-1 leading-none">
                          {formatCurrency(totalRevenue).split(" ₫")[0]}K
                        </span>
                      </div>
                    </div>

                    {/* Color Legend & Info */}
                    <div className="w-full space-y-2">
                      {Object.keys(categoryRevenue).map((cat, idx) => {
                        const val = categoryRevenue[cat];
                        const count = categoryItemsCount[cat];
                        const percent = totalRevenue > 0 ? (val / totalRevenue) * 100 : 0;
                        const colors = ["bg-[#6366f1]", "bg-[#f59e0b]", "bg-[#10b981]", "bg-[#64748b]"];
                        
                        return (
                          <div key={cat} className="flex justify-between items-center text-xs border-b border-black/5 pb-2 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${colors[idx]}`} />
                              <span className="font-black uppercase tracking-tight text-[10px]">{cat}</span>
                              <span className="text-[8px] text-muted-foreground font-black">({count} ly)</span>
                            </div>
                            <div className="text-right">
                              <div className="font-black text-foreground">{formatCurrency(val)}</div>
                              <div className="text-[8px] text-muted-foreground font-bold leading-none">{percent.toFixed(1)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. Bar Chart: Hourly Sales Distribution */}
            <div className="bg-white p-4 lg:p-6 rounded-[2rem] border border-black/5 shadow-sm lg:col-span-2">
              <div>
                <h3 className="text-xs lg:text-sm font-black uppercase tracking-wider text-foreground">Giờ Bán Hàng Cao Điểm</h3>
                <p className="text-[10px] text-muted-foreground">Phân bổ tần suất giao dịch và số đơn hàng theo các khung giờ.</p>
              </div>

              {/* Bar Canvas */}
              <div className="relative mt-8 min-h-[240px] overflow-x-auto no-scrollbar">
                {totalOrders === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase font-black opacity-20">Không có dữ liệu</div>
                ) : (
                  <div className="min-w-[600px] w-full h-full relative">
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = margin.top + ratio * chartHeight;
                        const labelValue = Math.ceil(maxHourlyCount * (1 - ratio));
                        return (
                          <g key={i}>
                            <line 
                              x1={margin.left} 
                              y1={y} 
                              x2={margin.left + chartWidth} 
                              y2={y} 
                              className="stroke-muted/30 stroke-1 stroke-dasharray-[4,4]" 
                            />
                            <text 
                              x={margin.left - 8} 
                              y={y + 3} 
                              className="fill-muted-foreground/60 text-[9px] font-black text-right uppercase tracking-tighter" 
                              textAnchor="end"
                            >
                              {labelValue} đơn
                            </text>
                          </g>
                        );
                      })}

                      {/* Render Bars */}
                      {hourBins.map((bin, index) => {
                        const spacing = 18;
                        const totalSpacing = spacing * (hourBins.length - 1);
                        const barWidth = (chartWidth - totalSpacing) / hourBins.length;
                        const x = margin.left + index * (barWidth + spacing);
                        const y = margin.top + (1 - bin.count / maxHourlyCount) * chartHeight;
                        const barHeight = (bin.count / maxHourlyCount) * chartHeight;
                        
                        const isHovered = hoveredHourlyBar?.index === index;

                        return (
                          <g key={index}>
                            {/* Bar Rectangle */}
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={Math.max(barHeight, 2)}
                              rx="8"
                              className={`fill-primary/80 transition-all duration-300 cursor-pointer ${
                                isHovered ? "fill-primary scale-x-105" : ""
                              }`}
                              onMouseEnter={() => setHoveredHourlyBar({
                                index,
                                x: x + barWidth / 2,
                                y,
                                label: bin.label,
                                count: bin.count,
                                revenue: bin.revenue
                              })}
                              onMouseLeave={() => setHoveredHourlyBar(null)}
                            />

                            {/* Label */}
                            <text
                              x={x + barWidth / 2}
                              y={margin.top + chartHeight + 18}
                              className="fill-muted-foreground/60 text-[8px] lg:text-[9px] font-black uppercase tracking-tighter"
                              textAnchor="middle"
                            >
                              {bin.label.split(" - ")[0]}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Tooltip Card overlay for Bar Chart */}
                    {hoveredHourlyBar && (
                      <div 
                        className="absolute bg-slate-900 text-white rounded-xl p-3 shadow-xl pointer-events-none text-left z-20 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1 border border-white/10"
                        style={{
                          left: `${(hoveredHourlyBar.x / svgWidth) * 100}%`,
                          top: `${(hoveredHourlyBar.y / svgHeight) * 100 - 85}%`,
                          transform: "translateX(-50%)",
                        }}
                      >
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                          Khung giờ: {hoveredHourlyBar.label}
                        </span>
                        <span className="text-xs font-black text-primary-foreground">
                          Số đơn: {hoveredHourlyBar.count} đơn
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400">
                          Doanh thu: {formatCurrency(hoveredHourlyBar.revenue)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Size Distribution Progress Bars */}
            <div className="bg-white p-4 lg:p-6 rounded-[2rem] border border-black/5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs lg:text-sm font-black uppercase tracking-wider text-foreground">Phân Bổ Kích Cỡ Ly</h3>
                <p className="text-[10px] text-muted-foreground">Tỷ lệ ly cỡ S, M, L được bán ra trong kỳ.</p>
              </div>

              <div className="space-y-4 my-6 flex-1 flex flex-col justify-center">
                {totalItemsSold === 0 ? (
                  <div className="text-[10px] uppercase font-black opacity-20 py-20 text-center">Không có dữ liệu</div>
                ) : (
                  (["S", "M", "L"] as const).map((sz) => {
                    const count = sizeCount[sz] || 0;
                    const rev = sizeRevenue[sz] || 0;
                    const percentCount = totalItemsSold > 0 ? (count / totalItemsSold) * 100 : 0;
                    
                    const colorMap = {
                      S: "bg-indigo-500",
                      M: "bg-amber-500",
                      L: "bg-emerald-500"
                    };

                    return (
                      <div key={sz} className="space-y-1">
                        <div className="flex justify-between items-end text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-foreground">Ly {sz}</span>
                            <span className="text-[9px] font-black text-muted-foreground">({count} ly)</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-foreground">{formatCurrency(rev)}</span>
                            <span className="text-[9px] text-muted-foreground font-black ml-1.5">({percentCount.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${colorMap[sz]} rounded-full transition-all duration-1000`} 
                            style={{ width: `${percentCount}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 5. Payment Method Distribution */}
            <div className="bg-white p-4 lg:p-6 rounded-[2rem] border border-black/5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs lg:text-sm font-black uppercase tracking-wider text-foreground">Phương Thức Thanh Toán</h3>
                <p className="text-[10px] text-muted-foreground">Tỷ lệ doanh thu Tiền mặt và Chuyển khoản.</p>
              </div>

              <div className="space-y-4 my-6 flex-1 flex flex-col justify-center">
                {totalOrders === 0 ? (
                  <div className="text-[10px] uppercase font-black opacity-20 py-20 text-center">Không có dữ liệu</div>
                ) : (
                  <>
                    {/* Cash */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-end text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-foreground">Tiền mặt</span>
                          <span className="text-[9px] font-black text-muted-foreground">({cashOrders} đơn)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-foreground">{formatCurrency(cashRevenue)}</span>
                          <span className="text-[9px] text-muted-foreground font-black ml-1.5">
                            ({totalRevenue > 0 ? ((cashRevenue / totalRevenue) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                          style={{ width: `${totalRevenue > 0 ? (cashRevenue / totalRevenue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Bank Transfer */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-end text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-foreground">Chuyển khoản</span>
                          <span className="text-[9px] font-black text-muted-foreground">({transferOrders} đơn)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-foreground">{formatCurrency(transferRevenue)}</span>
                          <span className="text-[9px] text-muted-foreground font-black ml-1.5">
                            ({totalRevenue > 0 ? ((transferRevenue / totalRevenue) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                          style={{ width: `${totalRevenue > 0 ? (transferRevenue / totalRevenue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 6. Top Selling Products */}
            <div className="bg-white p-4 lg:p-6 rounded-[2rem] border border-black/5 shadow-sm lg:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-xs lg:text-sm font-black uppercase tracking-wider text-foreground">Sản Phẩm Bán Chạy Nhất</h3>
                <p className="text-[10px] text-muted-foreground">Top 5 sản phẩm đạt doanh số cao nhất trong kỳ.</p>
              </div>

              <div className="mt-6 flex-1">
                {topProducts.length === 0 ? (
                  <div className="text-[10px] uppercase font-black opacity-20 py-20 text-center">Không có dữ liệu</div>
                ) : (
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-black/5 text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                          <th className="py-3">Tên sản phẩm</th>
                          <th className="py-3">Danh mục</th>
                          <th className="py-3 text-right">Số lượng bán</th>
                          <th className="py-3 text-right">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, idx) => (
                          <tr key={idx} className="border-b border-black/5 last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="py-3.5 font-black uppercase flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black">
                                {idx + 1}
                              </span>
                              {p.name}
                            </td>
                            <td className="py-3.5 font-bold uppercase text-muted-foreground/80 text-[10px]">
                              {p.category}
                            </td>
                            <td className="py-3.5 font-black text-right text-foreground">
                              {p.quantity} ly
                            </td>
                            <td className="py-3.5 font-black text-right text-primary">
                              {formatCurrency(p.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}

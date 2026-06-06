"use client";

import { useState, useEffect } from "react";
import { Calculator, Download, Calendar as CalendarIcon, DollarSign, Clock, Users } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hourlyRate, setHourlyRate] = useState<number>(20000); // 20k/hour default
  
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

  const { role } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (role !== "admin") {
      router.push("/");
      return;
    }
    fetchPayroll();
  }, [role, startDate, endDate]);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payroll?start_date=${startDate}&end_date=${endDate}`);
      if (!res.ok) throw new Error("Không thể tải bảng lương");
      const data = await res.json();
      setPayrolls(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = "Nhân viên,Email,Số ca làm,Số giờ làm,Lương cơ bản (VNĐ)\n";
    const rows = payrolls.map(p => 
      `${p.name},${p.email},${p.totalShifts},${p.totalHours.toFixed(1)},${p.totalHours * hourlyRate}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bang_Luong_${startDate}_den_${endDate}.csv`;
    link.click();
  };

  if (role !== "admin") return null;

  const totalSalary = payrolls.reduce((acc, p) => acc + (p.totalHours * hourlyRate), 0);
  const totalHours = payrolls.reduce((acc, p) => acc + p.totalHours, 0);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tính Lương</h1>
          <p className="text-muted-foreground mt-1">Tính toán lương nhân viên dựa trên lịch làm việc đã đăng ký</p>
        </div>
        
        <button
          onClick={handleExportCSV}
          className="bg-white border border-border text-foreground px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-muted transition-colors"
        >
          <Download className="w-5 h-5" />
          Xuất Excel
        </button>
      </div>

      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" /> Từ ngày
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-input bg-background outline-none"
          />
        </div>
        <div className="flex-1 w-full space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" /> Đến ngày
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-input bg-background outline-none"
          />
        </div>
        <div className="flex-1 w-full space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Mức lương (VNĐ/Giờ)
          </label>
          <input
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
            className="w-full p-2.5 rounded-xl border border-input bg-background outline-none"
            min={0}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-blue-600/80 font-medium text-sm">Tổng nhân sự</p>
            <p className="text-2xl font-bold text-blue-700">{payrolls.length}</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-amber-600/80 font-medium text-sm">Tổng giờ làm</p>
            <p className="text-2xl font-bold text-amber-700">{totalHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <p className="text-green-600/80 font-medium text-sm">Tổng quỹ lương</p>
            <p className="text-2xl font-bold text-green-700">{new Intl.NumberFormat('vi-VN').format(totalSalary)}đ</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 opacity-50 font-medium">Đang tính toán...</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="p-4 font-medium text-muted-foreground">Nhân viên</th>
                  <th className="p-4 font-medium text-muted-foreground text-center">Số ca làm</th>
                  <th className="p-4 font-medium text-muted-foreground text-center">Tổng giờ làm</th>
                  <th className="p-4 font-medium text-muted-foreground text-right">Lương thực nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">Không có dữ liệu làm việc trong thời gian này</td>
                  </tr>
                ) : payrolls.map((p) => {
                  const salary = p.totalHours * hourlyRate;
                  return (
                    <tr key={p.userId} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {p.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{p.name}</div>
                            <div className="text-sm text-muted-foreground">{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-medium">{p.totalShifts} ca</td>
                      <td className="p-4 text-center font-medium">{p.totalHours.toFixed(1)} giờ</td>
                      <td className="p-4 text-right">
                        <span className="font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                          {new Intl.NumberFormat('vi-VN').format(salary)}đ
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

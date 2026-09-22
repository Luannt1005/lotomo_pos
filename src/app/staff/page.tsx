"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Shield, ShieldOff, User, Lock, Unlock } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function StaffPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff"
  });

  const { role } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (role !== "admin") {
      router.push("/");
      return;
    }
    fetchUsers();
  }, [role]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Không thể tải danh sách nhân viên");
      const data = await res.json();
      setUsers(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) return toast.error("Vui lòng nhập email");
    if (!editingUser && !formData.password) return toast.error("Vui lòng nhập mật khẩu cho tài khoản mới");

    try {
      const url = editingUser ? `/api/staff/${editingUser.id}` : "/api/staff";
      const method = editingUser ? "PATCH" : "POST";
      
      const payload: any = { ...formData };
      if (editingUser && !payload.password) {
        delete payload.password; // Don't send empty password if not changing
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Có lỗi xảy ra");
      }

      toast.success(editingUser ? "Cập nhật thành công!" : "Đã tạo tài khoản!");
      setShowModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xoá tài khoản này vĩnh viễn?")) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Không thể xoá");
      toast.success("Đã xoá tài khoản");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const isCurrentlyActive = !user.banned_until;
    const actionText = isCurrentlyActive ? "khóa" : "mở khóa";
    if (!confirm(`Bạn có muốn ${actionText} tài khoản này?`)) return;

    try {
      const res = await fetch(`/api/staff/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isCurrentlyActive })
      });
      if (!res.ok) throw new Error("Không thể cập nhật trạng thái");
      toast.success(`Đã ${actionText} tài khoản`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openModal = (user: any = null) => {
    setEditingUser(user);
    setFormData({
      name: user?.user_metadata?.name || "",
      email: user?.email || "",
      password: "",
      role: user?.user_metadata?.role || "staff"
    });
    setShowModal(true);
  };

  if (role !== "admin") return null;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-border shadow-2xs">
            Tổng số: {users.length} tài khoản nhân sự
          </span>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-xs"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm nhân viên</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 opacity-50 font-medium">Đang tải...</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="p-4 font-medium text-muted-foreground">Nhân viên</th>
                  <th className="p-4 font-medium text-muted-foreground">Vai trò</th>
                  <th className="p-4 font-medium text-muted-foreground">Trạng thái</th>
                  <th className="p-4 font-medium text-muted-foreground text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const isBanned = !!u.banned_until;
                  return (
                    <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {(u.user_metadata?.name?.[0] || u.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{u.user_metadata?.name || 'Chưa cập nhật tên'}</div>
                            <div className="text-sm text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {u.user_metadata?.role === 'admin' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                              <Shield className="w-3.5 h-3.5" /> Admin
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                              <User className="w-3.5 h-3.5" /> Staff
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isBanned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {isBanned ? 'Đã khóa' : 'Đang hoạt động'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            title={isBanned ? "Mở khóa" : "Khóa tài khoản"}
                            className={`p-2 rounded-lg transition-colors ${isBanned ? 'text-green-600 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'}`}
                          >
                            {isBanned ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openModal(u)}
                            title="Sửa thông tin"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            title="Xoá vĩnh viễn"
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold">{editingUser ? "Sửa tài khoản" : "Thêm nhân viên mới"}</h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Tên hiển thị</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                  placeholder="VD: Nguyễn Văn A"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email (Tài khoản đăng nhập)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                  placeholder="nhanvien@lotomo.com"
                  disabled={!!editingUser}
                  required
                />
                {editingUser && <p className="text-xs text-muted-foreground mt-1">Không thể thay đổi email sau khi tạo.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Mật khẩu {editingUser && "(Để trống nếu không muốn đổi)"}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                  placeholder="******"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Phân quyền</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`border rounded-xl p-3 flex items-center gap-2 cursor-pointer transition-colors ${formData.role === 'staff' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="staff"
                      checked={formData.role === "staff"}
                      onChange={() => setFormData({ ...formData, role: "staff" })}
                      className="hidden"
                    />
                    <User className="w-5 h-5" />
                    <span className="font-medium">Nhân viên</span>
                  </label>
                  <label className={`border rounded-xl p-3 flex items-center gap-2 cursor-pointer transition-colors ${formData.role === 'admin' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formData.role === "admin"}
                      onChange={() => setFormData({ ...formData, role: "admin" })}
                      className="hidden"
                    />
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Admin</span>
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                  {editingUser ? "Cập nhật" : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

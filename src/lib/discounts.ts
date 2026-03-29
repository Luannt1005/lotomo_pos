import { Discount } from "@/types/database";

export const getActiveDiscount = (discounts: Discount[]): Discount | null => {
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  const todayDay = todayDate.getDay();

  // 1. Kiểm tra ngày đặc biệt (ưu tiên cao nhất)
  const specific = discounts.find(d => d.is_active && d.specific_date === todayStr);
  if (specific) return specific;

  // 2. Kiểm tra ngày trong tuần
  const weekly = discounts.find(d => d.is_active && d.day_of_week === todayDay);
  if (weekly) return weekly;

  return null;
};

export const calculateDiscount = (subtotal: number, discount: Discount | null): number => {
  if (!discount) return 0;
  if (discount.min_order_value && subtotal < discount.min_order_value) return 0;

  if (discount.type === 'percentage') {
    return Math.floor((subtotal * discount.value) / 100);
  } else {
    return discount.value;
  }
};


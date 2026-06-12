export type Category = string; // Now dynamic

export type Topping = {
  id: string;
  name: string;
  price: number;
  created_at: string;
};

export type ProductSize = {
  size: Size;
  price: number;
};

export type Product = {
  id: string;
  name: string;
  category: Category;
  sizes: ProductSize[];
  image_url: string | null;
  is_available: boolean;
  created_at: string;
};

export type OrderStatus = 'preparing' | 'done';
export type PaymentMethod = 'tiền mặt' | 'chuyển khoản';

export type Order = {
  id: string;
  total_amount: number;
  total_cost: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
};

export type Size = 'S' | 'M' | 'L';
export type SugarLevel = '0%' | '50%' | '100%';
export type IceLevel = 'không đá' | 'ít đá' | 'bình thường';

export type MilkType = 'sữa tươi' | 'sữa Oat';
export type MatchaType = 'mặc định' | 'Kawa' | 'MK4';

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  size: string;
  sugar: string;
  ice: string;
  milk?: string;
  matcha_type?: string;
  toppings: string[];
  unit_price: number;
  total_price: number;
  total_cost: number;
  note?: string;
  status: OrderStatus;
  created_at: string;
};

export type ProductWithQuantity = Product & {
  cartItemId: string; // Unique ID for cart management
  quantity: number;
  size: Size;
  sugar: SugarLevel;
  ice: IceLevel;
  milk?: MilkType;
  matcha_type?: MatchaType;
  toppings: string[];
  unit_price: number;
  total_price: number;
  note: string;
};

export type Discount = {
  id: string;
  label: string;
  type: 'percentage' | 'fixed';
  value: number;
  day_of_week: number | null; // 0-6
  specific_date: string | null; // YYYY-MM-DD
  min_order_value: number | null;
  is_active: boolean;
  created_at: string;
};

export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  unit_cost: number;
  created_at: string;
};

export type InventoryLog = {
  id: string;
  ingredient_id: string;
  type: 'import' | 'export' | 'sale' | 'adjustment';
  quantity: number;
  cost_per_unit_at_time: number;
  note: string | null;
  created_at: string;
  ingredients?: { id: string; name: string; unit: string };
};

export type Recipe = {
  id: string;
  target_type: 'product' | 'topping' | 'milk';
  target_id: string;
  target_size: string | null;
  ingredient_id: string;
  quantity_required: number;
  created_at: string;
  ingredients?: Ingredient; // Relational
};

export type Shift = {
  id: string;
  name: string;
  start_time: string; // e.g., '08:00'
  end_time: string;   // e.g., '12:00'
  max_staff: number;
  created_at: string;
};

export type ShiftRegistration = {
  id: string;
  shift_id: string;
  user_id: string;
  user_email: string;
  date: string; // YYYY-MM-DD
  created_at: string;
};

export type LockedWeek = {
  week_start: string; // YYYY-MM-DD
  locked_by: string;
  created_at: string;
};

export type ShiftSwap = {
  id: string;
  requestor_id: string;
  requestor_email: string;
  requestor_reg_id: string;
  target_id: string;
  target_email: string;
  target_reg_id: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
};

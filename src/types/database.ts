export type Category = 'matcha' | 'trà sữa' | 'cà phê';

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
  status: OrderStatus;
  payment_method: PaymentMethod;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
};

export type Size = 'S' | 'M' | 'L';
export type SugarLevel = '0%' | '50%' | '100%';
export type IceLevel = 'không đá' | 'ít đá' | 'bình thường';

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  size: string;
  sugar: string;
  ice: string;
  toppings: string[];
  unit_price: number;
  total_price: number;
  note?: string;
  status: OrderStatus; // Added item status
  created_at: string;
};

export type ProductWithQuantity = Product & {
  cartItemId: string; // Unique ID for cart management
  quantity: number;
  size: Size;
  sugar: SugarLevel;
  ice: IceLevel;
  toppings: string[];
  unit_price: number;
  total_price: number;
  note: string;
};

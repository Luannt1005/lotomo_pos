-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('matcha', 'trà sữa', 'cà phê')),
    sizes JSONB NOT NULL DEFAULT '[]'::JSONB,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Global Toppings table
CREATE TABLE public.toppings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_amount INTEGER NOT NULL DEFAULT 0,
    total_cost INTEGER NOT NULL DEFAULT 0, -- Tống vốn
    status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'done')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('tiền mặt', 'chuyển khoản')),
    is_paid BOOLEAN NOT NULL DEFAULT false,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Order Items table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    size TEXT NOT NULL,
    sugar TEXT NOT NULL,
    ice TEXT NOT NULL,
    toppings JSONB DEFAULT '[]'::JSONB,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'done')),
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    total_cost INTEGER NOT NULL DEFAULT 0, -- Vốn cho món này
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Setup Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policies (Public access)
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public all products" ON public.products FOR ALL USING (true);

CREATE POLICY "Public read toppings" ON public.toppings FOR SELECT USING (true);
CREATE POLICY "Public all toppings" ON public.toppings FOR ALL USING (true);

CREATE POLICY "Public all orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Public all order_items" ON public.order_items FOR ALL USING (true);

-- Create Ingredients table (Kho nguyên liệu)
CREATE TABLE public.ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- e.g., 'g', 'ml', 'pcs'
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost INTEGER NOT NULL DEFAULT 0, -- Cost per unit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Inventory Logs table
CREATE TABLE public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('import', 'export', 'sale', 'adjustment')),
    quantity INTEGER NOT NULL, -- positive for import, negative for export/sale
    cost_per_unit_at_time INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Recipes table (Công thức)
CREATE TABLE public.recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type TEXT NOT NULL CHECK (target_type IN ('product', 'topping', 'milk')),
    target_id TEXT NOT NULL, -- product_id, topping_id, or string like 'sữa Oat'
    target_size TEXT, -- 'S', 'M', 'L', or NULL
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    quantity_required INTEGER NOT NULL, -- Amount of ingredient required
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Setup RLS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Create policies (Public access)
CREATE POLICY "Public all ingredients" ON public.ingredients FOR ALL USING (true);
CREATE POLICY "Public all inventory_logs" ON public.inventory_logs FOR ALL USING (true);
CREATE POLICY "Public all recipes" ON public.recipes FOR ALL USING (true);

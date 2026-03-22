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

import { create } from "zustand";
import { Product, Topping, Discount } from "@/types/database";

type CatalogStore = {
  products: Product[];
  toppings: Topping[];
  discounts: Discount[];
  categories: string[];
  lastFetched: number;
  setCatalog: (data: { products: Product[], toppings: Topping[], discounts: Discount[], categories: string[] }) => void;
};

export const useCatalogStore = create<CatalogStore>((set) => ({
  products: [],
  toppings: [],
  discounts: [],
  categories: [],
  lastFetched: 0,
  setCatalog: (data) => set({ ...data, lastFetched: Date.now() })
}));

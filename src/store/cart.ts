import { create } from "zustand";
import { ProductWithQuantity } from "@/types/database";

type CartStore = {
  items: ProductWithQuantity[];
  addItem: (item: ProductWithQuantity) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, amount: number) => void;
  clearCart: () => void;
  getTotal: () => number;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (newItem) => {
    // We could group identical customizations, but for a POS, seeing them individually is fine
    // Or we stack them if everything matches exactly.
    set((state) => {
      const existingItem = state.items.find(
        (i) => 
          i.id === newItem.id &&
          i.size === newItem.size &&
          i.sugar === newItem.sugar &&
          i.ice === newItem.ice &&
          JSON.stringify(i.toppings) === JSON.stringify(newItem.toppings)
      );

      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.cartItemId === existingItem.cartItemId
              ? { ...i, quantity: i.quantity + newItem.quantity, total_price: (i.quantity + newItem.quantity) * i.unit_price }
              : i
          ),
        };
      }
      return { items: [...state.items, newItem] };
    });
  },
  removeItem: (cartItemId) => {
    set((state) => ({ items: state.items.filter((i) => i.cartItemId !== cartItemId) }));
  },
  updateQuantity: (cartItemId, amount) => {
    set((state) => ({
      items: state.items.map((i) => {
        if (i.cartItemId === cartItemId) {
          const newQuantity = Math.max(1, i.quantity + amount);
          return { ...i, quantity: newQuantity, total_price: newQuantity * i.unit_price };
        }
        return i;
      }),
    }));
  },
  clearCart: () => set({ items: [] }),
  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.total_price, 0);
  },
}));

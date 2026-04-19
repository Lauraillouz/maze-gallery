"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { ContentItem } from "@/types/gallery";

export interface CartItem {
  item: ContentItem;
  quantity: number;
}

interface CartContext {
  items: CartItem[];
  addItem: (item: ContentItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContext | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  function addItem(item: ContentItem) {
    setItems((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) return prev.map((c) => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item, quantity: 1 }];
    });
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((c) => c.item.id !== id));
  }

  function clearCart() {
    setItems([]);
  }

  const totalCount = items.reduce((s, c) => s + c.quantity, 0);
  const totalPrice = items.reduce((s, c) => s + (c.item.price ?? 0) * c.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, totalCount, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

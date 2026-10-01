"use client";
import { useState, useEffect, useCallback } from "react";
import { CartItem, MenuItem } from "@/types";

const CART_KEY = (sessionId: string) => `cart_${sessionId}`;

export function useCart(sessionId: string) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    try {
      const stored = localStorage.getItem(CART_KEY(sessionId));
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, [sessionId]);

  const save = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem(CART_KEY(sessionId), JSON.stringify(newItems));
  };

  const addItem = useCallback((item: MenuItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      const updated = existing
        ? prev.map((i) => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
      localStorage.setItem(CART_KEY(sessionId), JSON.stringify(updated));
      return updated;
    });
  }, [sessionId]);

  const removeItem = useCallback((menuItemId: string) => {
    setItems((prev) => {
      const updated = prev
        .map((i) => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter((i) => i.quantity > 0);
      localStorage.setItem(CART_KEY(sessionId), JSON.stringify(updated));
      return updated;
    });
  }, [sessionId]);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_KEY(sessionId));
  }, [sessionId]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, addItem, removeItem, clearCart, total, count };
}

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, serverTimestamp, onSnapshot, Unsubscribe, orderBy, query,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { MenuCategory, MenuItem } from "@/types";

const menuCache = new Map<string, { categories: MenuCategory[]; items: MenuItem[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const menuService = {
  async getCategories(restaurantId: string): Promise<MenuCategory[]> {
    const cached = menuCache.get(restaurantId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.categories;
    const snap = await getDocs(
      query(collection(db, "restaurants", restaurantId, "menuCategories"), orderBy("sortOrder"))
    );
    const categories = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuCategory));
    menuCache.set(restaurantId, { ...menuCache.get(restaurantId) ?? { items: [], ts: Date.now() }, categories, ts: Date.now() });
    return categories;
  },

  async getItems(restaurantId: string): Promise<MenuItem[]> {
    const cached = menuCache.get(restaurantId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.items;
    const snap = await getDocs(
      query(collection(db, "restaurants", restaurantId, "menuItems"), orderBy("sortOrder"))
    );
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem));
    menuCache.set(restaurantId, { ...menuCache.get(restaurantId) ?? { categories: [], ts: Date.now() }, items, ts: Date.now() });
    return items;
  },

  async getBoth(restaurantId: string): Promise<{ categories: MenuCategory[]; items: MenuItem[] }> {
    const cached = menuCache.get(restaurantId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached;
    const [categories, items] = await Promise.all([
      this.getCategories(restaurantId),
      this.getItems(restaurantId),
    ]);
    return { categories, items };
  },

  async createCategory(restaurantId: string, data: Omit<MenuCategory, "id">): Promise<string> {
    const ref = doc(collection(db, "restaurants", restaurantId, "menuCategories"));
    await setDoc(ref, data);
    return ref.id;
  },

  async updateCategory(restaurantId: string, categoryId: string, data: Partial<MenuCategory>): Promise<void> {
    await updateDoc(doc(db, "restaurants", restaurantId, "menuCategories", categoryId), data);
  },

  async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    await deleteDoc(doc(db, "restaurants", restaurantId, "menuCategories", categoryId));
  },

  async createItem(restaurantId: string, data: Omit<MenuItem, "id">): Promise<string> {
    const ref = doc(collection(db, "restaurants", restaurantId, "menuItems"));
    await setDoc(ref, data);
    return ref.id;
  },

  async updateItem(restaurantId: string, itemId: string, data: Partial<MenuItem>): Promise<void> {
    await updateDoc(doc(db, "restaurants", restaurantId, "menuItems", itemId), data);
  },

  async deleteItem(restaurantId: string, itemId: string): Promise<void> {
    await deleteDoc(doc(db, "restaurants", restaurantId, "menuItems", itemId));
  },

  clearCache(restaurantId?: string): void {
    if (restaurantId) menuCache.delete(restaurantId); else menuCache.clear();
  },

  subscribeCategories(restaurantId: string, cb: (cats: MenuCategory[]) => void): Unsubscribe {
    return onSnapshot(
      query(collection(db, "restaurants", restaurantId, "menuCategories"), orderBy("sortOrder")),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuCategory)))
    );
  },

  subscribeItems(restaurantId: string, cb: (items: MenuItem[]) => void): Unsubscribe {
    return onSnapshot(
      query(collection(db, "restaurants", restaurantId, "menuItems"), orderBy("sortOrder")),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)))
    );
  },
};

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, serverTimestamp, onSnapshot, Unsubscribe, orderBy, query,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { MenuCategory, MenuItem } from "@/types";

export const menuService = {
  async getCategories(restaurantId: string): Promise<MenuCategory[]> {
    const snap = await getDocs(
      query(collection(db, "restaurants", restaurantId, "menuCategories"), orderBy("sortOrder"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuCategory));
  },

  async getItems(restaurantId: string): Promise<MenuItem[]> {
    const snap = await getDocs(
      query(collection(db, "restaurants", restaurantId, "menuItems"), orderBy("sortOrder"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem));
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

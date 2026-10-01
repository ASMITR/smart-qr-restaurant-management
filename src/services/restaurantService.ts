import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, query, where, serverTimestamp, onSnapshot,
  Unsubscribe, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Restaurant, RestaurantUser } from "@/types";

const restaurantCache = new Map<string, Restaurant>();

export const restaurantService = {
  async get(id: string): Promise<Restaurant | null> {
    if (restaurantCache.has(id)) return restaurantCache.get(id)!;
    const snap = await getDoc(doc(db, "restaurants", id));
    if (!snap.exists()) return null;
    const rest = { id: snap.id, ...snap.data() } as Restaurant;
    restaurantCache.set(id, rest);
    return rest;
  },

  async create(data: Omit<Restaurant, "id" | "createdAt">): Promise<string> {
    const ref = doc(collection(db, "restaurants"));
    await setDoc(ref, { ...data, createdAt: serverTimestamp() });
    return ref.id;
  },

  async update(id: string, data: Partial<Restaurant>): Promise<void> {
    await updateDoc(doc(db, "restaurants", id), data);
  },

  async getUser(restaurantId: string, userId: string): Promise<RestaurantUser | null> {
    const snap = await getDoc(doc(db, "restaurants", restaurantId, "users", userId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as RestaurantUser) : null;
  },

  async getUsers(restaurantId: string): Promise<RestaurantUser[]> {
    const snap = await getDocs(collection(db, "restaurants", restaurantId, "users"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RestaurantUser));
  },

  async createUser(restaurantId: string, userId: string, data: Omit<RestaurantUser, "id">): Promise<void> {
    await setDoc(doc(db, "restaurants", restaurantId, "users", userId), data);
  },

  async updateUser(restaurantId: string, userId: string, data: Partial<RestaurantUser>): Promise<void> {
    await updateDoc(doc(db, "restaurants", restaurantId, "users", userId), data);
  },

  async deleteUser(restaurantId: string, userId: string): Promise<void> {
    await deleteDoc(doc(db, "restaurants", restaurantId, "users", userId));
  },

  subscribeToRestaurant(id: string, cb: (r: Restaurant | null) => void): Unsubscribe {
    return onSnapshot(doc(db, "restaurants", id), (snap) => {
      const r = snap.exists() ? ({ id: snap.id, ...snap.data() } as Restaurant) : null;
      if (r) restaurantCache.set(id, r); else restaurantCache.delete(id);
      cb(r);
    });
  },

  clearCache(id?: string): void {
    if (id) restaurantCache.delete(id); else restaurantCache.clear();
  },
};

export const auditService = {
  async log(restaurantId: string, entry: {
    userId: string; userRole: string; action: string;
    relevantId?: string; metadata?: Record<string, unknown>;
  }): Promise<void> {
    const ref = doc(collection(db, "restaurants", restaurantId, "auditLogs"));
    await setDoc(ref, { ...entry, restaurantId, timestamp: serverTimestamp() });
  },

  async getRecent(restaurantId: string, limitCount = 50) {
    const snap = await getDocs(
      query(
        collection(db, "restaurants", restaurantId, "auditLogs"),
        orderBy("timestamp", "desc")
      )
    );
    return snap.docs.slice(0, limitCount).map((d) => ({ id: d.id, ...d.data() }));
  },
};

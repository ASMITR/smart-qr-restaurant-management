import {
  collection, doc, setDoc, updateDoc, serverTimestamp,
  onSnapshot, Unsubscribe, query, where, orderBy, getDocs, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { CustomerSession, Order, OrderItem, OrderStatus, CartItem } from "@/types";

export const sessionService = {
  async create(data: Omit<CustomerSession, "id" | "startedAt">): Promise<string> {
    const ref = doc(collection(db, "restaurants", data.restaurantId, "sessions"));
    await setDoc(ref, { ...data, startedAt: serverTimestamp() });
    return ref.id;
  },

  async get(restaurantId: string, sessionId: string): Promise<CustomerSession | null> {
    const snap = await getDoc(doc(db, "restaurants", restaurantId, "sessions", sessionId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as CustomerSession) : null;
  },

  async end(restaurantId: string, sessionId: string): Promise<void> {
    await updateDoc(doc(db, "restaurants", restaurantId, "sessions", sessionId), {
      status: "COMPLETED",
      endedAt: serverTimestamp(),
    });
  },

  subscribe(restaurantId: string, sessionId: string, cb: (s: CustomerSession | null) => void): Unsubscribe {
    return onSnapshot(doc(db, "restaurants", restaurantId, "sessions", sessionId), (snap) => {
      cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as CustomerSession) : null);
    });
  },
};

export const orderService = {
  async create(
    restaurantId: string,
    sessionId: string,
    tableId: string,
    tableNumber: number,
    customerName: string,
    items: CartItem[],
    taxPercent: number,
    serviceChargePercent: number
  ): Promise<string> {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = Math.round(subtotal * taxPercent) / 100;
    const serviceCharge = Math.round(subtotal * serviceChargePercent) / 100;
    const total = subtotal + tax + serviceCharge;

    const orderItems: OrderItem[] = items.map((i) => ({
      id: crypto.randomUUID(),
      menuItemId: i.menuItemId,
      name: i.name,
      quantity: i.quantity,
      priceAtOrderTime: i.price,
      ...(i.notes ? { notes: i.notes } : {}),
    }));

    const ref = doc(collection(db, "restaurants", restaurantId, "orders"));
    await setDoc(ref, {
      restaurantId, tableId, tableNumber, sessionId, customerName,
      items: orderItems,
      status: "PLACED",
      subtotal, tax, serviceCharge, total,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  async updateStatus(restaurantId: string, orderId: string, status: OrderStatus): Promise<void> {
    const tsField: Record<string, string> = {
      ACCEPTED: "acceptedAt", PREPARING: "preparingAt",
      READY: "readyAt", SERVED: "servedAt",
      COMPLETED: "completedAt", CANCELLED: "cancelledAt",
    };
    const update: Record<string, unknown> = { status };
    if (tsField[status]) update[tsField[status]] = serverTimestamp();
    await updateDoc(doc(db, "restaurants", restaurantId, "orders", orderId), update);
  },

  async getBySession(restaurantId: string, sessionId: string): Promise<Order[]> {
    const snap = await getDocs(
      query(
        collection(db, "restaurants", restaurantId, "orders"),
        where("sessionId", "==", sessionId),
        orderBy("createdAt", "asc")
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  },

  subscribeToSession(restaurantId: string, sessionId: string, cb: (orders: Order[]) => void): Unsubscribe {
    return onSnapshot(
      query(
        collection(db, "restaurants", restaurantId, "orders"),
        where("sessionId", "==", sessionId),
        orderBy("createdAt", "asc")
      ),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)))
    );
  },

  subscribeActive(restaurantId: string, cb: (orders: Order[]) => void): Unsubscribe {
    return onSnapshot(
      query(
        collection(db, "restaurants", restaurantId, "orders"),
        where("status", "in", ["PLACED", "ACCEPTED", "PREPARING", "READY"]),
        orderBy("createdAt", "asc")
      ),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)))
    );
  },

  subscribeAll(restaurantId: string, cb: (orders: Order[]) => void): Unsubscribe {
    return onSnapshot(
      query(
        collection(db, "restaurants", restaurantId, "orders"),
        orderBy("createdAt", "desc")
      ),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)))
    );
  },
};

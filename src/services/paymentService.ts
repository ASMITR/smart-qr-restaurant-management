import {
  collection, doc, setDoc, updateDoc, serverTimestamp,
  onSnapshot, Unsubscribe, query, where, orderBy, getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Payment, PaymentMethod, PaymentStatus, Order } from "@/types";

export const paymentService = {
  async create(
    restaurantId: string,
    tableId: string,
    sessionId: string,
    orders: Order[],
    method: PaymentMethod,
    discount = 0
  ): Promise<string> {
    const subtotal = orders.reduce((s, o) => s + o.subtotal, 0);
    const tax = orders.reduce((s, o) => s + o.tax, 0);
    const serviceCharge = orders.reduce((s, o) => s + o.serviceCharge, 0);
    const total = subtotal + tax + serviceCharge - discount;
    const customerName = orders[0]?.customerName ?? "";

    const ref = doc(collection(db, "restaurants", restaurantId, "payments"));
    await setDoc(ref, {
      restaurantId, tableId, sessionId,
      orderIds: orders.map((o) => o.id),
      customerName, subtotal, tax, serviceCharge, discount, total,
      method, status: "PENDING",
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  async confirm(restaurantId: string, paymentId: string, method: PaymentMethod): Promise<void> {
    await updateDoc(doc(db, "restaurants", restaurantId, "payments", paymentId), {
      status: "PAID",
      method,
      paidAt: serverTimestamp(),
    });
  },

  async getBySession(restaurantId: string, sessionId: string): Promise<Payment[]> {
    const snap = await getDocs(
      query(
        collection(db, "restaurants", restaurantId, "payments"),
        where("sessionId", "==", sessionId)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
  },

  subscribeBySession(restaurantId: string, sessionId: string, cb: (payments: Payment[]) => void): Unsubscribe {
    return onSnapshot(
      query(collection(db, "restaurants", restaurantId, "payments"), where("sessionId", "==", sessionId)),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)))
    );
  },
};

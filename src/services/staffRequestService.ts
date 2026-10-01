import {
  collection, doc, setDoc, updateDoc, serverTimestamp,
  onSnapshot, Unsubscribe, query, where, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { StaffRequest } from "@/types";

export const staffRequestService = {
  async create(data: Omit<StaffRequest, "id" | "createdAt" | "status">): Promise<string> {
    const ref = doc(collection(db, "restaurants", data.restaurantId, "staffRequests"));
    await setDoc(ref, { ...data, status: "PENDING", createdAt: serverTimestamp() });
    return ref.id;
  },

  async acknowledge(restaurantId: string, requestId: string): Promise<void> {
    await updateDoc(doc(db, "restaurants", restaurantId, "staffRequests", requestId), {
      status: "ACKNOWLEDGED",
    });
  },

  async resolve(restaurantId: string, requestId: string): Promise<void> {
    await updateDoc(doc(db, "restaurants", restaurantId, "staffRequests", requestId), {
      status: "RESOLVED",
    });
  },

  subscribePending(restaurantId: string, cb: (requests: StaffRequest[]) => void): Unsubscribe {
    return onSnapshot(
      query(
        collection(db, "restaurants", restaurantId, "staffRequests"),
        where("status", "in", ["PENDING", "ACKNOWLEDGED"]),
        orderBy("createdAt", "desc")
      ),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StaffRequest)))
    );
  },
};

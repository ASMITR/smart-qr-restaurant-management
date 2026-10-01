import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, query, where, serverTimestamp, onSnapshot, Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Table, TableStatus } from "@/types";
import { generateQRToken } from "@/lib/qr";

// in-memory cache so token lookup only hits Firestore once per session
const tokenCache = new Map<string, { table: Table; restaurantId: string }>();

export const tableService = {
  async getByToken(token: string): Promise<{ table: Table; restaurantId: string } | null> {
    if (tokenCache.has(token)) return tokenCache.get(token)!;
    const snap = await getDoc(doc(db, "tableTokens", token));
    if (!snap.exists()) return null;
    const { restaurantId, tableId } = snap.data() as { restaurantId: string; tableId: string };
    const tableSnap = await getDoc(doc(db, "restaurants", restaurantId, "tables", tableId));
    if (!tableSnap.exists()) return null;
    const result = { table: { id: tableSnap.id, ...tableSnap.data() } as Table, restaurantId };
    tokenCache.set(token, result);
    return result;
  },

  async getAll(restaurantId: string): Promise<Table[]> {
    const snap = await getDocs(collection(db, "restaurants", restaurantId, "tables"));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Table))
      .sort((a, b) => a.tableNumber - b.tableNumber);
  },

  async create(restaurantId: string, tableNumber: number, capacity?: number): Promise<Table> {
    const qrToken = generateQRToken();
    const ref = doc(collection(db, "restaurants", restaurantId, "tables"));
    const table: Omit<Table, "id"> = {
      restaurantId,
      tableNumber,
      qrToken,
      status: "AVAILABLE",
      activeSessionId: null,
      capacity,
      createdAt: serverTimestamp() as never,
    };
    await setDoc(ref, table);
    // Store token index
    await setDoc(doc(db, "tableTokens", qrToken), { restaurantId, tableId: ref.id });
    return { id: ref.id, ...table };
  },

  async update(restaurantId: string, tableId: string, data: Partial<Table>): Promise<void> {
    await updateDoc(doc(db, "restaurants", restaurantId, "tables", tableId), data);
  },

  async updateStatus(restaurantId: string, tableId: string, status: TableStatus, sessionId?: string | null): Promise<void> {
    await updateDoc(doc(db, "restaurants", restaurantId, "tables", tableId), {
      status,
      activeSessionId: sessionId ?? null,
    });
  },

  async regenerateQR(restaurantId: string, tableId: string, oldToken: string): Promise<string> {
    const newToken = generateQRToken();
    await updateDoc(doc(db, "restaurants", restaurantId, "tables", tableId), { qrToken: newToken });
    // Remove old token, add new
    await deleteDoc(doc(db, "tableTokens", oldToken));
    await setDoc(doc(db, "tableTokens", newToken), { restaurantId, tableId });
    return newToken;
  },

  async delete(restaurantId: string, tableId: string, qrToken: string): Promise<void> {
    await deleteDoc(doc(db, "restaurants", restaurantId, "tables", tableId));
    await deleteDoc(doc(db, "tableTokens", qrToken));
  },

  subscribe(restaurantId: string, cb: (tables: Table[]) => void): Unsubscribe {
    return onSnapshot(collection(db, "restaurants", restaurantId, "tables"), (snap) => {
      const tables = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Table))
        .sort((a, b) => a.tableNumber - b.tableNumber);
      cb(tables);
    });
  },
};

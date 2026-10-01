import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ── Sync table token index on create ─────────────────────────────────────────
export const createTableToken = functions.firestore
  .document("restaurants/{rid}/tables/{tableId}")
  .onCreate(async (snap, ctx) => {
    const { qrToken } = snap.data() as { qrToken: string };
    await db.doc(`tableTokens/${qrToken}`).set({
      restaurantId: ctx.params.rid,
      tableId: ctx.params.tableId,
    });
  });

// ── Invalidate old token on QR regeneration ──────────────────────────────────
export const syncTableToken = functions.firestore
  .document("restaurants/{rid}/tables/{tableId}")
  .onUpdate(async (change, ctx) => {
    const before = change.before.data() as { qrToken: string };
    const after = change.after.data() as { qrToken: string };
    if (before.qrToken === after.qrToken) return;
    await db.doc(`tableTokens/${before.qrToken}`).delete();
    await db.doc(`tableTokens/${after.qrToken}`).set({
      restaurantId: ctx.params.rid,
      tableId: ctx.params.tableId,
    });
  });

// ── Set Firebase custom claims when a restaurant user is written ──────────────
export const setUserClaims = functions.firestore
  .document("restaurants/{rid}/users/{uid}")
  .onWrite(async (change, ctx) => {
    const { rid, uid } = ctx.params;
    if (!change.after.exists) {
      await admin.auth().setCustomUserClaims(uid, {});
      return;
    }
    const data = change.after.data() as { role: string };
    await admin.auth().setCustomUserClaims(uid, { restaurantId: rid, role: data.role });
  });

// ── Razorpay webhook (server-side payment verification) ──────────────────────
export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  // Verify HMAC-SHA256 signature before trusting payload
  const crypto = await import("crypto");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  const signature = req.headers["x-razorpay-signature"] as string;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (signature !== expected) {
    res.status(400).send("Invalid signature");
    return;
  }

  const { event, payload } = req.body;
  if (event !== "payment.captured") { res.status(200).send("Ignored"); return; }

  const payment = payload?.payment?.entity;
  const { restaurantId, paymentId } = payment?.notes ?? {};
  if (!restaurantId || !paymentId) { res.status(400).send("Missing notes"); return; }

  const payRef = db.doc(`restaurants/${restaurantId}/payments/${paymentId}`);
  const paySnap = await payRef.get();
  if (!paySnap.exists) { res.status(404).send("Not found"); return; }
  if (paySnap.data()?.status === "PAID") { res.status(200).send("Already processed"); return; }

  await payRef.update({
    status: "PAID",
    razorpayPaymentId: payment.id,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.status(200).send("OK");
});

// ── Auto-release table when session is marked COMPLETED ──────────────────────
export const onSessionEnd = functions.firestore
  .document("restaurants/{rid}/sessions/{sessionId}")
  .onUpdate(async (change, ctx) => {
    const after = change.after.data() as { status: string; tableId: string };
    if (after.status !== "COMPLETED") return;
    await db.doc(`restaurants/${ctx.params.rid}/tables/${after.tableId}`).update({
      status: "AVAILABLE",
      activeSessionId: null,
    });
  });

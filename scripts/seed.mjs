/**
 * Seed script — run once to bootstrap a restaurant + owner account.
 * Usage: node scripts/seed.mjs
 *
 * Requires: FIREBASE_SERVICE_ACCOUNT env var pointing to your service account JSON path,
 *           or set GOOGLE_APPLICATION_CREDENTIALS.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT ?? "./serviceAccount.json", "utf8")
);

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

async function seed() {
  // 1. Create restaurant
  const restaurantRef = db.collection("restaurants").doc();
  const restaurantId = restaurantRef.id;

  await restaurantRef.set({
    name: "Demo Restaurant",
    address: "123 Main Street, City",
    phone: "+91 98765 43210",
    googleReviewUrl: "https://g.page/r/your-review-link",
    location: { latitude: 18.5204, longitude: 73.8567, allowedRadiusMeters: 100 },
    settings: { taxPercent: 5, serviceChargePercent: 0, currency: "INR", isOpen: true },
    createdAt: Timestamp.now(),
  });
  console.log("✓ Restaurant created:", restaurantId);

  // 2. Create owner user in Firebase Auth
  const email = "owner@demo.com";
  const password = "Demo@1234";
  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName: "Restaurant Owner" });
  } catch (e) {
    userRecord = await auth.getUserByEmail(email);
  }
  console.log("✓ Auth user created:", userRecord.uid);

  // 3. Create user document in restaurant
  await db.doc(`restaurants/${restaurantId}/users/${userRecord.uid}`).set({
    restaurantId,
    email,
    name: "Restaurant Owner",
    role: "OWNER",
    createdAt: Timestamp.now(),
  });
  console.log("✓ User document created");

  // 4. Set custom claims
  await auth.setCustomUserClaims(userRecord.uid, { restaurantId, role: "OWNER" });
  console.log("✓ Custom claims set");

  // 5. Seed menu categories
  const categories = ["Starters", "Main Course", "Pizza", "Burgers", "Beverages", "Desserts"];
  for (let i = 0; i < categories.length; i++) {
    const ref = db.collection(`restaurants/${restaurantId}/menuCategories`).doc();
    await ref.set({ restaurantId, name: categories[i], isActive: true, sortOrder: i });
  }
  console.log("✓ Menu categories seeded");

  // 6. Seed sample tables
  for (let t = 1; t <= 5; t++) {
    const token = "tbl_" + Math.random().toString(36).slice(2, 18);
    const tableRef = db.collection(`restaurants/${restaurantId}/tables`).doc();
    await tableRef.set({
      restaurantId, tableNumber: t, qrToken: token,
      status: "AVAILABLE", activeSessionId: null, capacity: 4,
      createdAt: Timestamp.now(),
    });
    await db.doc(`tableTokens/${token}`).set({ restaurantId, tableId: tableRef.id });
  }
  console.log("✓ 5 tables seeded");

  console.log("\n🎉 Seed complete!");
  console.log(`   Restaurant ID : ${restaurantId}`);
  console.log(`   Login email   : ${email}`);
  console.log(`   Login password: ${password}`);
}

seed().catch(console.error);

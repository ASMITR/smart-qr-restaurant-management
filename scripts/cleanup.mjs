/**
 * Cleanup script — removes all demo transactional data.
 * Keeps: restaurant, users, menuCategories, menuItems, tables, tableTokens
 * Deletes: orders, sessions, payments, staffRequests, auditLogs
 * Also resets all table statuses back to AVAILABLE
 *
 * Usage: node scripts/cleanup.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT ?? "./serviceAccount.json", "utf8")
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function deleteCollection(colRef) {
  const snap = await colRef.get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

async function cleanup() {
  const restaurants = await db.collection("restaurants").get();

  for (const restDoc of restaurants.docs) {
    const rid = restDoc.id;
    console.log(`\nCleaning restaurant: ${rid} (${restDoc.data().name})`);

    const collections = ["orders", "sessions", "payments", "staffRequests", "auditLogs"];
    for (const col of collections) {
      const count = await deleteCollection(db.collection(`restaurants/${rid}/${col}`));
      console.log(`  ✓ Deleted ${count} ${col}`);
    }

    // Reset all tables to AVAILABLE
    const tables = await db.collection(`restaurants/${rid}/tables`).get();
    if (!tables.empty) {
      const batch = db.batch();
      tables.docs.forEach((t) => batch.update(t.ref, { status: "AVAILABLE", activeSessionId: null }));
      await batch.commit();
      console.log(`  ✓ Reset ${tables.size} tables to AVAILABLE`);
    }
  }

  console.log("\n🎉 Cleanup complete! Seed data preserved.");
}

cleanup().catch(console.error);

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const sa = JSON.parse(fs.readFileSync('./serviceAccount.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function fix() {
  const restaurants = await db.collection('restaurants').get();
  let fixed = 0;

  for (const r of restaurants.docs) {
    const tables = await db.collection('restaurants').doc(r.id).collection('tables').get();
    for (const t of tables.docs) {
      const token = t.data().qrToken;
      if (!token) continue;
      const tokenDoc = await db.collection('tableTokens').doc(token).get();
      if (!tokenDoc.exists) {
        await db.collection('tableTokens').doc(token).set({ restaurantId: r.id, tableId: t.id });
        console.log('Fixed missing token:', token, '-> restaurant:', r.id);
        fixed++;
      }
    }
  }

  console.log(`\nDone. Fixed ${fixed} missing token(s).`);
}
fix().catch(console.error);

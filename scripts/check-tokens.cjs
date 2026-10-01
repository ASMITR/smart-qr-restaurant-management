const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const sa = JSON.parse(fs.readFileSync('./serviceAccount.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function check() {
  const tokens = await db.collection('tableTokens').get();
  console.log('tableTokens count:', tokens.size);
  tokens.forEach(d => console.log(' token:', d.id, '->', JSON.stringify(d.data())));

  const restaurants = await db.collection('restaurants').get();
  console.log('\nrestaurants count:', restaurants.size);
  for (const r of restaurants.docs) {
    const tables = await db.collection('restaurants').doc(r.id).collection('tables').get();
    console.log('restaurant:', r.id, '| tables:', tables.size);
    tables.forEach(t => console.log('  table:', t.id, '| token:', t.data().qrToken));
  }
}
check().catch(console.error);

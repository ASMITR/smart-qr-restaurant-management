const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const fs = require('fs');

const sa = JSON.parse(fs.readFileSync('./serviceAccount.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const RESTAURANT_ID = '31oKcWQC9SNBi6DouA1H';

const extraItems = {
  'Starters': [
    { name: 'Veg Manchurian', price: 200, isVeg: true, description: 'Fried veggie balls in Indo-Chinese sauce', prepTime: 12 },
    { name: 'Chicken Lollipop', price: 340, isVeg: false, description: 'Spicy fried chicken lollipops', prepTime: 18 },
    { name: 'Pani Puri', price: 100, isVeg: true, description: 'Crispy puris with tangy tamarind water', prepTime: 5 },
    { name: 'Samosa (2 pcs)', price: 80, isVeg: true, description: 'Crispy pastry with spiced potato filling', prepTime: 8 },
    { name: 'Chilli Chicken', price: 360, isVeg: false, description: 'Indo-Chinese style crispy chilli chicken', prepTime: 18 },
  ],
  'Main Course': [
    { name: 'Egg Curry', price: 280, isVeg: false, description: 'Boiled eggs in spicy onion-tomato gravy', prepTime: 18 },
    { name: 'Rajma Chawal', price: 220, isVeg: true, description: 'Red kidney beans curry with steamed rice', prepTime: 15 },
    { name: 'Chicken Korma', price: 400, isVeg: false, description: 'Mild creamy chicken in yogurt gravy', prepTime: 25 },
    { name: 'Baingan Bharta', price: 240, isVeg: true, description: 'Smoky roasted eggplant curry', prepTime: 18 },
    { name: 'Lamb Biryani', price: 480, isVeg: false, description: 'Slow-cooked lamb with fragrant basmati', prepTime: 40 },
  ],
  'Beverages': [
    { name: 'Rose Sharbat', price: 90, isVeg: true, description: 'Chilled rose flavoured drink', prepTime: 3 },
    { name: 'Banana Milkshake', price: 140, isVeg: true, description: 'Thick creamy banana shake', prepTime: 5 },
    { name: 'Jaljeera', price: 70, isVeg: true, description: 'Tangy cumin spiced cold drink', prepTime: 3 },
    { name: 'Espresso', price: 120, isVeg: true, description: 'Strong single shot espresso', prepTime: 3 },
    { name: 'Thandai', price: 130, isVeg: true, description: 'Chilled milk with nuts and spices', prepTime: 5 },
  ],
  'Desserts': [
    { name: 'Jalebi', price: 100, isVeg: true, description: 'Crispy spiral sweets soaked in syrup', prepTime: 8 },
    { name: 'Ice Cream (2 scoops)', price: 160, isVeg: true, description: 'Choice of vanilla, chocolate or strawberry', prepTime: 3 },
    { name: 'Kheer', price: 120, isVeg: true, description: 'Creamy rice pudding with cardamom', prepTime: 5 },
    { name: 'Malpua', price: 140, isVeg: true, description: 'Fried pancakes soaked in sugar syrup', prepTime: 10 },
    { name: 'Fruit Custard', price: 150, isVeg: true, description: 'Chilled custard with seasonal fruits', prepTime: 5 },
  ],
};

async function seed() {
  const catSnap = await db.collection(`restaurants/${RESTAURANT_ID}/menuCategories`).get();
  const catMap = {};
  catSnap.forEach(d => { catMap[d.data().name] = d.id; });

  let total = 0;
  for (const [catName, items] of Object.entries(extraItems)) {
    const categoryId = catMap[catName];
    if (!categoryId) { console.log('Category not found:', catName); continue; }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const ref = db.collection(`restaurants/${RESTAURANT_ID}/menuItems`).doc();
      await ref.set({
        restaurantId: RESTAURANT_ID,
        categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        isVeg: item.isVeg,
        isAvailable: true,
        preparationTimeMinutes: item.prepTime,
        sortOrder: 100 + i,
        imageUrl: '',
        createdAt: Timestamp.now(),
      });
      total++;
    }
    console.log(`✓ ${catName}: +${items.length} items`);
  }
  console.log(`\n🎉 Added ${total} more items. Total is now 100+`);
}

seed().catch(console.error);

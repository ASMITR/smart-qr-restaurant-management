const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const fs = require('fs');

const sa = JSON.parse(fs.readFileSync('./serviceAccount.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const RESTAURANT_ID = '31oKcWQC9SNBi6DouA1H';

const menuData = {
  'Starters': [
    { name: 'Paneer Tikka', price: 280, isVeg: true, description: 'Marinated cottage cheese grilled in tandoor', prepTime: 15 },
    { name: 'Veg Spring Rolls', price: 180, isVeg: true, description: 'Crispy rolls stuffed with mixed vegetables', prepTime: 10 },
    { name: 'Chicken Tikka', price: 320, isVeg: false, description: 'Tender chicken marinated in spices, grilled', prepTime: 20 },
    { name: 'Hara Bhara Kabab', price: 220, isVeg: true, description: 'Spinach and pea patties with mint chutney', prepTime: 12 },
    { name: 'Chicken Wings', price: 350, isVeg: false, description: 'Spicy buffalo wings with dipping sauce', prepTime: 18 },
    { name: 'Mushroom Tikka', price: 260, isVeg: true, description: 'Button mushrooms marinated and grilled', prepTime: 12 },
    { name: 'Fish Fingers', price: 340, isVeg: false, description: 'Crispy battered fish with tartar sauce', prepTime: 15 },
    { name: 'Dahi Ke Sholay', price: 200, isVeg: true, description: 'Fried bread stuffed with spiced yogurt', prepTime: 10 },
    { name: 'Seekh Kabab', price: 360, isVeg: false, description: 'Minced lamb kababs with onion rings', prepTime: 20 },
    { name: 'Corn Cheese Balls', price: 190, isVeg: true, description: 'Golden fried corn and cheese bites', prepTime: 10 },
  ],
  'Main Course': [
    { name: 'Butter Chicken', price: 380, isVeg: false, description: 'Creamy tomato-based chicken curry', prepTime: 20 },
    { name: 'Paneer Butter Masala', price: 320, isVeg: true, description: 'Cottage cheese in rich buttery gravy', prepTime: 18 },
    { name: 'Dal Makhani', price: 260, isVeg: true, description: 'Slow-cooked black lentils with cream', prepTime: 15 },
    { name: 'Mutton Rogan Josh', price: 450, isVeg: false, description: 'Kashmiri style slow-cooked mutton', prepTime: 30 },
    { name: 'Palak Paneer', price: 300, isVeg: true, description: 'Cottage cheese in spiced spinach gravy', prepTime: 18 },
    { name: 'Chicken Biryani', price: 420, isVeg: false, description: 'Fragrant basmati rice with spiced chicken', prepTime: 35 },
    { name: 'Veg Biryani', price: 320, isVeg: true, description: 'Aromatic rice with mixed vegetables', prepTime: 30 },
    { name: 'Kadai Chicken', price: 390, isVeg: false, description: 'Chicken cooked with bell peppers and spices', prepTime: 22 },
    { name: 'Shahi Paneer', price: 340, isVeg: true, description: 'Paneer in rich cashew and cream gravy', prepTime: 20 },
    { name: 'Fish Curry', price: 400, isVeg: false, description: 'Coastal style fish in coconut gravy', prepTime: 25 },
    { name: 'Chole Bhature', price: 220, isVeg: true, description: 'Spiced chickpeas with fried bread', prepTime: 15 },
    { name: 'Lamb Keema', price: 420, isVeg: false, description: 'Minced lamb cooked with peas and spices', prepTime: 25 },
    { name: 'Aloo Gobi', price: 240, isVeg: true, description: 'Potato and cauliflower dry curry', prepTime: 15 },
    { name: 'Prawn Masala', price: 480, isVeg: false, description: 'Juicy prawns in spicy masala gravy', prepTime: 20 },
    { name: 'Mix Veg Curry', price: 260, isVeg: true, description: 'Seasonal vegetables in tomato gravy', prepTime: 15 },
  ],
  'Pizza': [
    { name: 'Margherita', price: 280, isVeg: true, description: 'Classic tomato sauce with mozzarella', prepTime: 20 },
    { name: 'Pepperoni', price: 380, isVeg: false, description: 'Loaded with spicy pepperoni slices', prepTime: 20 },
    { name: 'BBQ Chicken', price: 420, isVeg: false, description: 'Smoky BBQ sauce with grilled chicken', prepTime: 22 },
    { name: 'Paneer Tikka Pizza', price: 360, isVeg: true, description: 'Indian fusion with tandoori paneer', prepTime: 22 },
    { name: 'Veggie Supreme', price: 320, isVeg: true, description: 'Loaded with fresh garden vegetables', prepTime: 20 },
    { name: 'Chicken Tikka Pizza', price: 400, isVeg: false, description: 'Spiced chicken tikka on pizza base', prepTime: 22 },
    { name: 'Four Cheese', price: 440, isVeg: true, description: 'Mozzarella, cheddar, parmesan, gouda', prepTime: 20 },
    { name: 'Mushroom & Truffle', price: 460, isVeg: true, description: 'Wild mushrooms with truffle oil', prepTime: 22 },
    { name: 'Meat Lovers', price: 480, isVeg: false, description: 'Chicken, pepperoni, sausage, bacon', prepTime: 25 },
    { name: 'Pesto Veggie', price: 340, isVeg: true, description: 'Basil pesto with roasted vegetables', prepTime: 20 },
  ],
  'Burgers': [
    { name: 'Classic Veg Burger', price: 180, isVeg: true, description: 'Crispy veg patty with lettuce and sauce', prepTime: 12 },
    { name: 'Chicken Burger', price: 240, isVeg: false, description: 'Juicy grilled chicken with coleslaw', prepTime: 15 },
    { name: 'Paneer Burger', price: 220, isVeg: true, description: 'Spiced paneer patty with mint mayo', prepTime: 12 },
    { name: 'Double Smash Burger', price: 380, isVeg: false, description: 'Double beef patty with special sauce', prepTime: 18 },
    { name: 'Mushroom Swiss Burger', price: 280, isVeg: true, description: 'Portobello mushroom with swiss cheese', prepTime: 15 },
    { name: 'Crispy Chicken Burger', price: 260, isVeg: false, description: 'Fried chicken fillet with pickles', prepTime: 15 },
    { name: 'BBQ Bacon Burger', price: 420, isVeg: false, description: 'Beef patty with crispy bacon and BBQ', prepTime: 18 },
    { name: 'Aloo Tikki Burger', price: 160, isVeg: true, description: 'Spiced potato patty Indian style', prepTime: 10 },
    { name: 'Zinger Burger', price: 280, isVeg: false, description: 'Spicy crispy chicken with jalapeños', prepTime: 15 },
    { name: 'Veggie Loaded Burger', price: 200, isVeg: true, description: 'Loaded with avocado, tomato, sprouts', prepTime: 12 },
  ],
  'Beverages': [
    { name: 'Mango Lassi', price: 120, isVeg: true, description: 'Chilled yogurt drink with fresh mango', prepTime: 5 },
    { name: 'Cold Coffee', price: 140, isVeg: true, description: 'Blended iced coffee with cream', prepTime: 5 },
    { name: 'Fresh Lime Soda', price: 80, isVeg: true, description: 'Refreshing lime with soda water', prepTime: 3 },
    { name: 'Masala Chai', price: 60, isVeg: true, description: 'Spiced Indian tea with milk', prepTime: 5 },
    { name: 'Strawberry Milkshake', price: 160, isVeg: true, description: 'Thick shake with fresh strawberries', prepTime: 5 },
    { name: 'Virgin Mojito', price: 140, isVeg: true, description: 'Mint, lime, soda with crushed ice', prepTime: 5 },
    { name: 'Watermelon Juice', price: 100, isVeg: true, description: 'Fresh cold-pressed watermelon', prepTime: 5 },
    { name: 'Hot Chocolate', price: 160, isVeg: true, description: 'Rich creamy hot chocolate', prepTime: 5 },
    { name: 'Iced Tea', price: 100, isVeg: true, description: 'Chilled lemon or peach iced tea', prepTime: 3 },
    { name: 'Coconut Water', price: 80, isVeg: true, description: 'Fresh tender coconut water', prepTime: 2 },
  ],
  'Desserts': [
    { name: 'Gulab Jamun', price: 120, isVeg: true, description: 'Soft milk dumplings in sugar syrup', prepTime: 5 },
    { name: 'Chocolate Lava Cake', price: 220, isVeg: true, description: 'Warm cake with molten chocolate center', prepTime: 15 },
    { name: 'Kulfi', price: 140, isVeg: true, description: 'Traditional Indian ice cream on stick', prepTime: 2 },
    { name: 'Tiramisu', price: 260, isVeg: true, description: 'Classic Italian coffee dessert', prepTime: 5 },
    { name: 'Rasgulla', price: 100, isVeg: true, description: 'Soft cottage cheese balls in syrup', prepTime: 5 },
    { name: 'Brownie with Ice Cream', price: 200, isVeg: true, description: 'Warm fudge brownie with vanilla scoop', prepTime: 8 },
    { name: 'Phirni', price: 130, isVeg: true, description: 'Creamy rice pudding with saffron', prepTime: 5 },
    { name: 'Cheesecake', price: 240, isVeg: true, description: 'New York style baked cheesecake', prepTime: 5 },
    { name: 'Gajar Ka Halwa', price: 150, isVeg: true, description: 'Carrot pudding with nuts and ghee', prepTime: 8 },
    { name: 'Panna Cotta', price: 220, isVeg: true, description: 'Italian cream dessert with berry coulis', prepTime: 5 },
  ],
};

async function seed() {
  // Get or create categories
  const catSnap = await db.collection(`restaurants/${RESTAURANT_ID}/menuCategories`).get();
  const catMap = {};
  catSnap.forEach(d => { catMap[d.data().name] = d.id; });

  for (const catName of Object.keys(menuData)) {
    if (!catMap[catName]) {
      const ref = db.collection(`restaurants/${RESTAURANT_ID}/menuCategories`).doc();
      await ref.set({ restaurantId: RESTAURANT_ID, name: catName, isActive: true, sortOrder: Object.keys(catMap).length });
      catMap[catName] = ref.id;
      console.log('Created category:', catName);
    }
  }

  // Seed items
  let total = 0;
  for (const [catName, items] of Object.entries(menuData)) {
    const categoryId = catMap[catName];
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
        sortOrder: i,
        imageUrl: '',
        createdAt: Timestamp.now(),
      });
      total++;
    }
    console.log(`✓ ${catName}: ${items.length} items`);
  }

  console.log(`\n🎉 Seeded ${total} menu items into restaurant ${RESTAURANT_ID}`);
}

seed().catch(console.error);

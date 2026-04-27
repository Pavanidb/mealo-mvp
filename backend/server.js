const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── MEAL DATA ───────────────────────────────────────────────────────────────
const meals = [
  // BREAKFAST
  { id: 1, name: "Masala Oats", category: "breakfast", type: "veg", price: 40, calories: 210, protein: 8, tag: "Healthy Pick", description: "Rolled oats with spiced veggies", bestValue: false },
  { id: 2, name: "Poha with Peanuts", category: "breakfast", type: "veg", price: 35, calories: 280, protein: 7, tag: "Best Choice", description: "Flattened rice tempered with mustard & curry leaves", bestValue: true },
  { id: 3, name: "Egg Bhurji with Bread", category: "breakfast", type: "nonveg", price: 55, calories: 320, protein: 18, tag: "High Energy", description: "Scrambled spiced eggs with toasted bread", bestValue: false },
  { id: 4, name: "Idli Sambar (3 pcs)", category: "breakfast", type: "veg", price: 45, calories: 240, protein: 9, tag: "Healthy Pick", description: "Steamed rice cakes with lentil broth", bestValue: false },
  { id: 5, name: "Upma", category: "breakfast", type: "veg", price: 30, calories: 200, protein: 6, tag: "Best Choice", description: "Semolina porridge with vegetables", bestValue: false },
  // LUNCH
  { id: 6, name: "Dal Rice Thali", category: "lunch", type: "veg", price: 70, calories: 520, protein: 18, tag: "Best Choice", description: "Dal, rice, sabzi, roti & pickle", bestValue: true },
  { id: 7, name: "Chicken Rice Bowl", category: "lunch", type: "nonveg", price: 110, calories: 620, protein: 38, tag: "High Energy", description: "Grilled chicken over jeera rice", bestValue: false },
  { id: 8, name: "Rajma Chawal", category: "lunch", type: "veg", price: 80, calories: 560, protein: 22, tag: "Healthy Pick", description: "Kidney bean curry with steamed rice", bestValue: false },
  { id: 9, name: "Egg Curry + 2 Roti", category: "lunch", type: "nonveg", price: 90, calories: 580, protein: 28, tag: "High Energy", description: "Spiced egg gravy with whole wheat rotis", bestValue: false },
  { id: 10, name: "Paneer Bhurji + Roti", category: "lunch", type: "veg", price: 95, calories: 490, protein: 24, tag: "Healthy Pick", description: "Crumbled cottage cheese with rotis", bestValue: false },
  // SNACKS
  { id: 11, name: "Masala Peanuts", category: "snacks", type: "veg", price: 20, calories: 160, protein: 7, tag: "Best Choice", description: "Crunchy spiced peanuts", bestValue: false },
  { id: 12, name: "Boiled Egg (2 pcs)", category: "snacks", type: "nonveg", price: 25, calories: 140, protein: 12, tag: "Healthy Pick", description: "Protein-packed boiled eggs with spice", bestValue: true },
  { id: 13, name: "Sprouts Chaat", category: "snacks", type: "veg", price: 35, calories: 120, protein: 8, tag: "Healthy Pick", description: "Mixed sprouts with lemon & spices", bestValue: false },
  { id: 14, name: "Banana + Peanut Butter", category: "snacks", type: "veg", price: 40, calories: 200, protein: 6, tag: "High Energy", description: "Energy-packed pre-workout snack", bestValue: false },
];

// ─── VENDOR DATA ─────────────────────────────────────────────────────────────
const vendors = [
  { id: 1, name: "Amma's Tiffin Centre", distance: "0.4 km", type: "Home Food", rating: 4.8, deliveryTime: "20 min", price: "₹60–120/meal", open: true, specialty: "South Indian" },
  { id: 2, name: "Sharma Ji Ki Rasoi", distance: "0.7 km", type: "Home Food", rating: 4.6, deliveryTime: "25 min", price: "₹50–100/meal", open: true, specialty: "North Indian" },
  { id: 3, name: "The Budget Café", distance: "1.1 km", type: "Café", rating: 4.3, deliveryTime: "30 min", price: "₹40–90/meal", open: true, specialty: "Mixed" },
  { id: 4, name: "Meena's Home Kitchen", distance: "1.4 km", type: "Home Food", rating: 4.9, deliveryTime: "35 min", price: "₹70–130/meal", open: false, specialty: "Rajasthani" },
  { id: 5, name: "Green Bowl Express", distance: "1.8 km", type: "Café", rating: 4.5, deliveryTime: "25 min", price: "₹55–110/meal", open: true, specialty: "Healthy" },
  { id: 6, name: "Desi Tadka Tiffins", distance: "2.2 km", type: "Home Food", rating: 4.4, deliveryTime: "40 min", price: "₹45–95/meal", open: true, specialty: "Punjabi" },
];

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// GET /meals — optional ?budget=&category=&type=&search=
app.get('/meals', (req, res) => {
  let { budget, category, type, search } = req.query;
  let filtered = [...meals];

  if (budget) filtered = filtered.filter(m => m.price <= Number(budget));
  if (category && category !== 'all') filtered = filtered.filter(m => m.category === category);
  if (type && type !== 'all') filtered = filtered.filter(m => m.type === type);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
  }

  // Recommend best value in each category
  const categories = ['breakfast', 'lunch', 'snacks'];
  const recommendations = {};
  categories.forEach(cat => {
    const catMeals = filtered.filter(m => m.category === cat);
    if (catMeals.length > 0) {
      // Best value = highest protein/price ratio
      recommendations[cat] = catMeals.reduce((best, m) =>
        (m.protein / m.price) > (best.protein / best.price) ? m : best
      ).id;
    }
  });

  res.json({ meals: filtered, recommendations, total: filtered.length });
});

// GET /vendors
app.get('/vendors', (req, res) => {
  res.json({ vendors });
});

// POST /order
app.post('/order', (req, res) => {
  const { items, totalAmount, deliveryAddress } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: "No items in order" });
  }

  const orderId = `MEALO-${Date.now().toString(36).toUpperCase()}`;
  const estimatedTime = Math.floor(Math.random() * 20) + 20; // 20–40 min

  res.json({
    success: true,
    orderId,
    message: "Order placed (simulation)",
    summary: {
      items,
      totalAmount,
      estimatedTime: `${estimatedTime} minutes`,
      status: "Confirmed",
      placedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🍱 Mealo server running at http://localhost:${PORT}\n`);
});
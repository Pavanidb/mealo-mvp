/* ── STATE ─────────────────────────────────────────────────────── */
const API = 'https://mealo-backend-z303.onrender.com';

let state = {
  budget: 0,
  remaining: 0,
  spent: 0,
  meals: [],
  vendors: [],
  recommendations: {},
  selected: [],        // array of meal objects
  filters: { type: 'all', category: 'all', search: '' },
};

const MEAL_EMOJIS = {
  'Masala Oats': '🥣', 'Poha with Peanuts': '🍚', 'Egg Bhurji with Bread': '🍳',
  'Idli Sambar (3 pcs)': '🫓', 'Upma': '🍜',
  'Dal Rice Thali': '🍱', 'Chicken Rice Bowl': '🍗', 'Rajma Chawal': '🫘',
  'Egg Curry + 2 Roti': '🥘', 'Paneer Bhurji + Roti': '🧆',
  'Masala Peanuts': '🥜', 'Boiled Egg (2 pcs)': '🥚',
  'Sprouts Chaat': '🌱', 'Banana + Peanut Butter': '🍌',
};

/* ── BOOTSTRAP ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('budgetInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') discoverMeals();
  });
});

/* ── HERO ACTIONS ──────────────────────────────────────────────── */
function setPreset(val) {
  document.getElementById('budgetInput').value = val;
  document.querySelectorAll('.preset').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

async function discoverMeals() {
  const input = document.getElementById('budgetInput');
  const budget = parseInt(input.value);
  if (!budget || budget < 10) {
    input.style.border = '2px solid #ef4444';
    input.style.animation = 'shake .3s ease';
    setTimeout(() => { input.style.border = ''; input.style.animation = ''; }, 600);
    return;
  }

  state.budget = budget;
  state.remaining = budget;
  state.spent = 0;
  state.selected = [];
  state.filters = { type: 'all', category: 'all', search: '' };

  document.getElementById('mainContent').style.display = 'block';
  document.querySelector('section.hero').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  updateBudgetBar();
  resetFilterUI();
  await Promise.all([fetchMeals(), fetchVendors()]);
}

function resetToHero() {
  document.querySelector('section.hero').style.display = 'block';
  document.getElementById('mainContent').style.display = 'none';
  document.getElementById('budgetInput').value = '';
  state.selected = [];
  updateCartUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── API CALLS ─────────────────────────────────────────────────── */
async function fetchMeals() {
  const { type, category, search } = state.filters;
  const params = new URLSearchParams({ budget: state.budget });
  if (type !== 'all') params.set('type', type);
  if (category !== 'all') params.set('category', category);
  if (search) params.set('search', search);

  try {
    const res = await fetch(`${API}/meals?${params}`);
    const data = await res.json();
    state.meals = data.meals;
    state.recommendations = data.recommendations;
    renderMeals();
  } catch (err) {
    console.error('Failed to fetch meals', err);
    document.getElementById('mealGrid').innerHTML =
      '<div class="no-meals"><span>⚠️</span><p>Could not connect to server. Make sure the backend is running.</p></div>';
  }
}

async function fetchVendors() {
  try {
    const res = await fetch(`${API}/vendors`);
    const data = await res.json();
    state.vendors = data.vendors;
    renderVendors();
  } catch (err) { console.error('Failed to fetch vendors', err); }
}

/* ── RENDER MEALS ──────────────────────────────────────────────── */
function renderMeals() {
  const grid = document.getElementById('mealGrid');
  const count = document.getElementById('mealCount');

  if (state.meals.length === 0) {
    count.textContent = 'No meals found';
    grid.innerHTML = '<div class="no-meals"><span>😔</span><p>No meals match your filters. Try adjusting your budget or filters.</p></div>';
    return;
  }

  count.textContent = `Showing ${state.meals.length} meal${state.meals.length !== 1 ? 's' : ''}`;

  const recIds = Object.values(state.recommendations);
  grid.innerHTML = state.meals.map((meal, i) => {
    const isSelected = state.selected.some(s => s.id === meal.id);
    const isOverBudget = !isSelected && meal.price > state.remaining;
    const isBestValue = recIds.includes(meal.id);
    const emoji = MEAL_EMOJIS[meal.name] || '🍽️';
    const tagClass = meal.tag === 'Healthy Pick' ? 'healthy' : meal.tag === 'Best Choice' ? 'best' : 'energy';

    return `
    <div class="meal-card ${isSelected ? 'selected' : ''} ${isOverBudget ? 'over-budget' : ''} ${isBestValue ? 'best-value' : ''}"
         id="card-${meal.id}"
         onclick="toggleMeal(${meal.id})"
         style="animation-delay: ${i * 40}ms">
      <div class="selected-badge">✓</div>
      <div class="meal-emoji">${emoji}</div>
      <div class="meal-header">
        <div class="meal-name">${meal.name}</div>
        <div class="meal-price">₹${meal.price}</div>
      </div>
      <div class="meal-desc">${meal.description}</div>
      <div class="meal-stats">
        <div class="stat-chip"><strong>${meal.calories}</strong> kcal</div>
        <div class="stat-chip"><strong>${meal.protein}g</strong> protein</div>
        <div class="stat-chip">${capitalize(meal.category)}</div>
      </div>
      <div class="meal-footer">
        <span class="tag ${tagClass}">${meal.tag}</span>
        <button class="add-btn" title="${isSelected ? 'Remove' : 'Add to order'}">
          ${isSelected ? '✓' : '+'}
        </button>
      </div>
    </div>`;
  }).join('');
}

/* ── MEAL SELECTION ────────────────────────────────────────────── */
function toggleMeal(id) {
  const meal = state.meals.find(m => m.id === id);
  if (!meal) return;

  const idx = state.selected.findIndex(s => s.id === id);
  if (idx === -1) {
    if (meal.price > state.remaining) return;
    state.selected.push(meal);
    state.spent += meal.price;
    state.remaining -= meal.price;
  } else {
    state.selected.splice(idx, 1);
    state.spent -= meal.price;
    state.remaining += meal.price;
  }

  updateBudgetBar();
  updateCartUI();
  renderMeals(); // re-render to update over-budget states
}

/* ── RENDER VENDORS ────────────────────────────────────────────── */
function renderVendors() {
  const list = document.getElementById('vendorList');
  list.innerHTML = state.vendors.map(v => `
    <div class="vendor-card ${v.open ? '' : 'closed'}">
      <div class="vendor-top">
        <div class="vendor-name">${v.name}</div>
        <div class="vendor-rating">⭐ ${v.rating}</div>
      </div>
      <div class="vendor-meta">
        <span class="vendor-chip">📍 ${v.distance}</span>
        <span class="vendor-chip">⏱ ${v.deliveryTime}</span>
        <span class="vendor-chip">${v.price}</span>
        <span class="vendor-chip">🍴 ${v.specialty}</span>
        ${!v.open ? '<span class="closed-tag">Closed</span>' : ''}
      </div>
      <span class="vendor-type-badge ${v.type === 'Home Food' ? 'badge-home' : 'badge-cafe'}">
        ${v.type === 'Home Food' ? '🏠' : '☕'} ${v.type}
      </span>
    </div>
  `).join('');
}

/* ── BUDGET BAR ────────────────────────────────────────────────── */
function updateBudgetBar() {
  document.getElementById('totalBudget').textContent = `₹${state.budget}`;
  document.getElementById('remainingBudget').textContent = `₹${state.remaining}`;
  document.getElementById('selectedCount').textContent = `${state.selected.length} item${state.selected.length !== 1 ? 's' : ''}`;

  const pct = Math.round((state.spent / state.budget) * 100);
  document.getElementById('budgetFill').style.width = `${Math.min(pct, 100)}%`;
  document.getElementById('budgetPct').textContent = `${pct}% used`;

  if (pct > 90) {
    document.getElementById('budgetFill').style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
  } else {
    document.getElementById('budgetFill').style.background = 'linear-gradient(90deg, var(--green), var(--yellow))';
  }
}

/* ── FILTERS ───────────────────────────────────────────────────── */
function setType(btn, type) {
  state.filters.type = type;
  document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  fetchMeals();
}

function setCat(btn, cat) {
  state.filters.category = cat;
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  fetchMeals();
}

function applyFilters() {
  state.filters.search = document.getElementById('searchInput').value;
  fetchMeals();
}

function resetFilterUI() {
  document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
  document.querySelector('.pill[data-type="all"]').classList.add('active');
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  document.querySelector('.cat-pill[data-cat="all"]').classList.add('active');
  document.getElementById('searchInput').value = '';
}

/* ── CART ──────────────────────────────────────────────────────── */
function toggleCart() {
  document.getElementById('cartDrawer').classList.toggle('open');
  document.getElementById('cartOverlay').classList.toggle('active');
}

function updateCartUI() {
  const count = state.selected.length;
  document.getElementById('cartCount').textContent = count;

  const body = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');
  const total = state.selected.reduce((s, m) => s + m.price, 0);
  document.getElementById('cartTotal').textContent = `₹${total}`;

  if (count === 0) {
    body.innerHTML = '<div class="cart-empty"><span>🍽️</span><p>No meals selected yet</p></div>';
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'block';
  body.innerHTML = state.selected.map(m => `
    <div class="cart-item">
      <span class="cart-item-name">${MEAL_EMOJIS[m.name] || '🍽️'} ${m.name}</span>
      <span class="cart-item-price">₹${m.price}</span>
      <button class="cart-item-remove" onclick="toggleMeal(${m.id})" title="Remove">✕</button>
    </div>
  `).join('');
}

/* ── ORDER ─────────────────────────────────────────────────────── */
async function placeOrder() {
  if (state.selected.length === 0) return;

  const items = state.selected.map(m => ({ id: m.id, name: m.name, price: m.price }));
  const totalAmount = state.spent;

  try {
    const res = await fetch(`${API}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, totalAmount }),
    });
    const data = await res.json();

    if (data.success) {
      toggleCart();
      showOrderModal(data);
    }
  } catch (err) {
    console.error('Order failed', err);
    alert('Could not connect to server. Make sure the backend is running.');
  }
}

function showOrderModal(data) {
  const { orderId, summary } = data;
  document.getElementById('modalDetails').innerHTML = `
    <div class="modal-row"><strong>Order ID</strong><span class="modal-order-id">${orderId}</span></div>
    <div class="modal-row"><strong>Items</strong><span>${summary.items.length} meal${summary.items.length !== 1 ? 's' : ''}</span></div>
    <div class="modal-row"><strong>Total Paid</strong><span>₹${summary.totalAmount}</span></div>
    <div class="modal-row"><strong>Estimated Time</strong><span>⏱ ${summary.estimatedTime}</span></div>
    <div class="modal-row"><strong>Status</strong><span>✅ ${summary.status}</span></div>
    <div class="modal-row"><strong>Placed At</strong><span>${summary.placedAt}</span></div>
  `;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  // Reset selection after successful order
  state.selected = [];
  state.spent = 0;
  state.remaining = state.budget;
  updateBudgetBar();
  updateCartUI();
  renderMeals();
}

/* ── UTILS ─────────────────────────────────────────────────────── */
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
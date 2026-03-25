// ============================================================
// QuickBite Drive-Thru — Backend API (Node.js + Express)
// ============================================================
// File: backend/server.js
// Deploy to: Render.com

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'quickbite-secret-2025';

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(morgan('dev'));

// ── In-Memory "Database" (replace with MongoDB/Postgres) ──────
const db = {
  users: [
    { id: 'u1', name: 'Admin User',    email: 'admin@quickbite.com',   password: bcrypt.hashSync('admin123', 10),  role: 'admin'    },
    { id: 'u2', name: 'John Customer', email: 'john@example.com',      password: bcrypt.hashSync('pass123', 10),   role: 'customer' },
  ],
  menuItems: [
    { id: 'm1', name: 'Double Smash Burger',     category: 'Burgers',  price: 8.99,  emoji: '🍔', available: true, prepTime: 5  },
    { id: 'm2', name: 'Crispy Chicken Sandwich', category: 'Burgers',  price: 7.49,  emoji: '🥪', available: true, prepTime: 6  },
    { id: 'm3', name: 'Bacon BBQ Stack',         category: 'Burgers',  price: 10.99, emoji: '🍔', available: true, prepTime: 7  },
    { id: 'm4', name: 'Large Fries',             category: 'Sides',    price: 3.49,  emoji: '🍟', available: true, prepTime: 3  },
    { id: 'm5', name: 'Onion Rings',             category: 'Sides',    price: 3.99,  emoji: '🧅', available: true, prepTime: 4  },
    { id: 'm6', name: 'Chocolate Milkshake',     category: 'Drinks',   price: 5.99,  emoji: '🥤', available: true, prepTime: 2  },
    { id: 'm7', name: 'Fountain Drink',          category: 'Drinks',   price: 1.99,  emoji: '🥤', available: true, prepTime: 1  },
    { id: 'm8', name: 'Hot Apple Pie',           category: 'Desserts', price: 2.49,  emoji: '🥧', available: true, prepTime: 2  },
  ],
  stores: [
    { id: 's1', name: 'QuickBite Downtown', address: '123 Main St', city: 'New York', state: 'NY', zip: '10001', lat: 40.7505, lng: -73.9934, phone: '212-555-0100', hours: { mon:'00:00-23:59', tue:'00:00-23:59', wed:'00:00-23:59', thu:'00:00-23:59', fri:'00:00-23:59', sat:'00:00-23:59', sun:'00:00-23:59' }, features: ['drivethru','24h','wifi'], isOpen: true },
    { id: 's2', name: 'QuickBite Midtown',  address: '456 Central Ave', city: 'New York', state: 'NY', zip: '10018', lat: 40.7549, lng: -73.9840, phone: '212-555-0200', hours: { mon:'06:00-24:00', tue:'06:00-24:00', wed:'06:00-24:00', thu:'06:00-24:00', fri:'06:00-24:00', sat:'07:00-24:00', sun:'07:00-23:00' }, features: ['drivethru','wifi'], isOpen: true },
    { id: 's3', name: 'QuickBite Airport', address: 'Terminal B, Airport Rd', city: 'New York', state: 'NY', zip: '11430', lat: 40.6413, lng: -73.7781, phone: '718-555-0300', hours: { mon:'00:00-23:59', tue:'00:00-23:59', wed:'00:00-23:59', thu:'00:00-23:59', fri:'00:00-23:59', sat:'00:00-23:59', sun:'00:00-23:59' }, features: ['drivethru','24h'], isOpen: true },
  ],
  orders: [],
};

// ── Auth Middleware ───────────────────────────────────────────
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

// ── Helper: Calculate Estimated Prep Time ────────────────────
function calcEstimatedTime(items) {
  const activeOrders = db.orders.filter(o => ['received','preparing'].includes(o.status)).length;
  const basePrepTime = Math.max(...items.map(i => {
    const menuItem = db.menuItems.find(m => m.id === i.menuItemId);
    return menuItem ? menuItem.prepTime * i.quantity : 5;
  }));
  const queueDelay = Math.floor(activeOrders / 3) * 2; // +2 min per 3 active orders
  return basePrepTime + queueDelay;
}

// ── AUTH ROUTES ───────────────────────────────────────────────
// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (db.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' });
    const user = { id: uuidv4(), name, email, password: await bcrypt.hash(password, 10), role };
    db.users.push(user);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

// ── MENU ROUTES ───────────────────────────────────────────────
// GET /api/menu
app.get('/api/menu', (req, res) => {
  const { category, available } = req.query;
  let items = db.menuItems;
  if (category) items = items.filter(i => i.category.toLowerCase() === category.toLowerCase());
  if (available !== undefined) items = items.filter(i => i.available === (available === 'true'));
  res.json(items);
});

// GET /api/menu/categories
app.get('/api/menu/categories', (req, res) => {
  const categories = [...new Set(db.menuItems.map(i => i.category))];
  res.json(categories);
});

// GET /api/menu/:id
app.get('/api/menu/:id', (req, res) => {
  const item = db.menuItems.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// POST /api/menu (admin)
app.post('/api/menu', authenticate, requireAdmin, (req, res) => {
  const { name, category, price, emoji, prepTime } = req.body;
  if (!name || !category || !price) return res.status(400).json({ error: 'name, category, price required' });
  const item = { id: 'm' + uuidv4().slice(0,8), name, category, price: parseFloat(price), emoji: emoji || '🍔', available: true, prepTime: prepTime || 5 };
  db.menuItems.push(item);
  res.status(201).json(item);
});

// PUT /api/menu/:id (admin)
app.put('/api/menu/:id', authenticate, requireAdmin, (req, res) => {
  const idx = db.menuItems.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  db.menuItems[idx] = { ...db.menuItems[idx], ...req.body, id: req.params.id };
  res.json(db.menuItems[idx]);
});

// DELETE /api/menu/:id (admin)
app.delete('/api/menu/:id', authenticate, requireAdmin, (req, res) => {
  const idx = db.menuItems.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  db.menuItems.splice(idx, 1);
  res.json({ message: 'Item deleted' });
});

// ── ORDER ROUTES ──────────────────────────────────────────────
// POST /api/orders
app.post('/api/orders', authenticate, (req, res) => {
  try {
    const { storeId, items, pickupType, vehicleDescription } = req.body;
    if (!storeId || !items?.length) return res.status(400).json({ error: 'storeId and items required' });

    // Validate items
    const orderItems = items.map(i => {
      const menuItem = db.menuItems.find(m => m.id === i.menuItemId);
      if (!menuItem) throw new Error(`Menu item ${i.menuItemId} not found`);
      if (!menuItem.available) throw new Error(`${menuItem.name} is unavailable`);
      return { menuItemId: i.menuItemId, name: menuItem.name, emoji: menuItem.emoji, quantity: i.quantity, unitPrice: menuItem.price, total: menuItem.price * i.quantity };
    });

    const subtotal  = orderItems.reduce((s, i) => s + i.total, 0);
    const tax       = subtotal * 0.08;
    const totalAmt  = subtotal + tax;
    const estimatedTime = calcEstimatedTime(orderItems);
    const order     = {
      id:             'QB-' + String(db.orders.length + 2848).padStart(4, '0'),
      userId:         req.user.id,
      storeId,
      items:          orderItems,
      subtotal:       parseFloat(subtotal.toFixed(2)),
      tax:            parseFloat(tax.toFixed(2)),
      total:          parseFloat(totalAmt.toFixed(2)),
      pickupType:     pickupType || 'counter',  // 'drivethru' | 'counter'
      vehicleDescription: vehicleDescription || null,
      status:         'received',               // received → preparing → ready → completed
      estimatedTime,
      placedAt:       new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    };
    db.orders.push(order);
    res.status(201).json(order);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/orders (admin = all, customer = own)
app.get('/api/orders', authenticate, (req, res) => {
  const { status, storeId, page = 1, limit = 20 } = req.query;
  let orders = req.user.role === 'admin' ? db.orders : db.orders.filter(o => o.userId === req.user.id);
  if (status)  orders = orders.filter(o => o.status === status);
  if (storeId) orders = orders.filter(o => o.storeId === storeId);
  orders = [...orders].sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  const total = orders.length;
  orders = orders.slice((page - 1) * limit, page * limit);
  res.json({ orders, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/orders/:id
app.get('/api/orders/:id', authenticate, (req, res) => {
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (req.user.role !== 'admin' && order.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  res.json(order);
});

// PATCH /api/orders/:id/status (admin)
app.patch('/api/orders/:id/status', authenticate, requireAdmin, (req, res) => {
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const validStatuses = ['received','preparing','ready','completed','rejected'];
  const { status } = req.body;
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  order.status    = status;
  order.updatedAt = new Date().toISOString();
  if (status === 'preparing') order.preparingAt = new Date().toISOString();
  if (status === 'ready')     order.readyAt     = new Date().toISOString();
  if (status === 'completed') order.completedAt = new Date().toISOString();
  res.json(order);
});

// ── STORE ROUTES ──────────────────────────────────────────────
// GET /api/stores
app.get('/api/stores', (req, res) => {
  const { lat, lng, radius = 10 } = req.query;
  let stores = db.stores;
  if (lat && lng) {
    stores = stores.map(s => ({
      ...s,
      distance: calcDistance(parseFloat(lat), parseFloat(lng), s.lat, s.lng)
    })).filter(s => s.distance <= parseFloat(radius))
       .sort((a, b) => a.distance - b.distance);
  }
  res.json(stores);
});

// GET /api/stores/:id
app.get('/api/stores/:id', (req, res) => {
  const store = db.stores.find(s => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  res.json(store);
});

// PATCH /api/stores/:id (admin)
app.patch('/api/stores/:id', authenticate, requireAdmin, (req, res) => {
  const store = db.stores.find(s => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  Object.assign(store, req.body, { id: store.id });
  res.json(store);
});

// ── ANALYTICS (admin) ─────────────────────────────────────────
app.get('/api/analytics', authenticate, requireAdmin, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = db.orders.filter(o => o.placedAt.startsWith(today));
  const revenue     = todayOrders.reduce((s, o) => s + o.total, 0);
  const driveThru   = todayOrders.filter(o => o.pickupType === 'drivethru').length;
  const statusCount = db.orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});

  // Top items
  const itemCounts  = {};
  db.orders.forEach(o => o.items.forEach(i => { itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity; }));
  const topItems    = Object.entries(itemCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name,count]) => ({ name, count }));

  res.json({
    today: { orders: todayOrders.length, revenue: parseFloat(revenue.toFixed(2)), driveThru },
    allTime: { orders: db.orders.length, statusBreakdown: statusCount },
    topItems,
  });
});

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Distance Helper (Haversine) ───────────────────────────────
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2));
}

// ── 404 & Error handlers ──────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🍔 QuickBite API running on port ${PORT}`));

module.exports = app;

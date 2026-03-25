// ============================================================
// QuickBite — Next.js Frontend Structure & Key Files
// ============================================================

// ── FILE: frontend/package.json ───────────────────────────────
/*
{
  "name": "quickbite-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "^18",
    "react-dom": "^18",
    "axios": "^1.6.2",
    "zustand": "^4.4.7",
    "@react-google-maps/api": "^2.19.3",
    "framer-motion": "^10.16.16",
    "react-hot-toast": "^2.4.1",
    "react-icons": "^4.12.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
*/

// ── FILE: frontend/src/lib/api.js ─────────────────────────────
// Central API client
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use(cfg => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('qb_token') : null;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const authAPI = {
  login:    (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  me:       ()     => API.get('/auth/me'),
};

export const menuAPI = {
  getAll:      (params) => API.get('/menu', { params }),
  getById:     (id)     => API.get(`/menu/${id}`),
  getCategories:()      => API.get('/menu/categories'),
  create:      (data)   => API.post('/menu', data),
  update:      (id, d)  => API.put(`/menu/${id}`, d),
  delete:      (id)     => API.delete(`/menu/${id}`),
};

export const orderAPI = {
  create:      (data)   => API.post('/orders', data),
  getAll:      (params) => API.get('/orders', { params }),
  getById:     (id)     => API.get(`/orders/${id}`),
  updateStatus:(id, s)  => API.patch(`/orders/${id}/status`, { status: s }),
};

export const storeAPI = {
  getAll:      (params) => API.get('/stores', { params }),
  getById:     (id)     => API.get(`/stores/${id}`),
  update:      (id, d)  => API.patch(`/stores/${id}`, d),
};

export const analyticsAPI = {
  get: () => API.get('/analytics'),
};

export default API;


// ── FILE: frontend/src/store/cartStore.js ────────────────────
// Zustand cart state management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: {},
      pickupType: 'drivethru',
      selectedStore: null,
      vehicleDescription: '',

      addItem: (menuItem) => set(state => {
        const existing = state.items[menuItem.id];
        return { items: { ...state.items, [menuItem.id]: existing
          ? { ...existing, quantity: existing.quantity + 1 }
          : { ...menuItem, quantity: 1 }
        }};
      }),

      removeItem: (id) => set(state => {
        const { [id]: _, ...rest } = state.items;
        return { items: rest };
      }),

      updateQty: (id, qty) => set(state => {
        if (qty <= 0) { const { [id]: _, ...rest } = state.items; return { items: rest }; }
        return { items: { ...state.items, [id]: { ...state.items[id], quantity: qty } } };
      }),

      clearCart: () => set({ items: {} }),
      setPickupType: (type) => set({ pickupType: type }),
      setStore: (store) => set({ selectedStore: store }),

      get subtotal() {
        return Object.values(get().items).reduce((s, i) => s + i.price * i.quantity, 0);
      },
      get itemCount() {
        return Object.values(get().items).reduce((s, i) => s + i.quantity, 0);
      },
    }),
    { name: 'quickbite-cart' }
  )
);

export default useCartStore;


// ── FILE: frontend/src/store/authStore.js ────────────────────
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user:  null,
      token: null,
      setAuth: (user, token) => { localStorage.setItem('qb_token', token); set({ user, token }); },
      logout:  ()            => { localStorage.removeItem('qb_token');      set({ user: null, token: null }); },
      isAdmin: () => useAuthStore.getState().user?.role === 'admin',
    }),
    { name: 'quickbite-auth' }
  )
);

export default useAuthStore;


// ── FILE: frontend/src/app/page.jsx ──────────────────────────
// Homepage
'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} transition={{duration:0.7}}>
          <div className="hero-badge">🚗 Drive-Thru Now Open</div>
          <h1>Order <span className="accent">Fast</span>, Eat <span className="red">Faster</span></h1>
          <p>Skip the line. Order online. Pull up and pick up.</p>
          <div className="hero-actions">
            <Link href="/menu"><button className="btn-primary">Order Now →</button></Link>
            <Link href="/stores"><button className="btn-secondary">Find Stores</button></Link>
          </div>
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="features">
        {[
          { icon:'🚗', title:'Smart Drive-Thru',   desc:'Order ahead, skip the speaker.' },
          { icon:'📍', title:'Store Locator',       desc:'Find nearest open location.' },
          { icon:'⚡', title:'Live Order Tracking', desc:'Real-time status updates.' },
          { icon:'🤖', title:'AI Recommendations', desc:'Personalised meal suggestions.' },
        ].map(f => (
          <motion.div key={f.title} className="feature-card" whileHover={{y:-4}}>
            <span className="feature-icon">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </motion.div>
        ))}
      </section>
    </main>
  );
}


// ── FILE: frontend/src/app/menu/page.jsx ─────────────────────
'use client';
import { useState, useEffect } from 'react';
import { menuAPI } from '@/lib/api';
import useCartStore from '@/store/cartStore';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function MenuPage() {
  const [items, setItems]     = useState([]);
  const [cats, setCats]       = useState(['All']);
  const [active, setActive]   = useState('All');
  const { addItem }           = useCartStore();

  useEffect(() => {
    menuAPI.getAll().then(r => setItems(r.data));
    menuAPI.getCategories().then(r => setCats(['All', ...r.data]));
  }, []);

  const filtered = active === 'All' ? items : items.filter(i => i.category === active);

  return (
    <div className="menu-layout">
      <div className="menu-main">
        {/* Category tabs */}
        <div className="category-tabs">
          {cats.map(c => (
            <button key={c} className={`tab-btn ${active===c?'active':''}`} onClick={() => setActive(c)}>{c}</button>
          ))}
        </div>

        {/* AI Recommendations strip */}
        <div className="ai-recs-bar">
          <span className="ai-badge">AI</span>
          <span>Recommended right now:</span>
          {items.filter(i => i.aiPick).map(i => (
            <button key={i.id} className="ai-chip" onClick={() => { addItem(i); toast.success(`${i.name} added!`); }}>
              {i.emoji} {i.name}
            </button>
          ))}
        </div>

        {/* Menu grid */}
        <div className="menu-grid">
          <AnimatePresence>
            {filtered.map(item => (
              <motion.div key={item.id} className="menu-card"
                initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
                whileHover={{y:-3}}
              >
                <div className="menu-img">{item.emoji}</div>
                <div className="menu-info">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="menu-footer">
                    <span className="price">${item.price.toFixed(2)}</span>
                    <button className="add-btn" onClick={() => { addItem(item); toast.success('Added to cart!'); }}>+</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Cart Sidebar — imported component */}
      <CartSidebar />
    </div>
  );
}


// ── FILE: frontend/src/app/track/[orderId]/page.jsx ──────────
'use client';
import { useState, useEffect } from 'react';
import { orderAPI } from '@/lib/api';

const STATUS_STEPS = [
  { key:'received',   label:'Order Received',   icon:'✅', desc:'We got your order!' },
  { key:'preparing',  label:'Preparing',         icon:'👨‍🍳', desc:'Kitchen is cooking your food' },
  { key:'ready',      label:'Ready for Pickup',  icon:'🔔', desc:'Head to the window or counter' },
  { key:'completed',  label:'Completed',         icon:'🎉', desc:'Enjoy your meal!' },
];

export default function TrackOrderPage({ params }) {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    orderAPI.getById(params.orderId).then(r => setOrder(r.data));
    // Poll every 15s for live updates
    const interval = setInterval(() =>
      orderAPI.getById(params.orderId).then(r => setOrder(r.data)), 15000);
    return () => clearInterval(interval);
  }, [params.orderId]);

  if (!order) return <div className="loading">Loading order...</div>;

  const currentIdx = STATUS_STEPS.findIndex(s => s.key === order.status);

  return (
    <div className="track-container">
      <h1>Track Order <span className="yellow">{order.id}</span></h1>
      <div className="track-meta">
        <span>{order.pickupType === 'drivethru' ? '🚗 Drive-Thru — Lane 2' : '🏪 Counter Pickup'}</span>
        <span>Est. {order.estimatedTime} min</span>
      </div>

      <div className="status-timeline">
        {STATUS_STEPS.map((step, i) => (
          <div key={step.key} className={`timeline-step ${i < currentIdx ? 'done' : i === currentIdx ? 'active' : ''}`}>
            <div className="step-dot">{step.icon}</div>
            <div className="step-info">
              <h4>{step.label}</h4>
              <p>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="eta-card">
        <div className="eta-label">Estimated Ready In</div>
        <div className="eta-time">{order.estimatedTime} min</div>
        {order.pickupType === 'drivethru' && (
          <div className="pickup-instructions">
            Drive up to <strong>Lane 2</strong> at the pickup window when notified
          </div>
        )}
      </div>

      <div className="order-summary">
        {order.items.map(i => (
          <div key={i.menuItemId} className="order-item">
            <span>{i.emoji} {i.name} × {i.quantity}</span>
            <span>${i.total.toFixed(2)}</span>
          </div>
        ))}
        <div className="order-total">Total: ${order.total.toFixed(2)}</div>
      </div>
    </div>
  );
}


// ── FILE: frontend/src/app/stores/page.jsx ───────────────────
'use client';
import { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { storeAPI } from '@/lib/api';

export default function StoresPage() {
  const [stores, setStores]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [userPos, setUserPos]   = useState({ lat: 40.7505, lng: -73.9934 });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  });

  useEffect(() => {
    // Get user location
    navigator.geolocation?.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setUserPos({ lat, lng });
      storeAPI.getAll({ lat, lng, radius: 20 }).then(r => setStores(r.data));
    }, () => {
      storeAPI.getAll().then(r => setStores(r.data));
    });
  }, []);

  return (
    <div className="stores-layout">
      <aside className="stores-sidebar">
        <h2>Nearby Stores</h2>
        {stores.map(store => (
          <div key={store.id} className={`store-card ${selected?.id === store.id ? 'active' : ''}`}
            onClick={() => setSelected(store)}>
            <div className="store-header">
              <strong>{store.name}</strong>
              {store.distance && <span className="dist">{store.distance} mi</span>}
            </div>
            <p className="addr">{store.address}, {store.city}</p>
            <div className="store-tags">
              {store.isOpen && <span className="tag-open">Open</span>}
              {store.features.includes('drivethru') && <span className="tag-drivethru">Drive-Thru</span>}
              {store.features.includes('24h') && <span className="tag-24h">24 Hours</span>}
            </div>
          </div>
        ))}
      </aside>

      <div className="map-container">
        {isLoaded && (
          <GoogleMap mapContainerStyle={{width:'100%',height:'100%'}}
            center={userPos} zoom={13}
            options={{ styles: darkMapStyle, disableDefaultUI: false }}
          >
            {/* User location */}
            <Marker position={userPos} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor:'#4285F4', fillOpacity:1, strokeColor:'white', strokeWeight:2 }} />

            {/* Store markers */}
            {stores.map(store => (
              <Marker key={store.id}
                position={{ lat: store.lat, lng: store.lng }}
                icon={{ url: '/marker-red.png', scaledSize: new google.maps.Size(40, 40) }}
                onClick={() => setSelected(store)}
              />
            ))}

            {selected && (
              <InfoWindow position={{ lat: selected.lat, lng: selected.lng }} onCloseClick={() => setSelected(null)}>
                <div className="info-window">
                  <h4>{selected.name}</h4>
                  <p>{selected.address}</p>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank">
                    Get Directions →
                  </a>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}
      </div>
    </div>
  );
}

// Google Maps dark theme style
const darkMapStyle = [
  { elementType:'geometry', stylers:[{color:'#212121'}] },
  { elementType:'labels.icon', stylers:[{visibility:'off'}] },
  { elementType:'labels.text.fill', stylers:[{color:'#757575'}] },
  { featureType:'road', elementType:'geometry', stylers:[{color:'#383838'}] },
  { featureType:'water', elementType:'geometry', stylers:[{color:'#000000'}] },
];


// ── FILE: frontend/src/app/admin/page.jsx ────────────────────
'use client';
import { useState, useEffect } from 'react';
import { orderAPI, menuAPI, storeAPI, analyticsAPI } from '@/lib/api';
import useAuthStore from '@/store/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const TABS = ['Dashboard','Orders','Menu','Stores','Analytics'];

export default function AdminPage() {
  const [tab, setTab]           = useState('Dashboard');
  const [orders, setOrders]     = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const { user }                = useAuthStore();
  const router                  = useRouter();

  useEffect(() => {
    if (!user || user.role !== 'admin') { router.push('/login'); return; }
    orderAPI.getAll().then(r => setOrders(r.data.orders));
    analyticsAPI.get().then(r => setAnalytics(r.data));
  }, []);

  const updateStatus = async (orderId, status) => {
    await orderAPI.updateStatus(orderId, status);
    setOrders(prev => prev.map(o => o.id === orderId ? {...o, status} : o));
    toast.success(`Order ${orderId} → ${status}`);
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">Admin Panel</div>
        {TABS.map(t => (
          <button key={t} className={`admin-nav ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </aside>

      <main className="admin-content">
        {tab === 'Dashboard' && analytics && (
          <>
            <h2>Dashboard</h2>
            <div className="stats-grid">
              <div className="stat-card"><div>Today's Orders</div><div className="stat-num">{analytics.today.orders}</div></div>
              <div className="stat-card"><div>Revenue</div><div className="stat-num">${analytics.today.revenue}</div></div>
              <div className="stat-card"><div>Drive-Thru</div><div className="stat-num">{analytics.today.driveThru}</div></div>
              <div className="stat-card"><div>Total Orders</div><div className="stat-num">{analytics.allTime.orders}</div></div>
            </div>
          </>
        )}

        {tab === 'Orders' && (
          <>
            <h2>Orders</h2>
            {orders.map(order => (
              <div key={order.id} className="admin-order-card">
                <strong className="order-id">{order.id}</strong>
                <span>{order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}</span>
                <span className={`pickup-badge ${order.pickupType}`}>{order.pickupType}</span>
                <span>${order.total.toFixed(2)}</span>
                <span className={`status-badge ${order.status}`}>{order.status}</span>
                <div className="order-actions">
                  {order.status === 'received' && <>
                    <button onClick={() => updateStatus(order.id,'preparing')}>Accept</button>
                    <button onClick={() => updateStatus(order.id,'rejected')}>Reject</button>
                  </>}
                  {order.status === 'preparing' && <button onClick={() => updateStatus(order.id,'ready')}>Mark Ready</button>}
                  {order.status === 'ready'     && <button onClick={() => updateStatus(order.id,'completed')}>Complete</button>}
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}


// ── FILE: frontend/src/middleware.js ─────────────────────────
// Route protection
import { NextResponse } from 'next/server';

export function middleware(request) {
  const token    = request.cookies.get('qb_token')?.value;
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/admin') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/profile/:path*'] };


// ── FILE: frontend/.env.local ────────────────────────────────
/*
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key_here
*/

// ── FILE: frontend/.env.production ───────────────────────────
/*
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key_here
*/

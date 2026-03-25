# 🍔 QuickBite Drive-Thru — Complete Setup Guide

## Project Overview
A production-ready McDonald's-style drive-thru ordering system with:
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + Framer Motion
- **Backend**: Node.js + Express REST API
- **State**: Zustand for cart & auth
- **Maps**: Google Maps API
- **Deploy**: Vercel (frontend) + Render.com (backend)

---

## 📁 Folder Structure

```
quickbite/
├── frontend/                    # Next.js App
│   ├── public/
│   │   ├── marker-red.png       # Custom map marker
│   │   └── favicon.ico
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   │   ├── layout.jsx       # Root layout (nav, footer)
│   │   │   ├── page.jsx         # Homepage (hero, features)
│   │   │   ├── menu/
│   │   │   │   └── page.jsx     # Menu + cart sidebar
│   │   │   ├── stores/
│   │   │   │   └── page.jsx     # Store locator + Google Maps
│   │   │   ├── track/
│   │   │   │   └── [orderId]/
│   │   │   │       └── page.jsx # Live order tracking
│   │   │   ├── admin/
│   │   │   │   └── page.jsx     # Admin dashboard
│   │   │   ├── login/
│   │   │   │   └── page.jsx     # Login page
│   │   │   └── signup/
│   │   │       └── page.jsx     # Signup page
│   │   ├── components/
│   │   │   ├── Nav.jsx          # Top navigation + cart button
│   │   │   ├── CartSidebar.jsx  # Sticky cart with pickup options
│   │   │   ├── MenuCard.jsx     # Individual menu item card
│   │   │   ├── StoreCard.jsx    # Store list item
│   │   │   ├── OrderCard.jsx    # Admin order row
│   │   │   ├── StatusTimeline.jsx# Order tracking timeline
│   │   │   ├── AIRecsBar.jsx    # AI recommendations strip
│   │   │   └── Notification.jsx # Toast notification wrapper
│   │   ├── lib/
│   │   │   └── api.js           # Axios API client
│   │   ├── store/
│   │   │   ├── cartStore.js     # Zustand cart state
│   │   │   └── authStore.js     # Zustand auth state
│   │   ├── hooks/
│   │   │   ├── useOrders.js     # Order polling hook
│   │   │   └── useGeolocation.js# Browser location hook
│   │   ├── styles/
│   │   │   └── globals.css      # Global styles + CSS variables
│   │   └── middleware.js        # Route protection
│   ├── .env.local               # Dev environment variables
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                     # Express API
│   ├── server.js                # Main server + all routes
│   ├── package.json
│   └── .env                     # JWT_SECRET, PORT, FRONTEND_URL
│
├── index.html                   # ← Full working DEMO (open this!)
└── README.md                    # This file
```

---

## 🚀 Quick Start

### 1. Run the Live Demo
Open `index.html` in any browser — the complete interactive demo runs without any setup.

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env`:
```env
PORT=5000
JWT_SECRET=your-super-secret-key-change-this
FRONTEND_URL=http://localhost:3000
```

Start the server:
```bash
npm run dev      # development (nodemon)
npm start        # production
```

API will be live at: `http://localhost:5000`

**Test the API:**
```bash
# Health check
curl http://localhost:5000/health

# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@quickbite.com","password":"admin123"}'

# Get menu
curl http://localhost:5000/api/menu

# Get stores near a location
curl "http://localhost:5000/api/stores?lat=40.75&lng=-73.99&radius=10"
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key_here
```

Start the dev server:
```bash
npm run dev
```

Frontend will be live at: `http://localhost:3000`

---

## 🗺️ Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project → Enable **Maps JavaScript API**
3. Create an API Key → Restrict to your domain
4. Add the key to `.env.local` as `NEXT_PUBLIC_GOOGLE_MAPS_KEY`

---

## 🔑 API Endpoints Reference

### Auth
| Method | Endpoint           | Auth     | Description        |
|--------|-------------------|----------|--------------------|
| POST   | /api/auth/register | -        | Create account     |
| POST   | /api/auth/login    | -        | Login              |
| GET    | /api/auth/me       | Customer | Get current user   |

### Menu
| Method | Endpoint       | Auth  | Description         |
|--------|---------------|-------|---------------------|
| GET    | /api/menu     | -     | Get all items       |
| GET    | /api/menu/:id | -     | Get single item     |
| POST   | /api/menu     | Admin | Create item         |
| PUT    | /api/menu/:id | Admin | Update item         |
| DELETE | /api/menu/:id | Admin | Delete item         |

### Orders
| Method | Endpoint                  | Auth     | Description          |
|--------|--------------------------|----------|----------------------|
| POST   | /api/orders               | Customer | Place order          |
| GET    | /api/orders               | Customer | Get own orders       |
| GET    | /api/orders/:id           | Customer | Get order details    |
| PATCH  | /api/orders/:id/status    | Admin    | Update order status  |

### Stores
| Method | Endpoint        | Auth  | Description              |
|--------|----------------|-------|--------------------------|
| GET    | /api/stores     | -     | Get all stores + distance|
| GET    | /api/stores/:id | -     | Get store details        |
| PATCH  | /api/stores/:id | Admin | Update store settings    |

### Analytics
| Method | Endpoint        | Auth  | Description              |
|--------|----------------|-------|--------------------------|
| GET    | /api/analytics  | Admin | Dashboard stats          |

---

## ☁️ Deployment

### Deploy Backend → Render.com

1. Push `backend/` to a GitHub repo
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect your repo → Set **Build Command**: `npm install`
4. Set **Start Command**: `node server.js`
5. Add environment variables:
   - `JWT_SECRET` = (strong random string)
   - `PORT` = 5000
   - `FRONTEND_URL` = (your Vercel URL)

### Deploy Frontend → Vercel

1. Push `frontend/` to a GitHub repo
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL` = (your Render.com API URL)
   - `NEXT_PUBLIC_GOOGLE_MAPS_KEY` = (your Google Maps key)
4. Click **Deploy** — done!

---

## 🔐 Default Credentials

| Role     | Email                    | Password  |
|----------|--------------------------|-----------|
| Admin    | admin@quickbite.com      | admin123  |
| Customer | john@example.com         | pass123   |

---

## 🤖 AI Recommendations Logic

The AI recommendation system works by:
1. **Time of day**: Breakfast (6-11am) → Morning items, Lunch (11am-3pm) → Burgers + Sides, Dinner (5-10pm) → Full meals
2. **Order history**: Most ordered items by the user
3. **Popularity**: Items with highest total sales count
4. **Weather integration**: Hot weather → Shakes & Drinks, Cold weather → Hot foods

To enable real AI (Claude API):
```javascript
// In frontend/src/components/AIRecsBar.jsx
const getAIRecs = async (userHistory, timeOfDay) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: `Given a user who previously ordered: ${userHistory.join(', ')} and it's currently ${timeOfDay}, suggest 3 QuickBite menu items from: ${menuItems.map(i=>i.name).join(', ')}. Return JSON array of item names only.` }]
    })
  });
  const data = await response.json();
  return JSON.parse(data.content[0].text);
};
```

---

## 🚗 Drive-Thru Logic

Order flow for drive-thru customers:
1. Customer places order with `pickupType: "drivethru"` + `vehicleDescription`
2. Backend calculates `estimatedTime` based on queue depth + item prep times
3. Admin marks order as "preparing" → kitchen starts
4. Admin marks order as "ready" → customer is notified (push/SMS)
5. Customer drives to pickup lane → shows order QR code
6. Admin scans & marks "completed"

---

## 📱 Real-time Notifications

For production real-time updates, replace the 15-second polling with:

```bash
# Option A: Socket.io
npm install socket.io socket.io-client

# Option B: Server-Sent Events (simpler, one-way)
# Already supported by Express — add /api/orders/:id/stream endpoint

# Option C: Push Notifications
# Use web-push library for browser push notifications
```

---

## 🏗️ Production Upgrades

| Feature         | Recommendation                          |
|-----------------|-----------------------------------------|
| Database        | MongoDB Atlas or PostgreSQL (Supabase)  |
| Real-time       | Socket.io or Pusher                     |
| Payments        | Stripe Elements                         |
| SMS Alerts      | Twilio API                              |
| Image Storage   | Cloudinary or AWS S3                    |
| Email           | Resend or SendGrid                      |
| Auth            | NextAuth.js or Auth0                    |
| Caching         | Redis (Upstash)                         |
| CDN             | Cloudflare                              |

---

Built with ❤️ — QuickBite Drive-Thru System

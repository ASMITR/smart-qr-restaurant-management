# TableFlow — QR Restaurant Ordering & Table Management SaaS

A production-ready, mobile-first restaurant QR ordering system built with Next.js, Firebase, and Tailwind CSS.

---

## Features

- **QR Table Identification** — each table has a unique secure token
- **Browser Geolocation Verification** — Haversine formula, configurable geofence radius
- **Digital Menu** — categories, veg/non-veg indicators, availability toggle
- **Real-time Orders** — Firestore listeners, no polling
- **Kitchen Display System** — kanban-style, large touch-friendly cards
- **Manager Dashboard** — live stats, table grid, order management, billing
- **Billing & Payments** — manual confirmation + Razorpay webhook architecture
- **Google Review Flow** — shown after payment, no manipulation
- **Multi-restaurant SaaS** — full tenant isolation via Firestore Security Rules
- **PWA** — installable on mobile and desktop
- **Roles** — OWNER, MANAGER, KITCHEN

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS |
| Database | Cloud Firestore (realtime) |
| Auth | Firebase Authentication + Custom Claims |
| Functions | Firebase Cloud Functions (Node 18) |
| Storage | Firebase Storage (for menu images) |
| Hosting | Vercel or Firebase Hosting |
| QR | `qrcode` npm package |

---

## Project Structure

```
src/
├── app/
│   ├── table/[token]/          # Customer flow
│   │   ├── page.tsx            # QR landing, name entry, location verify
│   │   ├── menu/page.tsx       # Menu, cart, order placement
│   │   └── bill/page.tsx       # Bill view + Google review
│   ├── dashboard/              # Manager/Owner dashboard
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Overview stats
│   │   ├── tables/page.tsx     # Table grid + QR management
│   │   ├── menu/page.tsx       # Menu management
│   │   ├── orders/page.tsx     # Order management
│   │   ├── billing/page.tsx    # Bill generation + payment confirm
│   │   ├── reports/page.tsx    # Revenue reports
│   │   └── settings/page.tsx   # Restaurant config + geofence
│   ├── kitchen/                # Kitchen Display System
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── login/page.tsx
├── components/ui/              # Button, Card, Input, Badge, Modal, Spinner
├── hooks/                      # useAuth, useCart
├── lib/
│   ├── firebase/config.ts      # Firebase init
│   ├── location/index.ts       # Haversine + geolocation
│   └── qr/index.ts             # QR generation + print
├── services/                   # Firestore service layer
│   ├── restaurantService.ts
│   ├── tableService.ts
│   ├── menuService.ts
│   ├── orderService.ts
│   ├── paymentService.ts
│   └── staffRequestService.ts
├── types/index.ts              # All TypeScript types
└── utils/index.ts              # cn, formatCurrency, formatTime

functions/src/index.ts          # Cloud Functions
firestore.rules                 # Security Rules
firestore.indexes.json          # Composite indexes
```

---

## Setup

### 1. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com) → Create project
2. Enable **Firestore**, **Authentication** (Email/Password), **Storage**, **Functions**
3. Copy your web app config

### 2. Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in all `NEXT_PUBLIC_FIREBASE_*` values from your Firebase project settings.

Set `NEXT_PUBLIC_APP_URL` to your deployed domain (used for QR code URLs).

### 3. Install & Run

```bash
npm install
npm run dev
```

### 4. Seed First Restaurant

```bash
# Place your Firebase service account JSON at ./serviceAccount.json
node scripts/seed.mjs
```

This creates:
- A demo restaurant
- Owner account: `owner@demo.com` / `Demo@1234`
- 5 tables with QR tokens
- Menu categories

### 5. Deploy Firestore Rules & Indexes

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore
```

### 6. Deploy Cloud Functions

```bash
cd functions && npm install && npm run build && cd ..
firebase deploy --only functions
```

### 7. Deploy App

**Vercel (recommended):**
```bash
npx vercel --prod
```

**Firebase Hosting:**
```bash
npm run build
firebase deploy --only hosting
```

---

## User Roles

| Role | Access |
|---|---|
| OWNER | Full access — settings, users, all data |
| MANAGER | Dashboard, tables, menu, orders, billing, reports |
| KITCHEN | Kitchen display only — accept/prepare/ready/served |
| CUSTOMER | No account needed — session-based ordering |

---

## Customer Flow

```
Scan QR → /table/{token}
  ↓ Enter name
  ↓ Allow location
  ↓ Haversine distance check (≤ allowedRadiusMeters)
  ↓ Session created in Firestore
  ↓ Table marked OCCUPIED
  ↓ Browse menu → add to cart
  ↓ Place order → Kitchen receives instantly
  ↓ Track status (PLACED → ACCEPTED → PREPARING → READY → SERVED)
  ↓ Request bill → /table/{token}/bill
  ↓ Manager confirms payment
  ↓ Google Review screen
  ↓ Session COMPLETED → Table AVAILABLE
```

---

## Firestore Data Model

```
restaurants/{restaurantId}
  /users/{userId}
  /tables/{tableId}
  /menuCategories/{categoryId}
  /menuItems/{itemId}
  /sessions/{sessionId}
  /orders/{orderId}
  /payments/{paymentId}
  /staffRequests/{requestId}
  /auditLogs/{logId}

tableTokens/{qrToken}   ← global index for fast QR lookup
```

---

## Security

- Firestore Security Rules enforce tenant isolation — Restaurant A cannot read Restaurant B
- Customers cannot modify prices, payment status, or order status beyond placing
- Kitchen can only update order status fields
- QR tokens are 20-char random strings (`tbl_` prefix)
- Location verification uses Haversine + GPS accuracy check
- Payment verification happens server-side via Cloud Function webhook
- Custom Firebase Auth claims carry `restaurantId` + `role`

---

## Razorpay Integration

The architecture is ready. To activate:

1. Set `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` in env
2. In `billing/page.tsx`, add Razorpay checkout script for the ONLINE payment method
3. The `razorpayWebhook` Cloud Function already handles `payment.captured` events with HMAC verification

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firestore project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL (for QR codes) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key (optional) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (Cloud Functions only) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook HMAC secret |

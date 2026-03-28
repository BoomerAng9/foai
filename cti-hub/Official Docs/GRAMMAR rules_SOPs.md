# HalalHub Platform — VPS Rebuild Spec
## Hosted on hh.plugmein.cloud | Hostinger VPS | 2026 Standards

---

## WHAT CHANGED (Supabase → Self-Hosted Stack)

| Layer | Before (Supabase) | Now (Self-Hosted VPS) |
|---|---|---|
| Database | Supabase PostgreSQL | PostgreSQL 16 (self-hosted) |
| Auth | Supabase Auth | NextAuth.js v5 + JWT |
| Storage | Supabase Storage CDN | MinIO (S3-compatible) on VPS |
| Real-time | Supabase WebSockets | Socket.io + Redis Pub/Sub |
| ORM | Supabase JS Client | Prisma ORM |
| Edge Functions | Supabase Functions | Next.js API Routes + PM2 |
| Hosting | Vercel | Nginx + PM2 on Hostinger VPS |
| SSL | Auto (Vercel) | Certbot (Let's Encrypt) |

**Trade-offs:**
- ✅ Full data ownership, no vendor lock-in, no usage billing
- ✅ Defense-grade control — your VPS, your rules
- ✅ Cheaper at scale — flat VPS cost
- ⚠️ You manage DB backups, uptime, and patching
- ⚠️ No built-in Row Level Security — enforced via Prisma middleware

---

## PHASE 0: SUBDOMAIN & DNS SETUP

### Step 1 — Add DNS Record in Hostinger hPanel

```
Panel: hPanel → Domains → plugmein.cloud → DNS / Zone Editor

Add Record:
  Type:  A
  Name:  hh
  Value: <Your VPS IPv4 Address>
  TTL:   300

Result: hh.plugmein.cloud → Your VPS IP
```

### Step 2 — Verify Propagation

```bash
# Run from your local machine or VPS
dig hh.plugmein.cloud +short
# Should return your VPS IP within 5–30 minutes
```

### Step 3 — SSL Certificate (Certbot)

```bash
# On VPS — install Certbot
sudo apt update && sudo apt install certbot python3-certbot-nginx -y

# Issue certificate for subdomain
sudo certbot --nginx -d hh.plugmein.cloud

# Auto-renewal (runs via systemd timer, verify it)
sudo certbot renew --dry-run
```

---

## PHASE 1: VPS SERVER SETUP

### 1.1 Base Configuration

```bash
# Update server
sudo apt update && sudo apt upgrade -y

# Install core dependencies
sudo apt install -y nginx postgresql postgresql-contrib redis-server \
  nodejs npm git curl ufw fail2ban

# Install Node.js 22 LTS via NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
nvm alias default 22

# Install PM2 globally
npm install -g pm2

# Install pnpm
npm install -g pnpm
```

### 1.2 Firewall Rules

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 5432/tcp  # PostgreSQL (restrict to localhost only in prod)
sudo ufw allow 6379/tcp  # Redis (restrict to localhost only in prod)
sudo ufw enable
```

### 1.3 PostgreSQL Setup

```bash
# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE USER halalhub_user WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE';
CREATE DATABASE halalhub_db OWNER halalhub_user;
GRANT ALL PRIVILEGES ON DATABASE halalhub_db TO halalhub_user;
\q
EOF

# Secure PostgreSQL — bind to localhost only
sudo nano /etc/postgresql/16/main/postgresql.conf
# Set: listen_addresses = 'localhost'

sudo nano /etc/postgresql/16/main/pg_hba.conf
# Ensure: local all halalhub_user md5

sudo systemctl restart postgresql
```

### 1.4 Redis Setup

```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Bind Redis to localhost only
sudo nano /etc/redis/redis.conf
# Set: bind 127.0.0.1
# Set: requirepass YOUR_REDIS_PASSWORD

sudo systemctl restart redis-server
```

### 1.5 MinIO Setup (File Storage)

```bash
# Download and install MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Create storage directory
sudo mkdir -p /data/minio
sudo chown -R $USER:$USER /data/minio

# Create MinIO systemd service
sudo nano /etc/systemd/system/minio.service
```

```ini
[Unit]
Description=MinIO Object Storage
After=network.target

[Service]
User=halalhub
Group=halalhub
WorkingDirectory=/data/minio
Environment="MINIO_ROOT_USER=halalhub_admin"
Environment="MINIO_ROOT_PASSWORD=YOUR_MINIO_PASSWORD"
ExecStart=/usr/local/bin/minio server /data/minio --console-address ":9001"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable minio
sudo systemctl start minio
```

### 1.6 Nginx Configuration

```nginx
# /etc/nginx/sites-available/halalhub
server {
    listen 80;
    server_name hh.plugmein.cloud;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hh.plugmein.cloud;

    ssl_certificate /etc/letsencrypt/live/hh.plugmein.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hh.plugmein.cloud/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 256;

    # Next.js app proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Socket.io — runs on port 3001 via separate PM2 process (lib/socket.ts)
    # NOTE: Add Socket.io server as second PM2 app in ecosystem.config.js
    # pnpm add socket.io — see lib/socket.ts scaffold in repo
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # MinIO storage (public bucket only)
    location /storage/ {
        proxy_pass http://localhost:9000/;
        proxy_set_header Host $host;
    }

    # Static file caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # File upload size limit
    client_max_body_size 50M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/halalhub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## PHASE 2: PROJECT STRUCTURE

```
halalhub/
├── app/                          # Next.js 15 App Router
│   ├── (marketing)/
│   │   ├── page.tsx              # Landing page
│   │   ├── about/
│   │   └── how-it-works/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   │   ├── customer/
│   │   │   └── vendor/
│   │   └── verify/
│   ├── (shop)/
│   │   ├── page.tsx
│   │   ├── [category]/
│   │   ├── product/[id]/
│   │   ├── service/[id]/
│   │   ├── cart/
│   │   └── checkout/
│   ├── (vendor)/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── analytics/
│   │   └── subscription/
│   ├── (customer)/
│   │   ├── profile/
│   │   ├── orders/
│   │   ├── favorites/
│   │   └── barakat/
│   ├── (admin)/
│   │   ├── dashboard/
│   │   ├── vendors/
│   │   ├── certifications/
│   │   └── disputes/
│   └── api/                      # API Routes (replaces Supabase Edge Functions)
│       ├── auth/[...nextauth]/
│       ├── products/
│       ├── orders/
│       ├── vendors/
│       ├── upload/
│       ├── payments/
│       │   ├── webhook/
│       │   └── checkout/
│       └── barakat/
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   ├── auth.ts                   # NextAuth config
│   ├── redis.ts                  # Redis client
│   ├── minio.ts                  # MinIO client
│   ├── stripe.ts                 # Stripe client
│   └── socket.ts                 # Socket.io server
├── prisma/
│   ├── schema.prisma             # Full DB schema
│   └── migrations/               # Migration history
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── shop/
│   ├── vendor/
│   ├── admin/
│   └── shared/
├── stores/                       # Zustand stores
│   ├── cart.ts
│   ├── auth.ts
│   └── search.ts
├── hooks/
├── types/
├── middleware.ts                  # Auth middleware
├── next.config.ts
├── .env.local
├── ecosystem.config.js            # PM2 config
└── docker-compose.yml             # Optional local dev
```

---

## PHASE 3: TECH STACK

```
Frontend:        Next.js 15 (React 19, App Router, Server Components)
Styling:         Tailwind CSS v4 + shadcn/ui
State:           Zustand + TanStack Query v5
Forms:           React Hook Form + Zod validation
Animations:      Framer Motion

Backend:         Next.js API Routes (replaces Supabase Edge Functions)
ORM:             Prisma v6 (replaces Supabase JS client)
Database:        PostgreSQL 16 (self-hosted on VPS)
Cache:           Redis 7 (sessions, rate limiting, pub/sub)
Auth:            NextAuth.js v5 (replaces Supabase Auth)
Real-time:       Socket.io (replaces Supabase Realtime)
File Storage:    MinIO (S3-compatible, replaces Supabase Storage)
Search:          pg_trgm + pgvector (PostgreSQL extensions, no external service)
Payments:        Stripe Connect (same as before)
Maps:            Google Maps Platform (same as before)

Process Manager: PM2 (cluster mode)
Reverse Proxy:   Nginx
SSL:             Certbot / Let's Encrypt
Monitoring:      PM2 Logs + Sentry
CI/CD:           GitHub Actions → SSH deploy to VPS
```

---

## PHASE 4: DATABASE SCHEMA (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions", "fullTextSearch"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector"), pg_trgm, postgis]
}

// ─── ENUMS ───────────────────────────────────────────────────────────────────

enum UserType {
  CUSTOMER
  VENDOR
  ADMIN
}

enum SubscriptionTier {
  STARTER
  BASIC
  PREMIUM
  ENTERPRISE
}

enum VerificationStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
  SUSPENDED
}

enum OrderStatus {
  PENDING_PAYMENT
  PAYMENT_HELD        // Escrow active
  PROCESSING
  READY_FOR_PICKUP
  SHIPPED
  DELIVERED
  DELIVERY_CONFIRMED  // Triggers payout
  DISPUTED
  REFUNDED
  CANCELLED
}

enum EscrowStatus {
  HOLDING
  RELEASED
  REFUNDED
}

enum AffiliateStatus {
  ACTIVE
  INACTIVE
  FRAUD_REVIEW
}

// ─── USERS ───────────────────────────────────────────────────────────────────

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String?
  name         String
  phone        String?
  userType     UserType @default(CUSTOMER)
  barakatCode  String?  @unique @default(cuid())
  avatarUrl    String?
  emailVerifiedAt DateTime?
  lastLoginAt  DateTime?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Lat/lng stored as floats (no PostGIS dependency for basic queries)
  latitude     Float?
  longitude    Float?

  // Relations
  vendor            Vendor?
  orders            Order[]
  favorites         Favorite[]
  reviews           Review[]
  referredVendors   BarakatAffiliate[] @relation("Referrer")
  sessions          Session[]
  accounts          Account[]

  @@index([email])
  @@index([userType])
  @@map("users")
}

// ─── AUTH (NextAuth) ──────────────────────────────────────────────────────────

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ─── VENDORS ─────────────────────────────────────────────────────────────────

model Vendor {
  id                  String             @id @default(cuid())
  ownerId             String             @unique
  businessName        String
  businessEmail       String             @unique
  businessPhone       String?
  description         String?            @db.Text
  logoUrl             String?
  bannerUrl           String?
  subscriptionTier    SubscriptionTier   @default(STARTER)
  verificationStatus  VerificationStatus @default(PENDING)
  qualityRating       Float              @default(0)
  totalReviews        Int                @default(0)
  monthlyFee          Decimal            @db.Decimal(10, 2)
  stripeAccountId     String?            @unique
  stripeCustomerId    String?            @unique
  certificationBadges Json               @default("{}")
  address             String?
  latitude            Float?
  longitude           Float?
  serviceRadius       Int?               @default(25) // miles
  adminVerifiedAt     DateTime?
  adminVerifiedBy     String?
  isActive            Boolean            @default(false)
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  // Relations
  owner      User               @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  products   Product[]
  services   Service[]
  orders     Order[]
  documents  VendorDocument[]
  affiliates BarakatAffiliate[] @relation("ReferredVendor")

  @@index([verificationStatus])
  @@index([subscriptionTier])
  @@map("vendors")
}

model VendorDocument {
  id         String   @id @default(cuid())
  vendorId   String
  type       String   // 'business_license' | 'health_permit' | 'halal_cert' | etc.
  fileUrl    String
  fileName   String
  uploadedAt DateTime @default(now())

  vendor Vendor @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  @@map("vendor_documents")
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

model Product {
  id                  String   @id @default(cuid())
  vendorId            String
  name                String
  slug                String   @unique
  description         String?  @db.Text
  category            String
  subcategory         String?
  price               Decimal  @db.Decimal(10, 2)
  compareAtPrice      Decimal? @db.Decimal(10, 2)
  stockQuantity       Int      @default(0)
  lowStockThreshold   Int      @default(5)
  images              String[]
  certificationStatus Json     @default("{}")
  isLocationSpecific  Boolean  @default(false)
  isActive            Boolean  @default(true)
  isFeatured          Boolean  @default(false)
  totalSales          Int      @default(0)
  totalViews          Int      @default(0)

  // Full-text search via pg_trgm — handled via raw queries in Prisma
  searchVector        Unsupported("tsvector")?

  // Vector embedding for AI semantic search
  embedding           Unsupported("vector(1536)")?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  vendor     Vendor       @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  orderItems OrderItem[]
  favorites  Favorite[]
  reviews    Review[]

  @@index([category])
  @@index([vendorId])
  @@index([isActive, isFeatured])
  @@map("products")
}

// ─── SERVICES ────────────────────────────────────────────────────────────────

model Service {
  id           String   @id @default(cuid())
  providerId   String
  serviceType  String
  title        String
  description  String?  @db.Text
  hourlyRate   Decimal? @db.Decimal(10, 2)
  flatRate     Decimal? @db.Decimal(10, 2)
  latitude     Float?
  longitude    Float?
  serviceRadiusMiles Int @default(25)
  availability Json     @default("{}")
  certifications String[]
  images       String[]
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  vendor  Vendor   @relation(fields: [providerId], references: [id], onDelete: Cascade)
  reviews Review[]

  @@index([serviceType])
  @@index([providerId])
  @@map("services")
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

model Order {
  id                String      @id @default(cuid())
  customerId        String
  vendorId          String
  status            OrderStatus @default(PENDING_PAYMENT)
  escrowStatus      EscrowStatus @default(HOLDING)
  deliveryMethod    String      // 'shipping' | 'pickup' | 'catering'
  subtotal          Decimal     @db.Decimal(10, 2)
  platformFee       Decimal     @db.Decimal(10, 2) // 5–10%
  deliveryFee       Decimal     @default(0) @db.Decimal(10, 2)
  totalAmount       Decimal     @db.Decimal(10, 2)

  // Stripe
  stripePaymentIntentId String? @unique
  stripeTransferId      String?

  // Delivery info
  shippingAddress   Json?
  scheduledAt       DateTime?
  deliveredAt       DateTime?
  confirmedAt       DateTime?

  notes     String? @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  customer  User        @relation(fields: [customerId], references: [id])
  vendor    Vendor      @relation(fields: [vendorId], references: [id])
  items     OrderItem[]
  dispute   Dispute?

  @@index([customerId])
  @@index([vendorId])
  @@index([status])
  @@map("orders")
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  productId String
  quantity  Int
  unitPrice Decimal @db.Decimal(10, 2)
  subtotal  Decimal @db.Decimal(10, 2)
  snapshot  Json    // Snapshot of product at time of order

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@map("order_items")
}

// ─── BARAKAT AFFILIATES ───────────────────────────────────────────────────────

model BarakatAffiliate {
  id               String          @id @default(cuid())
  referrerId       String
  referredVendorId String
  commissionRate   Decimal         @default(0.70) @db.Decimal(4, 2)
  lifetimeEarnings Decimal         @default(0) @db.Decimal(10, 2)
  pendingPayout    Decimal         @default(0) @db.Decimal(10, 2)
  status           AffiliateStatus @default(ACTIVE)
  createdAt        DateTime        @default(now())

  referrer      User   @relation("Referrer", fields: [referrerId], references: [id])
  referredVendor Vendor @relation("ReferredVendor", fields: [referredVendorId], references: [id])

  commissions BarakatCommission[]

  @@unique([referrerId, referredVendorId])
  @@map("barakat_affiliates")
}

model BarakatCommission {
  id          String   @id @default(cuid())
  affiliateId String
  amount      Decimal  @db.Decimal(10, 2)
  type        String   // 'subscription_fee' | 'platform_bonus'
  month       String   // 'YYYY-MM'
  paidAt      DateTime?
  createdAt   DateTime @default(now())

  affiliate BarakatAffiliate @relation(fields: [affiliateId], references: [id])

  @@map("barakat_commissions")
}

// ─── SUPPORTING MODELS ────────────────────────────────────────────────────────

model Review {
  id         String   @id @default(cuid())
  authorId   String
  productId  String?
  serviceId  String?
  rating     Int
  title      String?
  body       String?  @db.Text
  isVerified Boolean  @default(false)
  createdAt  DateTime @default(now())

  author  User     @relation(fields: [authorId], references: [id])
  product Product? @relation(fields: [productId], references: [id])
  service Service? @relation(fields: [serviceId], references: [id])

  @@map("reviews")
}

model Favorite {
  id        String   @id @default(cuid())
  userId    String
  productId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
  @@map("favorites")
}

model Dispute {
  id          String   @id @default(cuid())
  orderId     String   @unique
  raisedBy    String
  reason      String   @db.Text
  status      String   @default("OPEN") // 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED'
  resolution  String?  @db.Text
  createdAt   DateTime @default(now())
  resolvedAt  DateTime?

  order Order @relation(fields: [orderId], references: [id])

  @@map("disputes")
}
```

---

## PHASE 5: ENVIRONMENT VARIABLES

```env
# .env.local

# ── App ─────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://hh.plugmein.cloud
NODE_ENV=production

# ── Database ────────────────────────────────────
DATABASE_URL=postgresql://halalhub_user:YOUR_STRONG_PASSWORD@localhost:5432/halalhub_db

# ── Redis ───────────────────────────────────────
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@localhost:6379

# ── Auth (NextAuth.js v5) ────────────────────────
AUTH_SECRET=GENERATE_WITH_openssl_rand_-hex_32
AUTH_URL=https://hh.plugmein.cloud

# OAuth Providers (optional)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_APPLE_ID=
AUTH_APPLE_SECRET=

# ── MinIO (File Storage) ─────────────────────────
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=halalhub_admin
MINIO_SECRET_KEY=YOUR_MINIO_PASSWORD
MINIO_BUCKET_PRODUCTS=halalhub-products
MINIO_BUCKET_VENDORS=halalhub-vendors
MINIO_BUCKET_DOCS=halalhub-documents

# ── Stripe ──────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Google Maps ──────────────────────────────────
NEXT_PUBLIC_GOOGLE_MAPS_KEY=

# ── Email (SMTP) ─────────────────────────────────
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=noreply@hh.plugmein.cloud
SMTP_PASS=

# ── Sentry ───────────────────────────────────────
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## PHASE 6: CORE LIBRARY FILES

### lib/db.ts — Prisma Singleton

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

### lib/redis.ts — Redis Client

```typescript
// lib/redis.ts
import { createClient } from 'redis';

declare global {
  var redisClient: ReturnType<typeof createClient> | undefined;
}

export const redis = globalThis.redisClient ?? createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 5000),
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.redisClient = redis;
}

if (!redis.isOpen) {
  redis.connect().catch(console.error);
}

// Helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300
): Promise<void> {
  await redis.setEx(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDelete(key: string): Promise<void> {
  await redis.del(key);
}

export async function rateLimitCheck(
  identifier: string,
  limit = 60,
  windowSeconds = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${identifier}`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, windowSeconds);
  return { allowed: current <= limit, remaining: Math.max(0, limit - current) };
}
```

### lib/minio.ts — File Storage Client

```typescript
// lib/minio.ts
import * as Minio from 'minio';

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT!),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

export async function uploadFile(
  bucket: string,
  objectName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return `https://hh.plugmein.cloud/storage/${bucket}/${objectName}`;
}

export async function deleteFile(
  bucket: string,
  objectName: string
): Promise<void> {
  await minioClient.removeObject(bucket, objectName);
}

export async function ensureBuckets(): Promise<void> {
  const buckets = [
    process.env.MINIO_BUCKET_PRODUCTS!,
    process.env.MINIO_BUCKET_VENDORS!,
    process.env.MINIO_BUCKET_DOCS!,
  ];

  for (const bucket of buckets) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket, 'us-east-1');
    }
  }
}
```

### lib/auth.ts — NextAuth v5 Config

```typescript
// lib/auth.ts
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { db } from './db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// pnpm add next-auth @auth/prisma-adapter bcryptjs zod

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    verifyRequest: '/verify',
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }).safeParse(credentials);

        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.userType,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userType = (user as any).userType;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).userType = token.userType;
      }
      return session;
    },
  },
});
```

### middleware.ts — Route Protection

```typescript
// middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const PROTECTED_PATHS = {
  '/vendor': ['VENDOR', 'ADMIN'],
  '/admin': ['ADMIN'],
  '/customer': ['CUSTOMER', 'VENDOR', 'ADMIN'],
  '/checkout': ['CUSTOMER', 'VENDOR', 'ADMIN'],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Check protected routes
  for (const [path, allowedRoles] of Object.entries(PROTECTED_PATHS)) {
    if (pathname.startsWith(path)) {
      if (!session) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      const userType = (session.user as any).userType;
      if (!allowedRoles.includes(userType)) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## PHASE 7: KEY API ROUTES

### app/api/products/route.ts

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cacheGet, cacheSet } from '@/lib/redis';
import { z } from 'zod';

const querySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().max(50).default(20),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const query = querySchema.parse(params);

    const cacheKey = `products:${JSON.stringify(query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);

    const where = {
      isActive: true,
      ...(query.category && { category: query.category }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { description: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined) && {
        price: {
          ...(query.minPrice !== undefined && { gte: query.minPrice }),
          ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
        },
      },
    };

    const [products, total] = await db.$transaction([
      db.product.findMany({
        where,
        include: {
          vendor: {
            select: {
              businessName: true,
              qualityRating: true,
              certificationBadges: true,
            },
          },
          _count: { select: { reviews: true, favorites: true } },
        },
        orderBy: [{ isFeatured: 'desc' }, { totalSales: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.product.count({ where }),
    ]);

    const result = {
      products,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };

    await cacheSet(cacheKey, result, 120); // Cache 2 minutes

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error('[Products GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### app/api/payments/checkout/route.ts

```typescript
// app/api/payments/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items, deliveryMethod, shippingAddress } = await req.json();

    // Validate items and calculate totals server-side (never trust client)
    const productIds = items.map((i: any) => i.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { vendor: true },
    });

    let subtotal = 0;
    const orderItems = items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      const itemTotal = Number(product.price) * item.quantity;
      subtotal += itemTotal;
      return { product, quantity: item.quantity, unitPrice: product.price };
    });

    const platformFee = subtotal * 0.07; // 7% platform fee
    const totalAmount = subtotal + platformFee;

    // Create Stripe Payment Intent (escrow = manual capture)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'usd',
      capture_method: 'manual', // Escrow — capture only on delivery confirmation
      metadata: {
        userId: session.user.id!,
        vendorId: products[0].vendorId,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: paymentIntent.id,
      breakdown: { subtotal, platformFee, totalAmount },
    });
  } catch (error) {
    console.error('[Checkout]', error);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
```

### app/api/upload/route.ts

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadFile } from '@/lib/minio';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bucket = (formData.get('bucket') as string) ?? process.env.MINIO_BUCKET_PRODUCTS!;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Optimize image with Sharp
    const optimized = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const objectName = `${session.user.id}/${randomUUID()}.webp`;
    const url = await uploadFile(bucket, objectName, optimized, 'image/webp');

    return NextResponse.json({ url, objectName });
  } catch (error) {
    console.error('[Upload]', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

---

## PHASE 8: PM2 PROCESS MANAGEMENT

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'halalhub',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/halalhub',
      instances: 'max',      // Cluster mode — 1 per CPU core
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '1G',
      error_file: '/var/log/halalhub/error.log',
      out_file: '/var/log/halalhub/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
```

```bash
# Start
pm2 start ecosystem.config.js

# Save PM2 config (survives reboots)
pm2 save

# Auto-start on boot
pm2 startup
# Copy and run the command it outputs

# Monitor
pm2 monit

# Logs
pm2 logs halalhub --lines 100
```

---

## PHASE 9: CI/CD — GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy HalalHub

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Build
        run: pnpm build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/halalhub
            git pull origin main
            pnpm install --frozen-lockfile --prod
            pnpm prisma migrate deploy
            pnpm build
            pm2 reload halalhub --update-env
            echo "✅ Deploy complete"
```

---

## PHASE 10: DATABASE BACKUP STRATEGY

```bash
# /etc/cron.d/halalhub-backup
# Daily PostgreSQL backup at 2am
0 2 * * * root /usr/local/bin/halalhub-backup.sh

# /usr/local/bin/halalhub-backup.sh
#!/bin/bash
DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_DIR="/var/backups/halalhub"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# Dump database
PGPASSWORD="YOUR_PASSWORD" pg_dump \
  -U halalhub_user \
  -h localhost \
  halalhub_db \
  | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Delete backups older than retention period
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup complete: db_$DATE.sql.gz"
```

---

## DEPLOYMENT CHECKLIST

```
Infrastructure
  ☐ Hostinger VPS provisioned (minimum 4GB RAM / 2 vCPU / 80GB SSD)
  ☐ A record: hh.plugmein.cloud → VPS IP added in hPanel
  ☐ DNS propagated (verify with dig hh.plugmein.cloud)
  ☐ Nginx installed and configured
  ☐ Certbot SSL certificate issued for hh.plugmein.cloud
  ☐ Firewall rules applied (ufw)
  ☐ Fail2ban configured

Database & Cache
  ☐ PostgreSQL 16 installed and secured
  ☐ halalhub_db and halalhub_user created
  ☐ Redis running, password set, bound to localhost
  ☐ MinIO running, buckets created

Application
  ☐ .env.local populated with all secrets
  ☐ pnpm install
  ☐ prisma migrate deploy
  ☐ pnpm build
  ☐ PM2 started with ecosystem.config.js
  ☐ pm2 save && pm2 startup

Payments & Integrations
  ☐ Stripe Connect configured
  ☐ Stripe webhook endpoint registered → /api/payments/webhook
  ☐ Google Maps API key restricted to hh.plugmein.cloud

CI/CD
  ☐ GitHub secrets set (VPS_HOST, VPS_USER, SSH_PRIVATE_KEY, DATABASE_URL)
  ☐ Test deploy pipeline end-to-end

Post-Deploy
  ☐ Run npm run health-check
  ☐ Confirm https://hh.plugmein.cloud loads
  ☐ Confirm SSL A+ rating at ssllabs.com
  ☐ Set up automated backup cron job
  ☐ Configure Sentry error tracking
```

---

## REVISED DEPLOYMENT TIMELINE

```
Week 1      VPS setup, DNS, Nginx, SSL, PostgreSQL, Redis, MinIO
Week 2-3    Prisma schema, migrations, NextAuth, core API routes
Week 4-5    Frontend: landing page, shop, product pages, cart
Week 6-7    Checkout flow, Stripe Connect escrow, order management
Week 8-9    Vendor dashboard, admin certification panel
Week 10-11  Location services, Barakat affiliate system
Week 12     Performance tuning, Redis caching, image optimization
Week 13     Beta launch — limited vendors on hh.plugmein.cloud
Week 14     Public launch
```

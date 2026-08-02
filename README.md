# Aplikasi AI Enterprise

Aplikasi enterprise modern untuk manajemen items dengan fitur CRUD, dashboard, dan analytics yang komprehensif.

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (15min access + 7d refresh)
- **Validation**: Zod
- **Password Hashing**: bcryptjs

### Frontend
- **Framework**: Next.js 14
- **Router**: App Router
- **UI**: React Server Components + Tailwind CSS
- **Type Safety**: TypeScript

## Features

- ✅ CRUD Operations (Create, Read, Update, Delete)
- ✅ Dashboard dengan statistik real-time
- ✅ Analytics dan reporting
- ✅ Authentication & Authorization (RBAC)
- ✅ Multi-tenant support
- ✅ Soft delete untuk data integrity
- ✅ Error handling terpusat
- ✅ Input validation dengan Zod

## Instalasi

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- npm atau yarn

### Setup Environment

1. Clone repository
```bash
git clone <repository-url>
cd aplikasi-ai-enterprise
```

2. Install dependencies
```bash
npm install
```

3. Setup environment variables
```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/aplikasi_ai_enterprise"
JWT_SECRET="your-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-key-min-32-chars"
NODE_ENV="development"
PORT=3000
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

4. Setup database
```bash
npm run db:push
npm run db:seed
```

5. Run development server
```bash
npm run dev
```

Aplikasi akan berjalan di:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3000/api

## Project Structure

```
aplikasi-ai-enterprise/
├── backend/
│   ├── src/
│   │   ├── controllers/          # HTTP handlers
│   │   ├── services/             # Business logic
│   │   ├── repositories/         # Data access layer
│   │   ├── middleware/           # Express middleware
│   │   ├── schemas/              # Zod validation schemas
│   │   ├── utils/                # Helper functions
│   │   ├── errors/               # Custom error classes
│   │   ├── types/                # TypeScript types
│   │   └── app.ts                # Express app setup
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   └── migrations/           # Database migrations
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── (auth)/               # Authentication pages
│   │   ├── (dashboard)/          # Protected routes
│   │   ├── api/                  # Route handlers
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Home page
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   ├── forms/                # Form components
│   │   └── sections/             # Page sections
│   ├── lib/
│   │   ├── api-client.ts         # API client
│   │   ├── auth.ts               # Auth utilities
│   │   └── utils.ts              # Helper functions
│   ├── styles/
│   │   └── globals.css           # Global styles
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register pengguna baru
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Items (Protected Routes)
- `GET /api/items` - Daftar semua items
- `GET /api/items/:id` - Detail item
- `POST /api/items` - Buat item baru
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Hapus item

### Dashboard
- `GET /api/dashboard/stats` - Statistik dashboard
- `GET /api/dashboard/summary` - Ringkasan data

### Analytics
- `GET /api/analytics/items` - Analytics items
- `GET /api/analytics/status` - Status distribution
- `GET /api/analytics/trends` - Trend data

## Request/Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Item 1",
    "description": "Sample",
    "status": "active",
    "createdAt": "2026-08-02T18:20:07.366Z"
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'name' is required"
  }
}
```

## Database Schema

### Items Entity
```sql
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  tenantId UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP,
  UNIQUE(tenantId, id),
  INDEX idx_tenant_created (tenantId, createdAt)
);
```

## Authentication Flow

1. User register/login → JWT access token (15 menit) + refresh token (7 hari)
2. Client menyimpan tokens di httpOnly cookies
3. Setiap request menggunakan access token di header Authorization
4. Refresh token untuk mendapatkan access token baru saat expired
5. RBAC middleware melakukan authorization check

## Error Codes

| Code | Status | Deskripsi |
|------|--------|-----------|
| `VALIDATION_ERROR` | 400 | Request validation gagal |
| `UNAUTHORIZED` | 401 | User belum login |
| `FORBIDDEN` | 403 | User tidak memiliki akses |
| `NOT_FOUND` | 404 | Resource tidak ditemukan |
| `CONFLICT` | 409 | Resource sudah ada |
| `INTERNAL_ERROR` | 500 | Server error |

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build production
npm run build

# Start production server
npm start

# Database commands
npm run db:push          # Push schema ke database
npm run db:seed          # Seed sample data
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio

# Linting & Testing
npm run lint             # Run ESLint
npm run type-check       # TypeScript check
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
```

## Security Best Practices

✅ JWT dengan short-lived access tokens
✅ Refresh tokens di httpOnly cookies
✅ Password hashing dengan bcryptjs (cost=12)
✅ Input validation dengan Zod schemas
✅ RBAC middleware untuk authorization
✅ Soft delete untuk data preservation
✅ Composite indexes untuk query performance
✅ Centralized error handling
✅ CORS configuration
✅ Rate limiting (recommended)

## Performance Optimization

- Composite indexes pada [tenantId, createdAt]
- Database query pagination (default limit=20)
- Caching di Redis (optional)
- Lazy loading di frontend
- Code splitting di Next.js

## Monitoring & Logging

- Centralized error logging
- Request/response logging
- Database query logging
- Performance metrics

## Deployment

### Docker
```bash
docker build -t aplikasi-ai-enterprise .
docker run -p 3000:3000 aplikasi-ai-enterprise
```

### Environment Variables (Production)
- `NODE_ENV=production`
- `DATABASE_URL` (secure connection string)
- `JWT_SECRET` (strong secret)
- `JWT_REFRESH_SECRET` (strong secret)

## Contributing

1. Create feature branch (`git checkout -b feature/name`)
2. Commit changes (`git commit -m 'Add feature'`)
3. Push to branch (`git push origin feature/name`)
4. Open Pull Request

## License

Proprietary - Aplikasi AI Enterprise

## Support

Untuk pertanyaan atau bug reports, hubungi tim development.
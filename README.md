# CRENIT Workspace

This workspace runs as one application with role-based access:


## Run End to End

From the workspace root:

```bash
npm run dev:all
```

Or run individually:

```bash
npm run dev:backend
npm run dev:app
```

## Build

```bash
npm run build:tenant
```

## Frontend API Configuration

The frontend expects:


Use `frontend/.env.example` as reference.

## Login Behavior

# CRENIT - Rental Management Platform

A modern full-stack rental management application with dual portals for tenants and landlords. Built with React, Node.js, and Express.

**Status**: ⚠️ Under active development. See [CODE_ASSESSMENT.md](CODE_ASSESSMENT.md) for production readiness details.

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd CRENIT

# Install dependencies
npm install
```

### Environment Setup

**Backend** (`backend/.env`):
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
ADMIN_SEED_PASSWORD=Admin@12345
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-smtp-user>
SMTP_PASS=<your-smtp-password-or-app-password>
SMTP_FROM=no-reply@crenit.com
```

For Gmail SMTP, use a Google App Password (16 characters) instead of your regular account password.

Run this SQL once in Supabase SQL Editor:

```sql
-- 1) Create full relational schema
-- backend/supabase-state-schema.sql

-- 2) Optional: migrate existing legacy app_state JSON blobs
-- backend/supabase-migrate-from-app-state.sql
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3000
```

### Running the Application

**Development (Full Stack)**:
```bash
npm run dev:all
```

**Individual Services**:
```bash
# Backend only (port 3000)
npm run dev:backend

# Frontend only (port 5173)
npm run dev:frontend
```

**Production Build**:
```bash
npm run build
```

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)         │
│  ┌───────────────────────────────────┐  │
│  │  Tenant Portal  │  Landlord Portal│  │
│  └───────────────────────────────────┘  │
│  Port: 5173                             │
└──────────────────┬──────────────────────┘
									 │ HTTPS/REST
┌──────────────────▼──────────────────────┐
│      Backend API (Express.js)           │
│  ┌───────────────────────────────────┐  │
│  │  Auth Routes                      │  │
│  │  Tenant Routes  │  Landlord Routes│  │
│  │  Shared Routes (Support, Docs)    │  │
│  └───────────────────────────────────┘  │
│  Port: 3000                             │
└──────────────────┬──────────────────────┘
									 │
				┌──────────┼──────────┐
				│          │          │
		┌───▼──┐  ┌───▼──┐  ┌───▼──┐
		│Users │  │Audit │  │Tenant│
		│.json │  │.json │  │.json │
		└──────┘  └──────┘  └──────┘
```

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 19.2.4 |
| **Frontend Build** | Vite | 8.0.1 |
| **Routing** | React Router | 7.13.2 |
| **Backend** | Express.js | 5.2.1 |
| **Authentication** | JWT | 9.0.3 |
| **Password Hashing** | bcryptjs (bcrypt-compatible) | 2.4.3 |
| **Validation** | Zod | 3.22.4 |
| **Testing** | Jest / Vitest | 29.7.0 / 2.1.8 |

### Authentication Flow

1. User submits email/password → Backend validates
2. Backend hashes password with bcrypt, compares to stored hash
3. On match, creates JWT token (7-day expiry)
4. Token stored in browser localStorage
5. Frontend includes token in `Authorization: Bearer <token>` header
6. Backend validates token on protected routes

---

## 👥 User Roles

### Tenant (`role=customer`)
- View lease agreement
- Pay rent and maintenance deposits
- Submit maintenance requests
- View payment history
- Manage profile and payment methods
- KYC verification status

### Landlord (`role=admin`)
- Manage properties and units
- Invite tenants
- View payments and disputes
- Track maintenance requests
- Generate reports
- Manage communications

---

## 🛠️ Development

### Project Structure

```
CRENIT/
├── backend/
│   ├── server.js                 # Main Express app
│   ├── package.json
│   ├── validation/
│   │   └── schemas.js            # Zod validation schemas
│   ├── __tests__/
│   │   ├── auth.test.js
│   │   └── validation.test.js
│   └── data/
│       ├── users.json
│       ├── bookings.json
│       ├── tenantData.json
│       └── audit-log.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Form/             # NEW: Reusable form components
│   │   │   ├── ui/
│   │   │   │   ├── StateComponents.jsx  # NEW: Error boundary, loaders
│   │   │   │   └── StatusBadge.jsx
│   │   │   ├── context/
│   │   │   └── layouts/
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx
│   │   │   ├── tenant/           # 12+ tenant pages
│   │   │   └── landlord/         # 13+ landlord pages
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   ├── validation.js     # NEW: Client-side validation
│   │   │   ├── tenantApi.js
│   │   │   └── landlordApi.js
│   │   ├── __tests__/
│   │   │   └── api.test.js
│   │   └── App.jsx
│   ├── vitest.config.js          # NEW: Test configuration
│   └── package.json
├── supabase/                      # Supabase workspace files
├── CODE_ASSESSMENT.md             # Production readiness audit
└── README.md                      # This file
```

### Key Improvements in This Update

✅ **Security**:
- Replaced SHA256 with bcrypt for password hashing
- Added global error handling middleware
- Removed insecure PASSWORD_PEPPER from environment

✅ **Quality**:
- Added Jest (backend) and Vitest (frontend) test frameworks
- Created test files for auth and API validation
- Added reusable form components to reduce duplication

✅ **Validation**:
- Implemented Zod schemas for runtime input validation
- Added client-side form validation utilities
- Comprehensive validation for all major endpoints

✅ **Developer Experience**:
- Added error boundaries for graceful error handling
- Created loading spinners and empty state components
- Improved component reusability

---

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend
npm test                 # Run once
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Frontend tests
cd ../frontend
npm test                 # Run once
npm run test:ui          # UI dashboard
npm run test:coverage    # Coverage report
```

### Test Coverage

- **Backend**: Authentication (password hashing, verification), input validation
- **Frontend**: API utilities, form validation, localStorage handling
- **Backend (new)**: Landlord property payload shaping, CRUD invariants, and authorization checks
- **Frontend (new)**: Route guard smoke checks for tenant/landlord access boundaries

### Smoke Tests

Legacy smoke tests preserved at:
- `backend/scripts/booking-flow-smoke.js`
- `backend/scripts/non-booking-endpoints-smoke.js`

Additional guard smoke tests:
- `frontend/src/__tests__/route-smoke.test.js`

---

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt-token>
```

### Core Endpoints

#### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/logout` - Invalidate token

#### Tenant Routes (`/tenant/*`)
- `GET /tenant/profile` - Get profile
- `PATCH /tenant/profile` - Update profile
- `GET /tenant/payments` - Payment history
- `POST /tenant/payments` - Make payment
- `GET /tenant/maintenance` - Maintenance requests
- `POST /tenant/maintenance` - Submit request

#### Landlord Routes (`/landlord/*`)
- `GET /landlord/properties` - List properties
- `POST /landlord/properties` - Create property
- `PATCH /landlord/properties/:id` - Update property
- `DELETE /landlord/properties/:id` - Delete property
- `GET /landlord/units` - List units
- `POST /landlord/units` - Add unit
- `GET /landlord/tenants` - List tenants
- `POST /landlord/tenants/invite` - Invite tenant

#### Shared List Query Params

The following list endpoints now support server-side querying and pagination:
- `GET /bookings`
- `GET /landlord/properties`

Supported query params:
- `q` - full-text search
- `status` - status filter (where applicable)
- `page` - 1-based page number
- `pageSize` - number of items per page (max 50)
- `sortBy` - sort field
- `sortDir` - `asc` or `desc`

Example:

```http
GET /api/landlord/properties?q=riverside&status=active&page=1&pageSize=10&sortBy=updatedAt&sortDir=desc
```

### Error Responses

All endpoints return consistent error format:

```json
{
	"error": "Error message",
	"details": [
		{
			"field": "email",
			"message": "Invalid email address"
		}
	],
	"timestamp": "2024-03-27T10:30:00.000Z"
}
```

---

## 🚀 Deployment

### Environment Variables

**Production Backend**:
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<use-secure-random-string>
ADMIN_SEED_PASSWORD=<strong-password>
FRONTEND_ORIGIN=https://yourdomain.com
DATABASE_URL=<postgresql-connection-string>
```

**Production Frontend**:
```env
VITE_API_URL=https://api.yourdomain.com
```

### Build & Deploy

```bash
# Build both
npm run build

# Deploy backend/ to your server
# Deploy frontend/dist/ to:
#   - Vercel
#   - Netlify
#   - S3 + CloudFront
#   - Any static host
```

---

## 📋 Roadmap

### Phase 1: Production Hardening (Now)
- ✅ Secure password hashing
- ✅ Error handling & logging
- ✅ Test framework setup
- ✅ Input validation
- 🔄 Component refactoring

### Phase 2: Database Migration
- Migrate from JSON to PostgreSQL
- Implement database migrations
- Add transaction support
- Setup automated backups

### Phase 3: Advanced Features
- Two-factor authentication
- Document OCR/verification
- Automated periodic tasks
- Advanced reporting
- Email notifications

### Phase 4: Scalability
- Caching layer (Redis)
- CDN for static assets
- Load balancing
- Database replication
- Audit trail archival

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Clear Cache & Reinstall

```bash
# Backend
cd backend && rm -rf node_modules package-lock.json && npm install

# Frontend
cd ../frontend && rm -rf node_modules package-lock.json && npm install
```

### Tests Failing

```bash
# Ensure dependencies are installed
npm install

# Run with verbose output
npm test -- --verbose

# Debug specific test
npm test -- auth.test.js
```

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and write tests
3. Run tests: `npm test`
4. Commit: `git commit -am 'Add feature'`
5. Push: `git push origin feature/your-feature`
6. Open a Pull Request

### Code Style

- Use ESLint configuration provided
- Format with Prettier (if configured)
- Follow existing component patterns
- Add tests for new functionality

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: See [CODE_ASSESSMENT.md](CODE_ASSESSMENT.md) for detailed technical analysis
- **Demo**: `admin@crenit.com` / `Admin@12345`

---

**Last Updated**: March 27, 2026
**Status**: In development - See CODE_ASSESSMENT.md for production readiness

refine this app for me , it needs some more life and power...
better the features , fix or remove or even replace jus make it work and better
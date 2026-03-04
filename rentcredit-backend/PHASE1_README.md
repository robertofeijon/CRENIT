# RentCredit Backend - Phase 1 Complete

## ✅ Backend Status: READY FOR TESTING

### What's Been Built

**Complete NestJS Backend with:**
- ✅ PostgreSQL database setup (rentcredit database with rentuser)
- ✅ JWT Authentication with role-based access control
- ✅ 6 Core Modules fully implemented
- ✅ Database entities with relationships
- ✅ CORS, Helmet, and global validation

---

## Database Setup

PostgreSQL is configured and ready:
```
Database: rentcredit
User: rentuser
Password: strongpassword
Host: localhost:5432
```

TypeORM is configured to auto-sync schema on startup.

---

## Backend Modules Implemented

### 1. **Auth Module** ✅
- **POST** `/auth/signup` - Register new user (tenant or landlord)
- **POST** `/auth/login` - Login with email/password
- **POST** `/auth/switch-role` - Switch between tenant/landlord (requires JWT)
- **GET** `/auth/me` - Get current user info (requires JWT)

**DTO Validation:**
- Email format validation
- Password minimum 8 characters
- Required fields: email, password, fullName, role

### 2. **Users Module** ✅
- **GET** `/users/profile` - Get logged-in user profile (requires JWT)
- **PUT** `/users/profile` - Update user profile (requires JWT)
- **GET** `/users` - Get all users (requires JWT)
- **GET** `/users/:id` - Get specific user (requires JWT)

### 3. **KYC Module** ✅
- **POST** `/kyc/upload` - Upload KYC document (requires JWT)
- **GET** `/kyc/status` - Get KYC verification status (requires JWT)
- **GET** `/kyc/pending` - Get all pending KYC (admin only)
- **PUT** `/kyc/verify/:kycId` - Verify/reject KYC (admin only)

**Statuses:** pending, verified, rejected

### 4. **Payments Module** ✅
- **POST** `/payments` - Create payment (landlord only)
- **POST** `/payments/:paymentId/record` - Record payment (tenant only)
- **GET** `/payments/tenant` - Get tenant's payments (tenant only)
- **GET** `/payments/property/:propertyId` - Get property payments (landlord only)
- **GET** `/payments/:paymentId` - Get payment details
- **PUT** `/payments/:paymentId/status` - Update payment status (landlord only)

**Payment Statuses:** pending, completed, failed, overdue

**Automatic Credit Score Updates:**
- Base score: 300
- Streak bonus: +10 per on-time payment (max 200)
- On-time bonus: +3 per percentage point
- Max score: 850
- Tier: poor → fair → good → excellent

### 5. **Properties Module** ✅
- **POST** `/properties` - Create property (landlord only)
- **GET** `/properties` - Get landlord's properties (landlord only)
- **GET** `/properties/:propertyId` - Get property details (landlord only)
- **GET** `/properties/:propertyId/stats` - Get property statistics (landlord only)
- **PUT** `/properties/:propertyId` - Update property
- **DELETE** `/properties/:propertyId` - Soft delete property

### 6. **Tenants Module** ✅
- **GET** `/tenants/by-property/:propertyId` - Get tenants by property (landlord only)
- **GET** `/tenants/all` - Get all tenants for landlord (landlord only)
- **GET** `/tenants/profile/:tenantId` - Get tenant profile
- **GET** `/tenants/:tenantId/reliability` - Get tenant reliability score

---

## Security Features

### JWT Authentication
- Tokens signed with `JWT_SECRET` from `.env`
- Token expiration: 7 days
- Bearer token validation on protected routes

### Role Guards
- Tenant operations locked to tenant role
- Landlord operations locked to landlord role
- Admin routes (KYC verification) check for admin role

### Data Isolation
- Users can only access their own data
- Tenants can only see their payments
- Landlords can only see their properties and tenant associations

### Global Validation
- All DTOs validated with `class-validator`
- Helmet for security headers
- CORS enabled for localhost:3000 and localhost:3001

---

## Database Entities

### User
- id, email, password, fullName, phoneNumber, role
- kycStatus (pending/verified/rejected)
- isActive flag
- Relations: payments, tenantProfile

### TenantProfile
- userId, creditScore, paymentStreak, totalPayments
- onTimePayments, onTimePaymentPercentage
- creditTier (poor/fair/good/excellent)

### Property
- id, landlordId, name, address, city, state, zipCode
- monthlyRent, unitCount
- Relations: payments

### Payment
- id, tenantId, propertyId, amount, status
- dueDate, paidAt, isOnTime
- receiptUrl, notes
- Relations: tenant, property

### KYCVerification
- userId, documentType, documentUrl
- status (pending/verified/rejected)
- rejectionReason, verifiedAt, verifiedBy

### Role (prepared for Phase 2)
- name, description

---

## Environment Variables (.env)

```
DATABASE_URL=postgresql://rentuser:strongpassword@localhost:5432/rentcredit
DB_HOST=localhost
DB_PORT=5432
DB_USER=rentuser
DB_PASSWORD=strongpassword
DB_NAME=rentcredit
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
NODE_ENV=development
PORT=3000
```

---

## Starting the Backend

```bash
cd /home/feijo/CRENIT/rentcredit-backend

# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start

# Running tests (API test script ready at /test-api.sh)
./test-api.sh
```

The server will listen on **http://localhost:3000**

---

## Testing the API

A complete test script is provided: `/rentcredit-backend/test-api.sh`

**Quick manual test with npm:**
```bash
# Terminal 1: Start the API
cd rentcredit-backend
npm run start:dev

# Terminal 2: Run tests
./test-api.sh
```

**Example cURL request:**
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "fullName": "Test User",
    "role": "tenant",
    "phoneNumber": "555-0001"
  }'
```

---

## Entities Created

- [User](src/entities/user.entity.ts)
- [TenantProfile](src/entities/tenant-profile.entity.ts)
- [Property](src/entities/property.entity.ts)
- [Payment](src/entities/payment.entity.ts)
- [KYCVerification](src/entities/kyc-verification.entity.ts)
- [Role](src/entities/role.entity.ts) (prep for Phase 2)

---

## What's Ready for Phase 2

- Foundation for deposit/escrow management
- Payment streak tracking (ready for credit reporting)
- Admin KYC verification workflow
- Role switching for dual-role users (already implemented)
- Payment history for analytics

---

## Next Steps

1. **Test the Backend:**
   - Run `./test-api.sh` to validate all endpoints
   - Check PostgreSQL: `psql -U rentuser -d rentcredit -c "\dt"`
   - Monitor logs: `npm run start:dev` (shows all requests)

2. **Frontend Development:**
   - Login/Signup UI
   - Role selection screen
   - KYC upload form
   - Tenant dashboard (overview, payments, credit)
   - Landlord dashboard (overview, properties, tenants)

3. **Database Validation:**
   - Verify tables created in rentcredit DB
   - Check relationships with `\d table_name` in psql
   - Validate data creation with test requests

---

## Known Limitations (Phase 1)

- No real credit bureau integration (mocked scoring)
- Payment recording is manual (not integrated with Stripe yet)
- No escrow calculations
- No dispute system
- No notifications
- No mobile apps

---

## Architecture Overview

```
Request Flow:
Client → Middleware (CORS, Helmet) → Routes
       → Guards (JWT, Role) → Service
       → Repository (TypeORM) → Database

Protected Routes:
- All routes except /auth/signup, /auth/login
- Require valid JWT token in Authorization header
```

---

**Phase 1 Backend: COMPLETE ✅**
Ready for frontend integration and comprehensive testing.

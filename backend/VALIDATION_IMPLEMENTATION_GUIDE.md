/**
 * Backend Validation Implementation Guide
 *
 * This shows how to integrate the new Zod validation schemas
 * into existing backend endpoints for robust input validation.
 */

// ============================================================================
// BEFORE: No Validation (Unsafe)
// ============================================================================

/*
app.post('/api/auth/register', (req, res) => {
  const { email, password, fullName } = req.body;

  // Vulnerable to:
  // - Invalid email formats
  // - Weak passwords
  // - SQL injection (if database is added later)
  // - Oversized payloads

  const passwordHash = hashPassword(password);
  // ... create user
});
*/

// ============================================================================
// AFTER: With Validation (Safe)
// ============================================================================

/*
import { validateBody, RegisterSchema } from './validation/schemas';

// Option 1: Inline Validation
app.post('/api/auth/register', (req, res) => {
  const result = validateRequest(RegisterSchema, req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: result.error
    });
  }

  const { email, password, fullName } = result.data;
  // ... rest of logic uses validated data
});

// Option 2: Using Middleware (Recommended)
app.post(
  '/api/auth/register',
  validateBody(RegisterSchema),
  (req, res) => {
    // req.validated already contains parsed and validated data
    const { email, password, fullName } = req.validated;
    // ... rest of logic
  }
);
*/

// ============================================================================
// VALIDATION EXAMPLES FOR EACH ENDPOINT
// ============================================================================

/*
// Authentication Endpoints
==================================

// Register
app.post('/api/auth/register',
  validateBody(RegisterSchema),
  (req, res) => {
    const { email, password, fullName, adminCode } = req.validated;
    // ... create user
  }
);

// Login
app.post('/api/auth/login',
  validateBody(LoginSchema),
  (req, res) => {
    const { email, password } = req.validated;
    // ... authenticate user
  }
);

// Tenant Endpoints
====================

// Add Payment Method
app.post('/api/tenant/payments/methods',
  requireAuth,
  requireTenant,
  validateBody(PaymentMethodSchema),
  (req, res) => {
    const { label, type, lastFour } = req.validated;
    // ... add payment method
  }
);

// Make Rent Payment
app.post('/api/tenant/payments',
  requireAuth,
  requireTenant,
  validateBody(RentPaymentSchema),
  (req, res) => {
    const { amount, methodId, notes } = req.validated;
    // ... process payment
  }
);

// Submit Maintenance Request
app.post('/api/tenant/maintenance',
  requireAuth,
  requireTenant,
  validateBody(MaintenanceRequestSchema),
  (req, res) => {
    const { category, description, priority, photos } = req.validated;
    // ... create maintenance request
  }
);

// Landlord Endpoints
======================

// Create Property
app.post('/api/landlord/properties',
  requireAuth,
  requireLandlord,
  validateBody(PropertySchema),
  (req, res) => {
    const { name, address, city, state, zipCode } = req.validated;
    // ... create property
  }
);

// Add Unit
app.post('/api/landlord/units',
  requireAuth,
  requireLandlord,
  validateBody(UnitSchema),
  (req, res) => {
    const { unitNumber, building, rentAmount, bedrooms, bathrooms } = req.validated;
    // ... add unit
  }
);

// Invite Tenant
app.post('/api/landlord/tenants/invite',
  requireAuth,
  requireLandlord,
  validateBody(TenantInvitationSchema),
  (req, res) => {
    const { email, fullName, unitId } = req.validated;
    // ... send invitation
  }
);

// Support Endpoint
====================

// Create Support Ticket
app.post('/api/tenant/support/contact',
  requireAuth,
  requireTenant,
  validateBody(SupportTicketSchema),
  (req, res) => {
    const { topic, message, attachments, priority } = req.validated;
    // ... create ticket
  }
);
*/

// ============================================================================
// ERROR HANDLING BEST PRACTICES
// ============================================================================

/*
// All validation errors automatically return 400 with details:
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    },
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter"
    }
  ]
}

// Server-side exceptions caught by global error handler:
// Returns 500 with error message and timestamp in production mode
*/

// ============================================================================
// CUSTOM VALIDATION SCHEMAS
// ============================================================================

/*
// If you need custom validation, extend the schemas:

import { z } from 'zod';
import { RegisterSchema } from './validation/schemas';

const ExtendedRegisterSchema = RegisterSchema.extend({
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "Must accept terms and conditions"
  }),
  referralCode: z.string().optional().refine(
    (code) => !code || isValidReferralCode(code),
    { message: "Invalid referral code" }
  )
});

// Or create a new one:
const FileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "File must be smaller than 5MB"
    })
    .refine((file) => ['image/jpeg', 'image/png'].includes(file.type), {
      message: "File must be JPG or PNG"
    }),
  description: z.string().max(200).optional()
});
*/

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/*
Priority endpoints to add validation (in order):

[ ] POST /api/auth/register - RegisterSchema
[ ] POST /api/auth/login - LoginSchema
[ ] PATCH /api/*/profile - Update existing validation
[ ] POST /api/tenant/payments - RentPaymentSchema
[ ] POST /api/tenant/payments/methods - PaymentMethodSchema
[ ] POST /api/tenant/maintenance - MaintenanceRequestSchema
[ ] POST /api/landlord/properties - PropertySchema
[ ] POST /api/landlord/units - UnitSchema
[ ] POST /api/landlord/tenants/invite - TenantInvitationSchema
[ ] POST /api/*/support/contact - SupportTicketSchema
[ ] PATCH /api/*/password - PasswordChangeSchema

Testing:
[ ] Test with valid data → should pass
[ ] Test with invalid email → should return error
[ ] Test with weak password → should return error
[ ] Test with oversized text → should return error
[ ] Test with missing required fields → should return error
*/

export default null;

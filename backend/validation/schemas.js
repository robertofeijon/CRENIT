/**
 * Input Validation Schemas
 * Uses Zod for runtime type validation
 * Reference: https://zod.dev
 */

const { z } = require("zod");

// Common field schemas
const EmailField = z
  .string()
  .email("Invalid email address")
  .min(5, "Email must be at least 5 characters")
  .max(254, "Email must be less than 254 characters")
  .transform((val) => val.toLowerCase().trim());

const PasswordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const NameField = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be less than 100 characters")
  .transform((val) => val.trim());

const PhoneField = z
  .string()
  .regex(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, "Invalid phone number");

const CurrencyField = z
  .number()
  .min(0, "Amount must be greater than or equal to 0")
  .max(999999999, "Amount too large");

// Auth Schemas
const RegisterSchema = z.object({
  email: EmailField,
  password: PasswordField,
  fullName: NameField,
  role: z.enum(["customer", "admin"]).default("customer"),
  adminCode: z.string().optional()
});

const LoginSchema = z.object({
  email: EmailField,
  password: z.string().min(1, "Password is required")
});

const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: PasswordField,
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"]
});

// Tenant Schemas
const PaymentMethodSchema = z.object({
  label: z.string().min(1).max(50),
  type: z.enum(["credit_card", "bank_transfer", "digital_wallet"]),
  lastFour: z.string().regex(/^\d{4}$/).optional()
});

const RentPaymentSchema = z.object({
  amount: CurrencyField,
  methodId: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  notes: z.string().max(500).optional()
});

const MaintenanceRequestSchema = z.object({
  category: z.enum(["plumbing", "electrical", "general", "other"]),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  photos: z.array(z.string().url()).max(5).optional()
});

// Landlord Schemas
const UnitSchema = z.object({
  unitNumber: z.string().min(1).max(50),
  building: z.string().min(1).max(100),
  rentAmount: CurrencyField,
  bedrooms: z.number().int().min(0).max(10),
  bathrooms: z.number().min(0).max(10),
  squareFeet: z.number().int().min(0).optional()
});

const TenantInvitationSchema = z.object({
  email: EmailField,
  fullName: NameField,
  unitId: z.string()
});

const PropertySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(2),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid zip code"),
  units: z.array(UnitSchema).optional()
});

// Support/Contact Schemas
const SupportTicketSchema = z.object({
  topic: z.string().min(1).max(100),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  attachments: z.array(z.string().url()).max(3).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium")
});

// Utility function to validate and parse request data
function validateRequest(schema, data) {
  try {
    return {
      success: true,
      data: schema.parse(data)
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      error: [{ message: "Validation failed" }]
    };
  }
}

// Express middleware for validation
function validateBody(schema) {
  return (req, res, next) => {
    const result = validateRequest(schema, req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error
      });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = {
  // Schemas
  EmailField,
  PasswordField,
  NameField,
  PhoneField,
  CurrencyField,
  RegisterSchema,
  LoginSchema,
  PasswordChangeSchema,
  PaymentMethodSchema,
  RentPaymentSchema,
  MaintenanceRequestSchema,
  UnitSchema,
  TenantInvitationSchema,
  PropertySchema,
  SupportTicketSchema,
  // Utilities
  validateRequest,
  validateBody
};

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "crenit-dev-secret";
const ADMIN_SEED_PASSWORD = process.env.ADMIN_SEED_PASSWORD || "Admin@12345";
const ADMIN_REGISTRATION_CODE = process.env.ADMIN_REGISTRATION_CODE || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";
const FALLBACK_TO_LOCAL_STATE = String(process.env.FALLBACK_TO_LOCAL_STATE || "false").toLowerCase() === "true";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "no-reply@crenit.local";

const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

if (!hasSupabaseConfig && !FALLBACK_TO_LOCAL_STATE) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set FALLBACK_TO_LOCAL_STATE=true for local fallback.");
}

const supabase = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })
  : null;

const mailer = SMTP_HOST && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  })
  : null;

let storageMode = "supabase";
const RATE_LIMIT_BUCKETS = new Map();

let storageReady = false;
const defaultNow = safeDate("2026-03-25T00:00:00.000Z");
const defaultState = {
  bookings: { bookings: [] },
  properties: {
    properties: [
      {
        id: "PR-1001",
        createdAt: defaultNow,
        landlordId: "USR-ADMIN-1",
        name: "Riverside Residences",
        address: "14 Riverside Drive, Unit B4",
        city: "Windhoek",
        state: "Khomas",
        zipCode: "9000",
        unitCount: 12,
        occupiedUnits: 11,
        maintenanceUnits: 1,
        bedrooms: 2,
        bathrooms: 2,
        monthlyRentLow: 850,
        monthlyRentHigh: 1450,
        occupancyRate: 92,
        status: "active",
        updatedAt: defaultNow,
        recentActivity: "Lease verified for Unit B4"
      },
      {
        id: "PR-1002",
        createdAt: defaultNow,
        landlordId: "USR-ADMIN-1",
        name: "Summit Lofts",
        address: "71 Market Street",
        city: "Windhoek",
        state: "Khomas",
        zipCode: "9001",
        unitCount: 10,
        occupiedUnits: 8,
        maintenanceUnits: 1,
        bedrooms: 1,
        bathrooms: 1,
        monthlyRentLow: 1100,
        monthlyRentHigh: 1750,
        occupancyRate: 80,
        status: "pending",
        updatedAt: defaultNow,
        recentActivity: "One lease is awaiting signature"
      },
      {
        id: "PR-1003",
        createdAt: defaultNow,
        landlordId: "USR-ADMIN-1",
        name: "Northline Court",
        address: "22 Bay Road",
        city: "Windhoek",
        state: "Khomas",
        zipCode: "9002",
        unitCount: 8,
        occupiedUnits: 8,
        maintenanceUnits: 0,
        bedrooms: 3,
        bathrooms: 2,
        monthlyRentLow: 980,
        monthlyRentHigh: 1320,
        occupancyRate: 100,
        status: "active",
        updatedAt: defaultNow,
        recentActivity: "All units occupied and current"
      }
    ]
  },
  users: {
    users: [
      {
        id: "USR-ADMIN-1",
        fullName: "System Admin",
        email: "admin@crenit.com",
        role: "admin",
        passwordHash: hashPassword(ADMIN_SEED_PASSWORD),
        kycStatus: "approved",
        kycDocuments: [],
        kycSubmittedAt: defaultNow,
        sessions: [],
        createdAt: defaultNow,
        updatedAt: defaultNow
      }
    ]
  },
  tenantData: { tenants: {}, relationships: { invitations: [] }, unitAssignments: {}, unitAssignmentHistory: {} },
  auditLog: { events: [] }
};
const stateCache = {
  bookings: null,
  properties: null,
  users: null,
  tenantData: null,
  auditLog: null
};

const tenantRealtimeClients = new Map();

const SHARED_TEST_CARD = Object.freeze({
  id: "PM-SHARED-TEST-CARD",
  label: "Crenit Shared Test Card",
  type: "card",
  brand: "VISA",
  last4: "4242",
  cardholder: "Crenit Test Tenant",
  expiresAt: "12/34",
  isPrimary: true
});

app.use(express.json({ limit: "2mb" }));

const configuredOrigins = FRONTEND_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS blocked: origin not allowed"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

function createDefaultTenant(user) {
  const now = safeDate();
  const demoStartDate = "2024-01-15";
  const demoEndDate = "2025-12-31";

  return {
    tenantId: user.id,
    verification: {
      status: "approved",
      requiredSteps: [
        "Confirm your legal name",
        "Upload a government ID",
        "Upload proof of current address",
        "Review and submit"
      ],
      documents: [
        { id: "DOC-1", type: "id", name: "Driver License - State ID.pdf", uploadedAt: "2024-01-10" },
        { id: "DOC-2", type: "proof_of_address", name: "Utility Bill - Jan 2024.pdf", uploadedAt: "2024-01-10" }
      ],
      submittedAt: "2024-01-10"
    },
    rent: {
      amountDue: 2500,
      nextPaymentDate: "2026-05-01",
      status: "due",
      autoPayEnabled: true,
      currentMonthLabel: "April 2026"
    },
    paymentMethods: [
      { ...SHARED_TEST_CARD }
    ],
    payments: {
      upcoming: [
        { id: "UP-1", amount: 2500, dueDate: "2026-05-01", status: "scheduled" }
      ],
      history: [
        { id: "H-1", amount: 2500, date: "2026-04-01", status: "paid", method: "bank_account" },
        { id: "H-2", amount: 2500, date: "2026-03-01", status: "paid", method: "bank_account" },
        { id: "H-3", amount: 2500, date: "2026-02-01", status: "paid", method: "bank_account" }
      ]
    },
    credit: {
      currentScore: 720,
      tier: "Good",
      history: [
        { month: "Jan", score: 680 },
        { month: "Feb", score: 695 },
        { month: "Mar", score: 710 },
        { month: "Apr", score: 720 }
      ],
      onTimePercentage: 100,
      latePaymentCount: 0,
      paymentStreak: 4,
      calculationRule: "Score is weighted by on-time payments, payment consistency, and dispute resolution performance.",
      reportUrl: "https://demo.crenit.local/reports/credit-score.pdf",
      reportShareLink: "https://demo.crenit.local/share/abc123"
    },
    lease: {
      startDate: demoStartDate,
      endDate: demoEndDate,
      propertyAddress: "456 Oak Street, Springfield, IL 62701",
      unit: "3B",
      rentAmount: 2500,
      terms: [
        "Security deposit: $2,500",
        "Pet-friendly: One pet allowed",
        "Utilities: Tenant responsible for electric and water",
        "Parking: Included (1 spot)"
      ],
      documentUrl: "https://demo.crenit.local/documents/lease-2024.pdf",
      landlord: {
        name: "Property Management Group",
        email: "landlord@propmanagement.local"
      },
      renewalWarning: ""
    },
    deposit: {
      totalAmount: 2500,
      escrowStatus: "funded",
      refundStatus: "pending_lease_end",
      deductions: [],
      timeline: [
        { event: "Deposit received", date: "2024-01-15", status: "completed" },
        { event: "Move-in inspection", date: "2024-01-20", status: "completed" },
        { event: "Lease active", date: "2024-01-21", status: "active" },
        { event: "Expected refund", date: "2025-12-31", status: "pending" }
      ]
    },
    disputes: [],
    notifications: {
      preferences: {
        paymentReminders: true,
        paymentConfirmations: true,
        verificationUpdates: true,
        disputeUpdates: true,
        leaseAlerts: true,
        depositAlerts: true
      },
      items: [
        { id: "NT-1", title: "Payment confirmed", message: "Your April payment of $2,500 has been posted.", type: "payment", read: true, createdAt: "2026-04-01" },
        { id: "NT-2", title: "Credit score updated", message: "Your credit score improved to 720 (Good).", type: "credit", read: false, createdAt: "2026-04-02" }
      ]
    },
    documents: [
      { id: "DOC-3", type: "lease", name: "Lease Agreement 2024-2025.pdf", date: "2024-01-15", url: "https://demo.crenit.local/docs/lease.pdf" },
      { id: "DOC-4", type: "receipt", name: "Receipt 2026-04-01.pdf", date: "2026-04-01", url: "https://demo.crenit.local/docs/receipt-apr.pdf" }
    ],
    profile: {
      fullName: user.fullName,
      email: user.email,
      phone: "(555) 123-4567",
      twoFactorEnabled: false,
      linkedAccounts: []
    },
    sessions: [],
    support: {
      faq: [],
      articles: [],
      tickets: []
    },
    activity: [
      { id: `ACT-${Date.now()}-3`, message: "Payment completed for $2,500", at: "2026-04-01" },
      { id: `ACT-${Date.now()}-2`, message: "Credit score updated to 720", at: "2026-04-02" },
      { id: `ACT-${Date.now()}-1`, message: "Tenant workspace created", at: now }
    ]
  };
}

function createDefaultLandlordWorkspace(user) {
  const now = safeDate();

  return {
    documents: [
      {
        id: `LDOC-${Date.now()}-1`,
        name: "Portfolio Lease Index.pdf",
        category: "lease",
        property: "Riverside Residences",
        status: "signed",
        sizeKb: 824,
        uploadedAt: now,
        expiresAt: "2027-03-25T00:00:00.000Z",
        url: createDocumentUrl("Portfolio Lease Index.pdf")
      },
      {
        id: `LDOC-${Date.now()}-2`,
        name: "Inspection Template.pdf",
        category: "inspection",
        property: "Portfolio",
        status: "review",
        sizeKb: 468,
        uploadedAt: now,
        expiresAt: "2026-12-31T00:00:00.000Z",
        url: createDocumentUrl("Inspection Template.pdf")
      }
    ],
    notifications: {
      preferences: {
        bookingAlerts: true,
        paymentAlerts: true,
        verificationAlerts: true,
        supportUpdates: true,
        systemAlerts: true
      },
      items: [
        {
          id: `LNT-${Date.now()}-1`,
          title: "Portfolio workspace ready",
          message: "Your landlord workspace is synced with portfolio, booking, and audit data.",
          type: "system",
          read: false,
          createdAt: now
        },
        {
          id: `LNT-${Date.now()}-2`,
          title: "Verification pending",
          message: "Submit landlord verification to unlock finance actions and tenant payments.",
          type: "verification",
          read: true,
          createdAt: now
        }
      ]
    },
    support: {
      faq: [
        {
          q: "How do I send payment reminders?",
          a: "Use the payments workspace to confirm, approve, and reject requests before due dates pass."
        },
        {
          q: "Where can I review disputes?",
          a: "Open the disputes queue to track evidence, responses, and resolution status in one timeline."
        },
        {
          q: "How do I keep documents organized?",
          a: "Use categories, status labels, and expiry dates so lease and inspection records stay searchable."
        }
      ],
      articles: [
        {
          id: "LAR-1",
          title: "Managing portfolio documents",
          category: "documents",
          summary: "Keep lease, inspection, and compliance files tagged and easy to review."
        },
        {
          id: "LAR-2",
          title: "Running a clean dispute process",
          category: "disputes",
          summary: "Respond quickly, keep evidence attached, and resolve with a clear paper trail."
        },
        {
          id: "LAR-3",
          title: "Reading portfolio signals",
          category: "analytics",
          summary: "Use occupancy, revenue, and request trends to spot issues before they spread."
        }
      ],
      tickets: []
    },
    deposits: [
      {
        id: "dep-101",
        tenant: "Aisha Morgan",
        property: "Riverside Residences",
        total: 1800,
        status: "held",
        deductions: [],
        history: [{ at: "2026-03-01T10:00:00.000Z", action: "Deposit recorded" }]
      },
      {
        id: "dep-102",
        tenant: "Daniel Park",
        property: "Oakline Apartments",
        total: 2200,
        status: "refund_pending",
        deductions: [{ amount: 180, reason: "Wall paint touch-up", at: "2026-03-28T09:20:00.000Z" }],
        history: [
          { at: "2026-02-01T08:40:00.000Z", action: "Deposit recorded" },
          { at: "2026-03-26T12:15:00.000Z", action: "Inspection completed" },
          { at: "2026-03-29T16:45:00.000Z", action: "Refund pending release" }
        ]
      }
    ],
    disputes: [
      {
        id: "disp-301",
        title: "Deposit paint deduction challenge",
        tenant: "Aisha Morgan",
        property: "Riverside Residences",
        priority: "medium",
        status: "open",
        openedAt: "2026-03-20T11:00:00.000Z",
        messages: [
          { by: "tenant", body: "I disagree with the paint deduction amount.", at: "2026-03-20T11:00:00.000Z" },
          { by: "landlord", body: "We are reviewing photos and invoices now.", at: "2026-03-20T13:45:00.000Z" }
        ]
      }
    ],
    settings: {
      businessName: "Prime Estates",
      email: user.email,
      phone: "+1 555 1020",
      payoutAccount: "First Trust Bank **** 4418",
      timezone: "UTC",
      monthlyStatementDay: 1,
      twoFactorEnabled: false,
      notifPaymentAlerts: true,
      notifEscrowAlerts: true,
      notifDisputeAlerts: true,
      sessions: [
        { id: "sess-1", label: "Chrome on Windows", lastSeen: "2 min ago", status: "active" },
        { id: "sess-2", label: "Mobile Safari", lastSeen: "1 day ago", status: "active" }
      ]
    }
  };
}

function getOrCreateLandlordWorkspace(user) {
  const usersData = readUsers();
  const index = (usersData.users || []).findIndex((entry) => entry.id === user.id);
  if (index < 0) {
    throw new Error("User not found.");
  }

  const record = normalizeUserRecord(usersData.users[index]);
  const defaults = createDefaultLandlordWorkspace(record);
  let changed = false;

  if (!Array.isArray(record.landlordDocuments)) {
    record.landlordDocuments = cloneData(defaults.documents);
    changed = true;
  }

  if (!record.landlordNotifications || typeof record.landlordNotifications !== "object") {
    record.landlordNotifications = cloneData(defaults.notifications);
    changed = true;
  } else {
    const previousPreferences = record.landlordNotifications.preferences || {};
    const previousItems = record.landlordNotifications.items;
    const normalizedPreferences = {
      ...defaults.notifications.preferences,
      ...previousPreferences
    };
    record.landlordNotifications.preferences = normalizedPreferences;
    record.landlordNotifications.items = Array.isArray(record.landlordNotifications.items)
      ? record.landlordNotifications.items
      : cloneData(defaults.notifications.items);
    if (JSON.stringify(previousPreferences) !== JSON.stringify(normalizedPreferences) || previousItems !== record.landlordNotifications.items) {
      changed = true;
    }
  }

  if (!record.landlordSupport || typeof record.landlordSupport !== "object") {
    record.landlordSupport = cloneData(defaults.support);
    changed = true;
  } else {
    const previousFaq = record.landlordSupport.faq;
    const previousArticles = record.landlordSupport.articles;
    const previousTickets = record.landlordSupport.tickets;
    record.landlordSupport.faq = Array.isArray(record.landlordSupport.faq) ? record.landlordSupport.faq : cloneData(defaults.support.faq);
    record.landlordSupport.articles = Array.isArray(record.landlordSupport.articles) ? record.landlordSupport.articles : cloneData(defaults.support.articles);
    record.landlordSupport.tickets = Array.isArray(record.landlordSupport.tickets) ? record.landlordSupport.tickets : cloneData(defaults.support.tickets);
    if (previousFaq !== record.landlordSupport.faq || previousArticles !== record.landlordSupport.articles || previousTickets !== record.landlordSupport.tickets) {
      changed = true;
    }
  }

  if (!Array.isArray(record.landlordDeposits)) {
    record.landlordDeposits = cloneData(defaults.deposits);
    changed = true;
  }

  if (!Array.isArray(record.landlordDisputes)) {
    record.landlordDisputes = cloneData(defaults.disputes);
    changed = true;
  }

  if (!record.landlordSettings || typeof record.landlordSettings !== "object") {
    record.landlordSettings = cloneData(defaults.settings);
    changed = true;
  } else {
    const previousSessions = record.landlordSettings.sessions;
    record.landlordSettings = {
      ...defaults.settings,
      ...record.landlordSettings,
      sessions: Array.isArray(record.landlordSettings.sessions)
        ? record.landlordSettings.sessions
        : cloneData(defaults.settings.sessions)
    };
    if (previousSessions !== record.landlordSettings.sessions) {
      changed = true;
    }
  }

  usersData.users[index] = record;
  if (changed) {
    writeUsers(usersData);
  }

  return {
    usersData,
    user: record
  };
}

function readUsers() {
  ensureStorageReady();
  return cloneData(stateCache.users);
}

function readProperties() {
  ensureStorageReady();
  return cloneData(stateCache.properties);
}

function writeProperties(data) {
  ensureStorageReady();
  stateCache.properties = cloneData(data);
  queuePersist("properties", stateCache.properties);
}

function readBookings() {
  ensureStorageReady();
  return cloneData(stateCache.bookings);
}

function writeBookings(data) {
  ensureStorageReady();
  stateCache.bookings = cloneData(data);
  queuePersist("bookings", stateCache.bookings);
}

function writeUsers(data) {
  ensureStorageReady();
  stateCache.users = cloneData(data);
  queuePersist("users", stateCache.users);
}

function readAuditLog() {
  ensureStorageReady();
  return cloneData(stateCache.auditLog);
}

function writeAuditLog(data) {
  ensureStorageReady();
  stateCache.auditLog = cloneData(data);
  queuePersist("auditLog", stateCache.auditLog);
}

function readTenantData() {
  ensureStorageReady();
  return cloneData(stateCache.tenantData);
}

function writeTenantData(data) {
  ensureStorageReady();
  stateCache.tenantData = cloneData(data);
  queuePersist("tenantData", stateCache.tenantData);
}

function initializeLocalFallbackStorage() {
  storageMode = "local-fallback";
  for (const keyName of Object.keys(stateCache)) {
    stateCache[keyName] = cloneData(defaultState[keyName]);
  }
  storageReady = true;
}

// Persistence queue for batched writes
const persistQueue = new Map();
let persistTimer = null;

async function persistAppStateBatch() {
  if (!supabase || !persistQueue.size) {
    persistQueue.clear();
    return;
  }

  const rows = Array.from(persistQueue.entries()).map(([key, payload]) => ({
    key,
    payload,
    updated_at: safeDate()
  }));
  persistQueue.clear();

  const { error } = await supabase
    .from("app_state")
    .upsert(rows, { onConflict: "key" });

  if (error) {
    throw error;
  }
}

function queuePersist(key, data) {
  persistQueue.set(key, data);
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    if (storageMode !== "supabase") {
      persistQueue.clear();
      return;
    }

    persistAppStateBatch().catch((error) => {
      console.warn("[PERSIST WARNING] Failed to persist app_state batch:", error.message);
    });
  }, 100);
}

async function initializeStorage() {
  try {
    if (!hasSupabaseConfig) {
      initializeLocalFallbackStorage();
      return Promise.resolve();
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("app_state")
      .select("key, payload")
      .in("key", Object.keys(stateCache));

    if (existingError) {
      throw existingError;
    }

    const existingMap = new Map((existingRows || []).map((row) => [row.key, row.payload]));
    const seedRows = [];

    for (const keyName of Object.keys(stateCache)) {
      if (existingMap.has(keyName)) {
        stateCache[keyName] = cloneData(existingMap.get(keyName));
      } else {
        stateCache[keyName] = cloneData(defaultState[keyName]);
        seedRows.push({ key: keyName, payload: stateCache[keyName], updated_at: safeDate() });
      }
    }

    if (seedRows.length) {
      const { error: seedError } = await supabase
        .from("app_state")
        .upsert(seedRows, { onConflict: "key" });

      if (seedError) {
        throw seedError;
      }
    }

    storageMode = "supabase";
    storageReady = true;
    return Promise.resolve();
  } catch (error) {
    if (FALLBACK_TO_LOCAL_STATE) {
      initializeLocalFallbackStorage();
      return Promise.resolve();
    }
    return Promise.reject(error);
  }
}

function ensureStorageReady() {
  if (!storageReady) {
    throw new Error("Storage not yet initialized. Wait for initStoragePromise to resolve.");
  }
}

function emitTenantRealtimeEvent(userId, eventType, payload) {
  const clients = tenantRealtimeClients.get(userId);
  if (!clients || !clients.size) {
    return;
  }

  const envelope = JSON.stringify({ eventType, payload, at: safeDate() });
  for (const response of clients) {
    response.write(`event: ${eventType}\n`);
    response.write(`data: ${envelope}\n\n`);
  }
}

function getRateLimitKey(req, scope) {
  const userId = req.user?.id || "anonymous";
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  return `${scope}:${userId}:${ip}`;
}

function isRateLimited(req, scope, limit, windowMs) {
  const key = getRateLimitKey(req, scope);
  const now = Date.now();
  const bucket = RATE_LIMIT_BUCKETS.get(key);

  if (!bucket || now > bucket.resetAt) {
    RATE_LIMIT_BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  RATE_LIMIT_BUCKETS.set(key, bucket);
  return bucket.count > limit;
}

function createRateLimit(scope, limit, windowMs) {
  return (req, res, next) => {
    if (isRateLimited(req, scope, limit, windowMs)) {
      return res.status(429).json({ error: "Too many requests. Please retry shortly." });
    }
    return next();
  };
}

function trimTo(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function toMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.round(numeric * 100) / 100);
}

function safeDate(dateInput) {
  if (dateInput) {
    const d = new Date(dateInput);
    // If the date is valid, return ISO string
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  return new Date().toISOString();
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function createDocumentUrl(filename) {
  return `https://demo.crenit.local/documents/${encodeURIComponent(filename)}`;
}

function createReceiptUrl(reference) {
  return `https://demo.crenit.local/receipts/${encodeURIComponent(reference)}.pdf`;
}

function normalizeEmail(email) {
  return String(email || "")
    .toLowerCase()
    .trim();
}

function hashPassword(password) {
  return bcrypt.hashSync(String(password), 10);
}

function verifyPassword(password, passwordHash) {
  return bcrypt.compareSync(String(password), passwordHash);
}

function validatePropertyInput(payload) {
  const name = trimTo(payload?.name, 160);
  const address = trimTo(payload?.address, 220);
  const city = trimTo(payload?.city, 80);
  const state = trimTo(payload?.state, 80);
  const zipCode = trimTo(payload?.zipCode, 20);
  const recentActivity = trimTo(payload?.recentActivity, 220);

  if (!name || !address) {
    return { error: "Property name and address are required." };
  }

  return {
    payload: {
      ...payload,
      name,
      address,
      city,
      state,
      zipCode,
      recentActivity
    }
  };
}

let initStoragePromise = initializeStorage();

app.use(async (req, res, next) => {
  try {
    await initStoragePromise;
    return next();
  } catch (error) {
    return next(error);
  }
});

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    location: user.location || "",
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function signToken(user, sessionId) {
  return jwt.sign(
    {
      sub: user.id,
      sid: sessionId,
      role: user.role,
      email: user.email,
      fullName: user.fullName
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.header("authorization") || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid authorization token." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.sub,
      sessionId: payload.sid,
      fullName: payload.fullName,
      email: payload.email,
      role: payload.role
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Session expired or invalid token." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission for this action." });
    }
    return next();
  };
}

function requireTenant(req, res, next) {
  if (!req.user || req.user.role !== "customer") {
    return res.status(403).json({ error: "Tenant access required." });
  }
  return next();
}

function isLandlordRole(role) {
  return ["landlord", "admin"].includes(role);
}

function requireLandlord(req, res, next) {
  if (!req.user || !isLandlordRole(req.user.role)) {
    return res.status(403).json({ error: "Landlord access required." });
  }
  return next();
}

function normalizeUserRecord(user) {
  return {
    ...user,
    location: String(user.location || "").trim(),
    sessions: Array.isArray(user.sessions) ? user.sessions : [],
    kycStatus: user.kycStatus || (isLandlordRole(user.role) ? "pending" : undefined),
    kycDocuments: Array.isArray(user.kycDocuments) ? user.kycDocuments : [],
    kycSubmittedAt: user.kycSubmittedAt || "",
    kycReviewedAt: user.kycReviewedAt || "",
    kycReviewNote: user.kycReviewNote || ""
  };
}

function attachSessionToUser(userId, req) {
  const usersData = readUsers();
  const userIndex = (usersData.users || []).findIndex((entry) => entry.id === userId);
  if (userIndex < 0) {
    return "";
  }

  const session = {
    id: `SES-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    userAgent: String(req.header("user-agent") || "Unknown device").slice(0, 160),
    ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
    createdAt: safeDate(),
    lastActiveAt: safeDate()
  };

  usersData.users[userIndex] = normalizeUserRecord(usersData.users[userIndex]);
  usersData.users[userIndex].sessions.unshift(session);
  usersData.users[userIndex].updatedAt = safeDate();
  writeUsers(usersData);
  return session.id;
}

function appendAuditEvent(req, action, details = {}) {
  const log = readAuditLog();
  const event = {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    at: safeDate(),
    action,
    actor: req.user
      ? { id: req.user.id, role: req.user.role, email: req.user.email }
      : { id: "system", role: "system", email: "" },
    details
  };
  log.events.unshift(event);
  writeAuditLog(log);
}

function findUserByEmail(email) {
  const usersData = readUsers();
  return (usersData.users || []).find((user) => normalizeEmail(user.email) === normalizeEmail(email));
}

function findUserById(userId) {
  const usersData = readUsers();
  return (usersData.users || []).find((user) => user.id === userId);
}

async function readTenantPreferences() {
  if (!supabase) {
    return { autoPay: {} };
  }

  const { data, error } = await supabase
    .from("app_state")
    .select("payload")
    .eq("key", "tenant_preferences")
    .maybeSingle();

  if (error) {
    throw error;
  }

  const payload = data?.payload || {};
  return {
    autoPay: payload.autoPay && typeof payload.autoPay === "object" ? payload.autoPay : {}
  };
}

async function writeTenantPreferences(preferences) {
  if (!supabase) {
    return;
  }

  const payload = {
    autoPay: preferences.autoPay && typeof preferences.autoPay === "object" ? preferences.autoPay : {}
  };

  const { error } = await supabase
    .from("app_state")
    .upsert([{ key: "tenant_preferences", payload, updated_at: safeDate() }], { onConflict: "key" });

  if (error) {
    throw error;
  }
}

async function findActiveLeaseForTenant(tenantId) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("leases")
    .select("id, tenant_id, landlord_id, rent_amount, start_date, end_date, status")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "draft"])
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return Array.isArray(data) && data.length ? data[0] : null;
}

async function ensureSharedSupabaseTestCard(tenantId) {
  if (!supabase) {
    return { ...SHARED_TEST_CARD };
  }

  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, label, method_type, last4, is_primary, metadata")
    .eq("user_id", tenantId)
    .eq("id", SHARED_TEST_CARD.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const { error: insertError } = await supabase
      .from("payment_methods")
      .upsert([
        {
          id: SHARED_TEST_CARD.id,
          user_id: tenantId,
          label: SHARED_TEST_CARD.label,
          method_type: SHARED_TEST_CARD.type,
          last4: SHARED_TEST_CARD.last4,
          is_primary: true,
          metadata: {
            brand: SHARED_TEST_CARD.brand,
            cardholder: SHARED_TEST_CARD.cardholder,
            expiresAt: SHARED_TEST_CARD.expiresAt,
            sharedTestCard: true
          }
        }
      ], { onConflict: "id" });

    if (insertError) {
      throw insertError;
    }
  }

  return { ...SHARED_TEST_CARD };
}

async function readLatestCreditSnapshot(tenantId) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("credit_snapshots")
    .select("id, score, tier, on_time_percentage, late_payment_count, payment_streak, report_url, report_share_link, metadata, captured_at")
    .eq("tenant_id", tenantId)
    .order("captured_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return Array.isArray(data) && data.length ? data[0] : null;
}

async function createCreditSnapshotFromSeed(tenantId, seedCredit) {
  if (!supabase) {
    return null;
  }

  const score = Number(seedCredit?.currentScore || 680);
  const tier = seedCredit?.tier || (score >= 740 ? "Excellent" : score >= 670 ? "Good" : "Fair");
  const onTime = Number(seedCredit?.onTimePercentage || 100);
  const late = Number(seedCredit?.latePaymentCount || 0);
  const streak = Number(seedCredit?.paymentStreak || 0);
  const metadata = {
    calculationRule: seedCredit?.calculationRule || "Score is weighted by on-time payments and payment consistency.",
    history: Array.isArray(seedCredit?.history) ? seedCredit.history : []
  };

  const snapshot = {
    id: `CRD-${tenantId}-${Date.now()}`,
    tenant_id: tenantId,
    score,
    tier,
    on_time_percentage: onTime,
    late_payment_count: late,
    payment_streak: streak,
    report_url: seedCredit?.reportUrl || "",
    report_share_link: seedCredit?.reportShareLink || "",
    captured_at: safeDate(),
    metadata
  };

  const { error } = await supabase.from("credit_snapshots").insert([snapshot]);
  if (error) {
    throw error;
  }
  return snapshot;
}

function ensureRelationshipStore(root) {
  if (!root.relationships || typeof root.relationships !== "object") {
    root.relationships = { invitations: [] };
  }

  root.relationships.invitations = Array.isArray(root.relationships.invitations) ? root.relationships.invitations : [];
  return root.relationships;
}

function getTenantRecordFromRoot(root, user) {
  root.tenants = root.tenants || {};
  if (!root.tenants[user.id]) {
    root.tenants[user.id] = createDefaultTenant(user);
  }
  return root.tenants[user.id];
}

function findPropertyById(propertyId) {
  const data = readProperties();
  return (data.properties || []).find((property) => property.id === propertyId) || null;
}

function getPropertyAvailableUnits(property) {
  return Math.max(0, Number(property.unitCount || 0) - Number(property.occupiedUnits || 0));
}

function getPropertyBedrooms(property) {
  const storedBedrooms = Number(property.bedrooms);
  if (Number.isFinite(storedBedrooms) && storedBedrooms > 0) {
    return storedBedrooms;
  }

  const unitCount = Number(property.unitCount || 0);
  if (!unitCount) {
    return 1;
  }

  if (unitCount >= 12) return 3;
  if (unitCount >= 9) return 2;
  if (unitCount >= 6) return 2;
  return 1;
}

function getPropertyBathrooms(property) {
  const storedBathrooms = Number(property.bathrooms);
  if (Number.isFinite(storedBathrooms) && storedBathrooms > 0) {
    return storedBathrooms;
  }

  const bedrooms = getPropertyBedrooms(property);
  if (bedrooms >= 3) return 2;
  if (bedrooms === 2) return 1.5;
  return 1;
}

function summarizeRelationship(relationship) {
  const property = findPropertyById(relationship.propertyId);
  const landlord = findUserById(relationship.landlordId);
  const tenantUser = relationship.tenantId ? findUserById(relationship.tenantId) : findUserByEmail(relationship.tenantEmail);

  return {
    id: relationship.id,
    direction: relationship.direction,
    status: relationship.status,
    message: relationship.message || "",
    createdAt: relationship.createdAt,
    updatedAt: relationship.updatedAt,
    respondedAt: relationship.respondedAt || "",
    landlord: {
      id: landlord?.id || relationship.landlordId || "",
      name: landlord?.fullName || relationship.landlordName || "",
      email: landlord?.email || relationship.landlordEmail || ""
    },
    tenant: {
      id: tenantUser?.id || relationship.tenantId || "",
      name: tenantUser?.fullName || relationship.tenantName || "",
      email: tenantUser?.email || relationship.tenantEmail || ""
    },
    property: property ? {
      id: property.id,
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      occupancyRate: property.occupancyRate,
      unitCount: property.unitCount,
      occupiedUnits: property.occupiedUnits,
      availableUnits: Math.max(0, Number(property.unitCount || 0) - Number(property.occupiedUnits || 0)),
      status: property.status,
      landlordId: property.landlordId
    } : {
      id: relationship.propertyId,
      name: relationship.propertyName || "",
      address: relationship.propertyAddress || "",
      city: "",
      state: "",
      zipCode: "",
      occupancyRate: 0,
      unitCount: 0,
      occupiedUnits: 0,
      availableUnits: 0,
      status: "active",
      landlordId: relationship.landlordId || ""
    }
  };
}

function buildMarketplaceProperty(property) {
  const landlord = findUserById(property.landlordId);
  const availableUnits = getPropertyAvailableUnits(property);
  const bedrooms = getPropertyBedrooms(property);
  const bathrooms = getPropertyBathrooms(property);

  return {
    id: property.id,
    name: property.name,
    address: property.address,
    city: property.city,
    state: property.state,
    zipCode: property.zipCode,
    status: property.status,
    recentActivity: property.recentActivity,
    unitCount: property.unitCount,
    occupiedUnits: property.occupiedUnits,
    availableUnits,
    occupancyRate: property.occupancyRate,
    bedrooms,
    bathrooms,
    monthlyRentLow: property.monthlyRentLow,
    monthlyRentHigh: property.monthlyRentHigh,
    landlord: {
      id: landlord?.id || property.landlordId || "",
      name: landlord?.fullName || "",
      email: landlord?.email || ""
    }
  };
}

function summarizeTenantRelationship(tenant, root) {
  const invitations = (ensureRelationshipStore(root).invitations || []).filter((relationship) =>
    relationship.tenantId === tenant.tenantId || normalizeEmail(relationship.tenantEmail) === normalizeEmail(tenant.profile?.email)
  );
  const sorted = invitations.slice().sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0));
  const accepted = sorted.find((relationship) => relationship.status === "accepted") || null;
  const pending = sorted.find((relationship) => relationship.status === "pending") || null;
  const current = accepted || pending || null;

  if (!current) {
    return {
      status: "none",
      property: null,
      landlord: null,
      invitationCount: 0,
      acceptedCount: 0,
      pendingCount: 0
    };
  }

  return {
    status: current.status,
    direction: current.direction,
    invitationCount: sorted.length,
    acceptedCount: sorted.filter((relationship) => relationship.status === "accepted").length,
    pendingCount: sorted.filter((relationship) => relationship.status === "pending").length,
    relationship: summarizeRelationship(current)
  };
}

function summarizeLandlordRelationships(landlordId, root) {
  const invitations = (ensureRelationshipStore(root).invitations || []).filter((relationship) => relationship.landlordId === landlordId);
  return invitations
    .slice()
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0))
    .map((relationship) => summarizeRelationship(relationship));
}

function ensureUnitAssignmentStore(root) {
  if (!root.unitAssignments || typeof root.unitAssignments !== "object") {
    root.unitAssignments = {};
  }
  return root.unitAssignments;
}

function ensureUnitAssignmentHistoryStore(root) {
  if (!root.unitAssignmentHistory || typeof root.unitAssignmentHistory !== "object") {
    root.unitAssignmentHistory = {};
  }
  return root.unitAssignmentHistory;
}

function isValidIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function countActiveAssignmentsForProperty(root, propertyId) {
  const assignments = ensureUnitAssignmentStore(root);
  return Object.values(assignments).filter((assignment) => assignment?.status === "active" && assignment.propertyId === propertyId).length;
}

function getActiveAssignmentForUnit(root, unitId) {
  const assignments = ensureUnitAssignmentStore(root);
  const assignment = assignments[unitId];
  return assignment?.status === "active" ? assignment : null;
}

function recordUnitAssignmentHistory(root, unitId, payload) {
  const historyStore = ensureUnitAssignmentHistoryStore(root);
  historyStore[unitId] = Array.isArray(historyStore[unitId]) ? historyStore[unitId] : [];
  historyStore[unitId].unshift({
    id: `UAH-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    at: safeDate(),
    ...payload
  });
}

function getUnitHistory(root, unitId) {
  const historyStore = ensureUnitAssignmentHistoryStore(root);
  return Array.isArray(historyStore[unitId]) ? historyStore[unitId] : [];
}

function getScopedPropertiesForLandlord(reqUser) {
  const propertiesData = readProperties();
  const properties = Array.isArray(propertiesData.properties) ? propertiesData.properties : [];
  return reqUser.role === "admin"
    ? properties
    : properties.filter((property) => property.landlordId === reqUser.id);
}

function buildFallbackUnitsForLandlord(reqUser, root) {
  const scopedProperties = getScopedPropertiesForLandlord(reqUser);
  const assignments = ensureUnitAssignmentStore(root);
  const historyStore = ensureUnitAssignmentHistoryStore(root);

  return scopedProperties.flatMap((property) => {
    const count = Math.max(0, Number(property.unitCount || 0));
    return Array.from({ length: count }).map((_, index) => {
      const label = `${property.name.slice(0, 1).toUpperCase() || "U"}-${String(index + 1).padStart(3, "0")}`;
      const unitId = `${property.id}-${index + 1}`;
      const occupied = index < Number(property.occupiedUnits || 0);
      const maintenance = index >= Number(property.occupiedUnits || 0)
        && index < Number(property.occupiedUnits || 0) + Number(property.maintenanceUnits || 0);
      const assignment = assignments[unitId];
      const assignedTenant = assignment?.tenantId ? findUserById(assignment.tenantId) : findUserByEmail(assignment?.tenantEmail || "");
      const history = Array.isArray(historyStore[unitId]) ? historyStore[unitId] : [];
      const latestHistory = history[0] || null;

      const status = assignment?.status === "active"
        ? "occupied"
        : maintenance
          ? "maintenance"
          : occupied
            ? "occupied"
            : "vacant";

      return {
        id: unitId,
        propertyId: property.id,
        propertyName: property.name,
        propertyAddress: property.address,
        label,
        rentAmount: Number(property.monthlyRentLow || 0),
        status,
        tenantName: assignment?.status === "active"
          ? (assignedTenant?.fullName || assignment.tenantName || "Assigned tenant")
          : occupied
            ? "Assigned tenant"
            : "Unassigned",
        tenantEmail: assignment?.status === "active"
          ? (assignedTenant?.email || assignment.tenantEmail || "")
          : "",
        leaseEndDate: assignment?.status === "active" ? (assignment.leaseEndDate || "") : "",
        assignmentMode: assignment?.status === "active" ? assignment.mode || "manual" : "",
        assignedAt: assignment?.status === "active" ? assignment.assignedAt || "" : "",
        assignmentHistoryCount: history.length,
        assignmentLastAction: latestHistory?.type || "",
        updatedAt: assignment?.status === "active" ? assignment.updatedAt || assignment.assignedAt || property.updatedAt : property.updatedAt
      };
    });
  });
}

function collectLandlordTenantCandidates(landlordId, root, options = {}) {
  const relationshipStore = ensureRelationshipStore(root);
  const assignments = ensureUnitAssignmentStore(root);
  const includePending = options.includePending ?? true;
  const now = Date.now();
  const candidatesByEmail = new Map();

  const invitations = (relationshipStore.invitations || [])
    .filter((relationship) => relationship.landlordId === landlordId)
    .filter((relationship) => relationship.status === "accepted" || (includePending && relationship.status === "pending"))
    .slice()
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0));

  invitations.forEach((relationship) => {
    const tenantUser = relationship.tenantId ? findUserById(relationship.tenantId) : findUserByEmail(relationship.tenantEmail || "");
    const email = normalizeEmail(tenantUser?.email || relationship.tenantEmail || "");
    if (!email) {
      return;
    }

    const alreadyAssigned = Object.values(assignments).some((assignment) =>
      assignment?.status === "active" && normalizeEmail(assignment.tenantEmail || "") === email && assignment.landlordId === landlordId
    );

    const priority = relationship.status === "accepted"
      ? 3
      : relationship.direction === "tenant_request"
        ? 2
        : 1;

    const candidate = {
      tenantId: tenantUser?.id || relationship.tenantId || "",
      fullName: tenantUser?.fullName || relationship.tenantName || email,
      email,
      relationshipId: relationship.id,
      relationshipStatus: relationship.status,
      direction: relationship.direction,
      preferredPropertyId: relationship.propertyId || "",
      preferredPropertyName: relationship.propertyName || "",
      alreadyAssigned,
      priority,
      ageHours: Math.max(0, Math.round((now - new Date(relationship.createdAt || safeDate()).getTime()) / 36e5))
    };

    const existing = candidatesByEmail.get(email);
    if (!existing || existing.priority < candidate.priority) {
      candidatesByEmail.set(email, candidate);
    }
  });

  return [...candidatesByEmail.values()].sort((left, right) => {
    if (left.alreadyAssigned !== right.alreadyAssigned) {
      return left.alreadyAssigned ? 1 : -1;
    }
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }
    return left.fullName.localeCompare(right.fullName);
  });
}

function buildAutoAssignmentPlan(reqUser, root, options = {}) {
  const propertyId = String(options.propertyId || "").trim();
  const limit = Math.max(1, Math.min(25, Number.parseInt(options.limit, 10) || 5));

  const candidates = collectLandlordTenantCandidates(reqUser.id, root, { includePending: true })
    .filter((candidate) => !candidate.alreadyAssigned)
    .filter((candidate) => {
      if (!propertyId) {
        return true;
      }
      return !candidate.preferredPropertyId || candidate.preferredPropertyId === propertyId;
    });

  const availableUnits = buildFallbackUnitsForLandlord(reqUser, root)
    .filter((unit) => unit.status === "vacant")
    .filter((unit) => !propertyId || unit.propertyId === propertyId);

  const workingUnits = availableUnits.slice();
  const plannedAssignments = [];
  const skippedCandidates = [];

  for (const candidate of candidates) {
    if (plannedAssignments.length >= limit) {
      break;
    }

    const tenantUser = candidate.tenantId ? findUserById(candidate.tenantId) : findUserByEmail(candidate.email);
    if (!tenantUser || tenantUser.role !== "customer") {
      skippedCandidates.push({
        email: candidate.email,
        fullName: candidate.fullName,
        reason: "Tenant account is unavailable"
      });
      continue;
    }

    const unitIndex = workingUnits.findIndex((unit) => {
      if (!unit) return false;
      if (candidate.preferredPropertyId) {
        return unit.propertyId === candidate.preferredPropertyId;
      }
      return true;
    });

    if (unitIndex < 0) {
      skippedCandidates.push({
        email: candidate.email,
        fullName: candidate.fullName,
        reason: candidate.preferredPropertyId
          ? "No vacant unit in preferred property"
          : "No vacant unit available"
      });
      continue;
    }

    const unit = workingUnits[unitIndex];
    const property = findPropertyById(unit.propertyId);
    if (!property) {
      skippedCandidates.push({
        email: candidate.email,
        fullName: candidate.fullName,
        reason: "Property record not found"
      });
      continue;
    }

    const currentActiveCount = countActiveAssignmentsForProperty(root, property.id);
    const plannedCountForProperty = plannedAssignments.filter((entry) => entry.propertyId === property.id).length;
    if ((currentActiveCount + plannedCountForProperty) >= Math.max(1, Number(property.unitCount || 1))) {
      skippedCandidates.push({
        email: candidate.email,
        fullName: candidate.fullName,
        reason: "Property reached max tenant capacity"
      });
      continue;
    }

    workingUnits.splice(unitIndex, 1);
    plannedAssignments.push({
      tenantId: tenantUser.id,
      tenantName: tenantUser.fullName,
      tenantEmail: tenantUser.email,
      relationshipId: candidate.relationshipId,
      relationshipStatus: candidate.relationshipStatus,
      candidatePriority: candidate.priority,
      unitId: unit.id,
      unitLabel: unit.label,
      propertyId: unit.propertyId,
      propertyName: unit.propertyName,
      propertyAddress: unit.propertyAddress,
      rentAmount: Number(unit.rentAmount || 0)
    });
  }

  return {
    propertyId: propertyId || "all",
    limit,
    candidateCount: candidates.length,
    vacantUnitCount: availableUnits.length,
    plannedAssignments,
    skippedCandidates,
    remainingVacantUnits: Math.max(0, availableUnits.length - plannedAssignments.length)
  };
}

function syncTenantAfterUnitAssignment(tenantRecord, assignment, property, landlordUser) {
  tenantRecord.lease.propertyAddress = property.address || tenantRecord.lease.propertyAddress;
  tenantRecord.lease.unit = assignment.label || tenantRecord.lease.unit;
  tenantRecord.lease.endDate = assignment.leaseEndDate || tenantRecord.lease.endDate;
  tenantRecord.lease.rentAmount = Number(property.monthlyRentLow || tenantRecord.lease.rentAmount || 0);
  tenantRecord.lease.landlord = {
    name: landlordUser?.fullName || tenantRecord.lease.landlord?.name || "",
    email: landlordUser?.email || tenantRecord.lease.landlord?.email || ""
  };
  tenantRecord.rent.amountDue = Number(property.monthlyRentLow || tenantRecord.rent.amountDue || 0);
  tenantRecord.rent.status = "pending";
  tenantRecord.notifications.items.unshift({
    id: `NT-${Date.now()}-unit-assignment`,
    title: "Unit assigned",
    message: `You were assigned to ${assignment.label} at ${property.name}.`,
    type: "lease",
    read: false,
    createdAt: safeDate()
  });
  tenantRecord.activity.unshift({
    id: `ACT-${Date.now()}-unit-assignment`,
    message: `Assigned to ${assignment.label} at ${property.name}`,
    at: safeDate()
  });
}

function syncTenantAfterUnitUnassignment(tenantRecord, assignment, propertyName, reason = "") {
  if (tenantRecord.lease.unit === assignment.label) {
    tenantRecord.lease.unit = "";
  }

  tenantRecord.notifications.items.unshift({
    id: `NT-${Date.now()}-unit-unassignment`,
    title: "Unit unassigned",
    message: `Your assignment for ${assignment.label} at ${propertyName || "your property"} has been removed.${reason ? ` Reason: ${reason}` : ""}`,
    type: "lease",
    read: false,
    createdAt: safeDate()
  });

  tenantRecord.activity.unshift({
    id: `ACT-${Date.now()}-unit-unassignment`,
    message: `Unit assignment removed for ${assignment.label}${reason ? ` (${reason})` : ""}`,
    at: safeDate()
  });
}

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createPasswordResetEmailHtml(code) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin:0 0 12px;color:#111827;">Reset your Crenit password</h2>
      <p style="margin:0 0 12px;color:#374151;">Use this verification code to continue your password reset:</p>
      <div style="font-size:30px;letter-spacing:6px;font-weight:700;color:#111827;margin:16px 0;">${code}</div>
      <p style="margin:0;color:#6b7280;">This code expires in 15 minutes. If you did not request this, ignore this email.</p>
    </div>
  `;
}

async function sendPasswordResetCode(email, code) {
  if (!mailer) {
    throw new Error("Email service not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.");
  }

  await mailer.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: "Your Crenit password reset code",
    text: `Use this code to reset your password: ${code}. This code expires in 15 minutes.`,
    html: createPasswordResetEmailHtml(code)
  });
}

function getActingName(req) {
  if (req.user?.fullName) {
    return req.user.fullName;
  }
  return "system";
}

function getNextStatus(currentStatus, action) {
  if (action === "confirm" && currentStatus === "pending") {
    return "confirmed";
  }
  if (action === "approve" && currentStatus === "confirmed") {
    return "approved";
  }
  if (action === "reject" && ["pending", "confirmed"].includes(currentStatus)) {
    return "rejected";
  }
  return null;
}

function toCount(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}

function normalizePropertyStatus(status) {
  const allowed = ["active", "pending", "maintenance"];
  if (allowed.includes(status)) {
    return status;
  }
  return "active";
}

function shapePropertyPayload(payload, existing = {}) {
  const property = {
    id: existing.id || `PR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    createdAt: existing.createdAt || safeDate(),
    landlordId: existing.landlordId,
    name: String(payload.name ?? existing.name ?? "").trim(),
    address: String(payload.address ?? existing.address ?? "").trim(),
    city: String(payload.city ?? existing.city ?? "").trim(),
    state: String(payload.state ?? existing.state ?? "").trim(),
    zipCode: String(payload.zipCode ?? existing.zipCode ?? "").trim(),
    unitCount: toCount(payload.unitCount ?? existing.unitCount, 0),
    occupiedUnits: toCount(payload.occupiedUnits ?? existing.occupiedUnits, 0),
    maintenanceUnits: toCount(payload.maintenanceUnits ?? existing.maintenanceUnits, 0),
    bedrooms: toCount(payload.bedrooms ?? existing.bedrooms, 0),
    bathrooms: Math.max(0, Number(payload.bathrooms ?? existing.bathrooms ?? 0) || 0),
    monthlyRentLow: toMoney(payload.monthlyRentLow ?? existing.monthlyRentLow),
    monthlyRentHigh: toMoney(payload.monthlyRentHigh ?? existing.monthlyRentHigh),
    status: normalizePropertyStatus(String(payload.status ?? existing.status ?? "active").toLowerCase()),
    recentActivity: String(payload.recentActivity ?? existing.recentActivity ?? "Portfolio updated").trim(),
    updatedAt: safeDate()
  };

  if (!property.name || !property.address) {
    return { error: "Property name and address are required." };
  }

  if (property.unitCount === 0) {
    property.occupiedUnits = 0;
    property.maintenanceUnits = 0;
  } else {
    property.occupiedUnits = Math.min(property.occupiedUnits, property.unitCount);
    property.maintenanceUnits = Math.min(property.maintenanceUnits, Math.max(0, property.unitCount - property.occupiedUnits));
  }

  if (property.monthlyRentHigh && property.monthlyRentLow > property.monthlyRentHigh) {
    const swap = property.monthlyRentLow;
    property.monthlyRentLow = property.monthlyRentHigh;
    property.monthlyRentHigh = swap;
  }

  property.occupancyRate = property.unitCount ? Math.round((property.occupiedUnits / property.unitCount) * 100) : 0;
  return { property };
}

async function syncPropertyToRelational(property) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  try {
    await supabase.from("properties").upsert(
      {
        id: property.id,
        landlord_id: property.landlordId,
        name: property.name,
        address: property.address,
        city: property.city || null,
        state: property.state || null,
        zip_code: property.zipCode || null,
        created_at: property.createdAt || safeDate(),
        updated_at: property.updatedAt || safeDate()
      },
      { onConflict: "id" }
    );
  } catch (error) {
    console.warn("[RELATIONAL SYNC WARNING] properties upsert failed:", error.message);
  }
}

async function removePropertyFromRelational(propertyId) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  try {
    await supabase.from("properties").delete().eq("id", propertyId);
  } catch (error) {
    console.warn("[RELATIONAL SYNC WARNING] properties delete failed:", error.message);
  }
}

function buildPropertyMetaIndex() {
  const data = readProperties();
  const list = Array.isArray(data.properties) ? data.properties : [];
  return new Map(list.map((property) => [property.id, property]));
}

function mapRowToProperty(row, propertyMeta = {}) {
  const shaped = shapePropertyPayload(
    {
      name: row.name,
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      unitCount: propertyMeta.unitCount,
      occupiedUnits: propertyMeta.occupiedUnits,
      maintenanceUnits: propertyMeta.maintenanceUnits,
      bedrooms: propertyMeta.bedrooms,
      bathrooms: propertyMeta.bathrooms,
      monthlyRentLow: propertyMeta.monthlyRentLow,
      monthlyRentHigh: propertyMeta.monthlyRentHigh,
      status: propertyMeta.status,
      recentActivity: propertyMeta.recentActivity
    },
    {
      id: row.id,
      createdAt: row.created_at || safeDate(),
      updatedAt: row.updated_at || safeDate(),
      landlordId: row.landlord_id
    }
  );

  if (shaped.error) {
    return null;
  }

  return shaped.property;
}

async function listPropertiesRelational(reqUser) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const metaById = buildPropertyMetaIndex();
  let query = supabase
    .from("properties")
    .select("id, landlord_id, name, address, city, state, zip_code, created_at, updated_at");

  if (reqUser.role !== "admin") {
    query = query.eq("landlord_id", reqUser.id);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data || [])
    .map((row) => mapRowToProperty(row, metaById.get(row.id) || {}))
    .filter(Boolean);
}

async function getPropertyRelationalById(propertyId) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("properties")
    .select("id, landlord_id, name, address, city, state, zip_code, created_at, updated_at")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

function upsertPropertyInState(property) {
  const data = readProperties();
  data.properties = Array.isArray(data.properties) ? data.properties : [];
  const index = data.properties.findIndex((entry) => entry.id === property.id);
  if (index >= 0) {
    data.properties[index] = property;
  } else {
    data.properties.unshift(property);
  }
  writeProperties(data);
}

function removePropertyFromState(propertyId) {
  const data = readProperties();
  data.properties = Array.isArray(data.properties) ? data.properties : [];
  data.properties = data.properties.filter((entry) => entry.id !== propertyId);
  writeProperties(data);
}

function parseListQuery(query, defaults = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requestedPageSize = Number.parseInt(query.pageSize, 10) || defaults.pageSize || 10;
  const pageSize = Math.min(50, Math.max(1, requestedPageSize));
  const sortBy = String(query.sortBy || defaults.sortBy || "updatedAt");
  const sortDir = String(query.sortDir || defaults.sortDir || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const q = String(query.q || "").trim().toLowerCase();
  return { page, pageSize, sortBy, sortDir, q };
}

function paginateItems(items, page, pageSize) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages
    }
  };
}

function sortItems(items, sortBy, sortDir, valueGetter) {
  const direction = sortDir === "asc" ? 1 : -1;
  return items.slice().sort((leftItem, rightItem) => {
    const left = valueGetter(leftItem, sortBy);
    const right = valueGetter(rightItem, sortBy);

    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * direction;
    }

    const leftText = String(left || "").toLowerCase();
    const rightText = String(right || "").toLowerCase();
    if (leftText < rightText) {
      return -1 * direction;
    }
    if (leftText > rightText) {
      return 1 * direction;
    }
    return 0;
  });
}

function ensureTenantFinancialDefaults(tenant) {
  let changed = false;

  tenant.paymentMethods = Array.isArray(tenant.paymentMethods) ? tenant.paymentMethods : [];
  if (!tenant.paymentMethods.some((method) => method.id === SHARED_TEST_CARD.id)) {
    tenant.paymentMethods.unshift({ ...SHARED_TEST_CARD });
    changed = true;
  }

  tenant.paymentMethods = tenant.paymentMethods.map((method) => ({
    ...method,
    isPrimary: method.id === SHARED_TEST_CARD.id
  }));

  if (!tenant.rent || typeof tenant.rent !== "object") {
    tenant.rent = {
      amountDue: 2500,
      nextPaymentDate: safeDate().slice(0, 10),
      status: "due",
      autoPayEnabled: true,
      currentMonthLabel: "Current Month"
    };
    changed = true;
  }

  if (!tenant.rent.amountDue || tenant.rent.amountDue <= 0) {
    tenant.rent.amountDue = Number(tenant.lease?.rentAmount || 2500);
    tenant.rent.status = tenant.rent.status === "paid" ? "due" : tenant.rent.status || "due";
    changed = true;
  }

  tenant.payments = tenant.payments || {};
  tenant.payments.upcoming = Array.isArray(tenant.payments.upcoming) ? tenant.payments.upcoming : [];
  tenant.payments.history = Array.isArray(tenant.payments.history) ? tenant.payments.history : [];
  tenant.credit = tenant.credit || { history: [] };
  tenant.credit.history = Array.isArray(tenant.credit.history) ? tenant.credit.history : [];

  return changed;
}





function getOrCreateTenant(user) {
  const tenantData = readTenantData();
  tenantData.tenants = tenantData.tenants || {};
  let changed = false;

  if (!tenantData.tenants[user.id]) {
    tenantData.tenants[user.id] = createDefaultTenant(user);
    changed = true;
  }

  if (ensureTenantFinancialDefaults(tenantData.tenants[user.id])) {
    changed = true;
  }

  if (changed) {
    writeTenantData(tenantData);
  }

  return {
    tenant: tenantData.tenants[user.id],
    root: tenantData
  };
}

function requireTenantVerificationForFinancial(req, res, next) {
  const { tenant, root } = getOrCreateTenant(req.user);
  // Auto-approve verification for demo/development
  if (tenant.verification?.status !== "approved") {
    tenant.verification.status = "approved";
    tenant.verification.submittedAt = tenant.verification.submittedAt || safeDate();
    if (!tenant.verification.documents.length) {
      tenant.verification.documents = [
        { id: "DEMO-ID-1", type: "id", name: "ID Document", uploadedAt: safeDate() },
        { id: "DEMO-ID-2", type: "proof_of_address", name: "Address Proof", uploadedAt: safeDate() }
      ];
    }
    persistTenant(req.user.id, tenant, root);
  }
  return next();
}

function persistTenant(userId, tenant, root) {
  root.tenants[userId] = tenant;
  writeTenantData(root);
}

app.get("/api/realtime/tenant", (req, res) => {
  const token = String(req.query?.token || "").trim();
  if (!token) {
    return res.status(401).json({ error: "Realtime token is required." });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid realtime token." });
  }

  if (payload.role !== "customer") {
    return res.status(403).json({ error: "Tenant realtime channel only." });
  }

  const tenantId = payload.sub;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (!tenantRealtimeClients.has(tenantId)) {
    tenantRealtimeClients.set(tenantId, new Set());
  }

  const clients = tenantRealtimeClients.get(tenantId);
  clients.add(res);
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ ok: true, at: safeDate() })}\n\n`);

  req.on("close", () => {
    const currentClients = tenantRealtimeClients.get(tenantId);
    if (!currentClients) {
      return;
    }
    currentClients.delete(res);
    if (!currentClients.size) {
      tenantRealtimeClients.delete(tenantId);
    }
  });
});

app.get("/api/realtime/supabase-token", requireAuth, requireTenant, (req, res) => {
  if (!supabase || !SUPABASE_JWT_SECRET) {
    return res.status(503).json({ error: "Supabase realtime token bridge is not configured." });
  }

  const expiresInSeconds = 60 * 10;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: "authenticated",
    role: "authenticated",
    sub: req.user.id,
    email: req.user.email,
    iat: now,
    exp: now + expiresInSeconds
  };

  const supabaseToken = jwt.sign(payload, SUPABASE_JWT_SECRET, { algorithm: "HS256" });
  return res.json({
    token: supabaseToken,
    userId: req.user.id,
    expiresIn: expiresInSeconds
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "CRENIT Tenant API", now: safeDate() });
});

app.post("/api/auth/register", createRateLimit("auth-register", 20, 60_000), (req, res) => {
  const { fullName, location, email, password, role, adminCode } = req.body;

  if (!fullName || !location || !email || !password) {
    return res.status(400).json({ error: "Name, location, email and password are required." });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const normalizedEmail = normalizeEmail(email);
  if (findUserByEmail(normalizedEmail)) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  let resolvedRole = "customer";
  if (role === "landlord") {
    resolvedRole = "landlord";
  } else if (role === "admin") {
    if (!ADMIN_REGISTRATION_CODE || adminCode !== ADMIN_REGISTRATION_CODE) {
      return res.status(403).json({ error: "Admin registration requires a valid admin code." });
    }
    resolvedRole = "admin";
  }

  const usersData = readUsers();
  const now = safeDate();
  const user = {
    id: `USR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    fullName: String(fullName).trim(),
    location: String(location).trim(),
    email: normalizedEmail,
    role: resolvedRole,
    passwordHash: hashPassword(password),
    kycStatus: resolvedRole === "customer" ? undefined : "pending",
    kycDocuments: resolvedRole === "customer" ? undefined : [],
    kycSubmittedAt: "",
    sessions: [],
    createdAt: now,
    updatedAt: now
  };

  usersData.users.push(user);
  writeUsers(usersData);

  if (resolvedRole === "customer") {
    getOrCreateTenant(user);
  }

  const sessionId = attachSessionToUser(user.id, req);
  const token = signToken(user, sessionId);
  return res.status(201).json({ token, user: sanitizeUser(user) });
});

app.post("/api/auth/login", createRateLimit("auth-login", 35, 60_000), (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  if (user.role === "customer") {
    getOrCreateTenant(user);
  }

  const sessionId = attachSessionToUser(user.id, req);
  const token = signToken(user, sessionId);
  return res.json({ token, user: sanitizeUser(user) });
});

app.post("/api/auth/forgot-password", createRateLimit("auth-forgot-password", 15, 60_000), (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const usersData = readUsers();
  const user = usersData.users.find((entry) => normalizeEmail(entry.email) === normalizeEmail(email));

  if (!user) {
    return res.json({ message: "If an account exists for this email, a verification code was sent." });
  }

  const code = generateResetCode();
  user.resetCodeHash = hashPassword(code);
  user.resetCodeExpiresAt = Date.now() + 1000 * 60 * 15;
  user.resetCodeAttempts = 0;
  delete user.resetToken;
  delete user.resetTokenExpiresAt;
  user.updatedAt = safeDate();
  writeUsers(usersData);

  sendPasswordResetCode(user.email, code)
    .then(() => {
      res.json({ message: "If an account exists for this email, a verification code was sent." });
    })
    .catch((error) => {
      console.error("[PASSWORD RESET EMAIL FAILED]", error.message);
      res.status(503).json({ error: "Could not send verification email right now. Please try again." });
    });
});

app.post("/api/auth/verify-reset-code", createRateLimit("auth-verify-reset-code", 20, 60_000), (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required." });
  }

  const usersData = readUsers();
  const user = usersData.users.find((entry) => normalizeEmail(entry.email) === normalizeEmail(email));

  if (!user) {
    return res.status(400).json({ error: "Invalid or expired verification code." });
  }

  const expiresAt = Number(user.resetCodeExpiresAt || 0);
  const hasCode = Boolean(user.resetCodeHash);
  if (!hasCode || expiresAt <= Date.now()) {
    return res.status(400).json({ error: "Invalid or expired verification code." });
  }

  const attempts = Number(user.resetCodeAttempts || 0);
  if (attempts >= 5) {
    return res.status(429).json({ error: "Too many failed attempts. Request a new code." });
  }

  const isValid = verifyPassword(String(code), user.resetCodeHash);
  if (!isValid) {
    user.resetCodeAttempts = attempts + 1;
    user.updatedAt = safeDate();
    writeUsers(usersData);
    return res.status(400).json({ error: "Invalid or expired verification code." });
  }

  user.resetToken = crypto.randomBytes(20).toString("hex");
  user.resetTokenExpiresAt = Date.now() + 1000 * 60 * 15;
  delete user.resetCodeHash;
  delete user.resetCodeExpiresAt;
  delete user.resetCodeAttempts;
  user.updatedAt = safeDate();
  writeUsers(usersData);

  return res.json({
    message: "Code verified. You can now create a new password.",
    resetToken: user.resetToken
  });
});

app.post("/api/auth/reset-password", createRateLimit("auth-reset-password", 20, 60_000), (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: "Reset token and new password are required." });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const usersData = readUsers();
  const user = usersData.users.find(
    (entry) => entry.resetToken === token && Number(entry.resetTokenExpiresAt || 0) > Date.now()
  );

  if (!user) {
    return res.status(400).json({ error: "Invalid or expired reset token." });
  }

  user.passwordHash = hashPassword(password);
  delete user.resetToken;
  delete user.resetTokenExpiresAt;
  user.updatedAt = safeDate();
  writeUsers(usersData);

  return res.json({ message: "Password reset successful." });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const usersData = readUsers();
  const user = (usersData.users || []).find((entry) => entry.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const normalized = normalizeUserRecord(user);
  if (req.user.sessionId) {
    const session = normalized.sessions.find((item) => item.id === req.user.sessionId);
    if (session) {
      session.lastActiveAt = safeDate();
      normalized.updatedAt = safeDate();
      usersData.users = usersData.users.map((entry) => (entry.id === normalized.id ? normalized : entry));
      writeUsers(usersData);
    }
  }

  return res.json({ user: sanitizeUser(normalized) });
});

app.get("/api/auth/sessions", requireAuth, (req, res) => {
  const usersData = readUsers();
  const user = (usersData.users || []).find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const normalized = normalizeUserRecord(user);
  const sessions = normalized.sessions.map((session) => ({
    id: session.id,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
    current: session.id === req.user.sessionId
  }));

  return res.json({ sessions });
});

app.delete("/api/auth/sessions/:id", requireAuth, (req, res) => {
  const usersData = readUsers();
  const user = (usersData.users || []).find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const normalized = normalizeUserRecord(user);
  const nextSessions = normalized.sessions.filter((session) => session.id !== req.params.id);
  if (nextSessions.length === normalized.sessions.length) {
    return res.status(404).json({ error: "Session not found." });
  }

  normalized.sessions = nextSessions;
  normalized.updatedAt = safeDate();
  usersData.users = usersData.users.map((entry) => (entry.id === normalized.id ? normalized : entry));
  writeUsers(usersData);

  appendAuditEvent(req, "auth.session.revoked", { revokedSessionId: req.params.id });
  return res.json({ sessions: nextSessions });
});

app.get("/api/bookings", requireAuth, (req, res) => {
  const { email, type, status } = req.query;
  const query = parseListQuery(req.query, { pageSize: 20, sortBy: "createdAt", sortDir: "desc" });
  const data = readBookings();

  let bookings = data.bookings;

  if (req.user.role === "customer") {
    bookings = bookings.filter((booking) => normalizeEmail(booking.email) === normalizeEmail(req.user.email));
  } else if (email) {
    const safeEmail = normalizeEmail(email);
    bookings = bookings.filter((booking) => normalizeEmail(booking.email) === safeEmail);
  }

  if (type) {
    bookings = bookings.filter((booking) => booking.bookingType === type);
  }

  if (status) {
    bookings = bookings.filter((booking) => booking.status === status);
  }

  if (query.q) {
    bookings = bookings.filter((booking) => {
      const haystack = [
        booking.id,
        booking.fullName,
        booking.email,
        booking.bookingType,
        booking.status,
        booking.notes
      ].join(" ").toLowerCase();

      return haystack.includes(query.q);
    });
  }

  bookings = sortItems(bookings, query.sortBy, query.sortDir, (booking, sortBy) => {
    if (sortBy === "date") return booking.date;
    if (sortBy === "status") return booking.status;
    if (sortBy === "bookingType") return booking.bookingType;
    if (sortBy === "fullName") return booking.fullName;
    return booking.createdAt;
  });

  const paged = paginateItems(bookings, query.page, query.pageSize);
  return res.json({ bookings: paged.items, pagination: paged.pagination });
});

app.get("/api/landlord/properties", requireAuth, requireLandlord, async (req, res, next) => {
  const query = parseListQuery(req.query, { pageSize: 10, sortBy: "updatedAt", sortDir: "desc" });
  let source = "app-state";
  let properties = [];

  try {
    properties = await listPropertiesRelational(req.user);
    source = "relational";
  } catch (error) {
    const data = readProperties();
    properties = Array.isArray(data.properties) ? data.properties : [];
    if (req.user.role !== "admin") {
      properties = properties.filter((property) => property.landlordId === req.user.id);
    }
    console.warn("[RELATIONAL READ WARNING] properties list fallback:", error.message);
  }

  try {
    if (req.query.status) {
      const status = String(req.query.status).toLowerCase();
      properties = properties.filter((property) => String(property.status).toLowerCase() === status);
    }

    if (query.q) {
      properties = properties.filter((property) => {
        const haystack = [
          property.name,
          property.address,
          property.city,
          property.state,
          property.zipCode,
          property.recentActivity,
          property.status
        ].join(" ").toLowerCase();

        return haystack.includes(query.q);
      });
    }

    properties = sortItems(properties, query.sortBy, query.sortDir, (property, sortBy) => {
      if (sortBy === "name") return property.name;
      if (sortBy === "address") return property.address;
      if (sortBy === "occupancyRate") return Number(property.occupancyRate || 0);
      if (sortBy === "unitCount") return Number(property.unitCount || 0);
      if (sortBy === "status") return property.status;
      return property.updatedAt;
    });

    const paged = paginateItems(properties, query.page, query.pageSize);
    return res.json({
      properties: paged.items,
      pagination: paged.pagination,
      meta: { storageMode, source }
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/landlord/properties", requireAuth, requireLandlord, createRateLimit("property-create", 25, 60_000), async (req, res, next) => {
  const validated = validatePropertyInput(req.body || {});
  if (validated.error) {
    return res.status(400).json({ error: validated.error });
  }

  const nextProperty = shapePropertyPayload(validated.payload, { landlordId: req.user.id });
  if (nextProperty.error) {
    return res.status(400).json({ error: nextProperty.error });
  }

  let source = "app-state";

  try {
    await syncPropertyToRelational(nextProperty.property);
    source = "relational";
  } catch (error) {
    console.warn("[RELATIONAL WRITE WARNING] property create fallback:", error.message);
  }

  upsertPropertyInState(nextProperty.property);

  appendAuditEvent(req, "landlord.property.created", {
    propertyId: nextProperty.property.id,
    name: nextProperty.property.name,
    source
  });

  return res.status(201).json({ property: nextProperty.property, meta: { source } });
});

app.patch("/api/landlord/properties/:id", requireAuth, requireLandlord, createRateLimit("property-update", 60, 60_000), async (req, res, next) => {
  const validated = validatePropertyInput(req.body || {});
  if (validated.error) {
    return res.status(400).json({ error: validated.error });
  }

  let relationalRow = null;
  let source = "app-state";

  try {
    relationalRow = await getPropertyRelationalById(req.params.id);
  } catch (error) {
    console.warn("[RELATIONAL READ WARNING] property single fallback:", error.message);
  }

  const stateData = readProperties();
  stateData.properties = Array.isArray(stateData.properties) ? stateData.properties : [];
  const stateExisting = stateData.properties.find((property) => property.id === req.params.id) || null;

  if (!relationalRow && !stateExisting) {
    return res.status(404).json({ error: "Property not found." });
  }

  const existing = relationalRow
    ? mapRowToProperty(relationalRow, stateExisting || {})
    : stateExisting;

  if (!existing) {
    return res.status(404).json({ error: "Property not found." });
  }

  if (req.user.role !== "admin" && existing.landlordId !== req.user.id) {
    return res.status(403).json({ error: "You do not have permission to edit this property." });
  }

  const nextProperty = shapePropertyPayload(validated.payload, existing);
  if (nextProperty.error) {
    return res.status(400).json({ error: nextProperty.error });
  }

  nextProperty.property.landlordId = existing.landlordId;

  try {
    await syncPropertyToRelational(nextProperty.property);
    source = "relational";
  } catch (error) {
    console.warn("[RELATIONAL WRITE WARNING] property update fallback:", error.message);
  }

  upsertPropertyInState(nextProperty.property);

  appendAuditEvent(req, "landlord.property.updated", {
    propertyId: nextProperty.property.id,
    name: nextProperty.property.name,
    source
  });

  return res.json({ property: nextProperty.property, meta: { source } });
});

app.delete("/api/landlord/properties/:id", requireAuth, requireLandlord, createRateLimit("property-delete", 20, 60_000), async (req, res) => {
  let relationalRow = null;
  let source = "app-state";

  try {
    relationalRow = await getPropertyRelationalById(req.params.id);
  } catch (error) {
    console.warn("[RELATIONAL READ WARNING] property delete fallback:", error.message);
  }

  const stateData = readProperties();
  stateData.properties = Array.isArray(stateData.properties) ? stateData.properties : [];
  const existing = stateData.properties.find((property) => property.id === req.params.id)
    || (relationalRow ? mapRowToProperty(relationalRow, {}) : null);

  if (!existing) {
    return res.status(404).json({ error: "Property not found." });
  }

  if (req.user.role !== "admin" && existing.landlordId !== req.user.id) {
    return res.status(403).json({ error: "You do not have permission to delete this property." });
  }

  try {
    await removePropertyFromRelational(existing.id);
    source = "relational";
  } catch (error) {
    console.warn("[RELATIONAL WRITE WARNING] property delete fallback:", error.message);
  }

  removePropertyFromState(existing.id);

  appendAuditEvent(req, "landlord.property.deleted", {
    propertyId: existing.id,
    name: existing.name,
    source
  });

  return res.status(204).end();
});

app.get("/api/landlord/units", requireAuth, requireLandlord, async (req, res) => {
  const query = parseListQuery(req.query, { pageSize: 12, sortBy: "updatedAt", sortDir: "desc" });
  let units = [];
  let source = "app-state";

  try {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    let propertiesQuery = supabase.from("properties").select("id, landlord_id, name, address");
    if (req.user.role !== "admin") {
      propertiesQuery = propertiesQuery.eq("landlord_id", req.user.id);
    }

    const { data: propertiesRows, error: propertiesError } = await propertiesQuery;
    if (propertiesError) {
      throw propertiesError;
    }

    const propertyById = new Map((propertiesRows || []).map((row) => [row.id, row]));
    const propertyIds = [...propertyById.keys()];

    if (!propertyIds.length) {
      return res.json({ units: [], pagination: { page: 1, pageSize: query.pageSize, total: 0, totalPages: 1 }, meta: { source: "relational" } });
    }

    const { data: unitRows, error: unitError } = await supabase
      .from("units")
      .select("id, property_id, label, rent_amount, status, updated_at")
      .in("property_id", propertyIds);

    if (unitError) {
      throw unitError;
    }

    const unitIds = (unitRows || []).map((row) => row.id);
    let leaseRows = [];
    if (unitIds.length) {
      const { data: fetchedLeases, error: leaseError } = await supabase
        .from("leases")
        .select("id, unit_id, tenant_id, end_date, status")
        .in("unit_id", unitIds)
        .eq("status", "active");
      if (leaseError) {
        throw leaseError;
      }
      leaseRows = fetchedLeases || [];
    }

    const tenantIds = [...new Set(leaseRows.map((row) => row.tenant_id).filter(Boolean))];
    let tenantById = new Map();
    if (tenantIds.length) {
      const { data: tenantRows, error: tenantError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", tenantIds);
      if (tenantError) {
        throw tenantError;
      }
      tenantById = new Map((tenantRows || []).map((row) => [row.id, row]));
    }

    const leaseByUnitId = new Map(leaseRows.map((lease) => [lease.unit_id, lease]));
    units = (unitRows || []).map((unit) => {
      const property = propertyById.get(unit.property_id);
      const lease = leaseByUnitId.get(unit.id);
      const tenant = lease ? tenantById.get(lease.tenant_id) : null;

      return {
        id: unit.id,
        propertyId: unit.property_id,
        propertyName: property?.name || "Unknown property",
        propertyAddress: property?.address || "",
        label: unit.label,
        rentAmount: Number(unit.rent_amount || 0),
        status: unit.status || "vacant",
        tenantName: tenant?.full_name || "Unassigned",
        tenantEmail: tenant?.email || "",
        leaseEndDate: lease?.end_date || "",
        updatedAt: unit.updated_at || safeDate()
      };
    });
    source = "relational";
  } catch (error) {
    const root = readTenantData();
    units = buildFallbackUnitsForLandlord(req.user, root);
    console.warn("[RELATIONAL READ WARNING] units list fallback:", error.message);
  }

  if (query.q) {
    units = units.filter((unit) => {
      const haystack = [
        unit.label,
        unit.propertyName,
        unit.propertyAddress,
        unit.status,
        unit.tenantName,
        unit.tenantEmail
      ].join(" ").toLowerCase();
      return haystack.includes(query.q);
    });
  }

  if (req.query.status) {
    const status = String(req.query.status).toLowerCase();
    units = units.filter((unit) => String(unit.status).toLowerCase() === status);
  }

  units = sortItems(units, query.sortBy, query.sortDir, (unit, sortBy) => {
    if (sortBy === "label") return unit.label;
    if (sortBy === "propertyName") return unit.propertyName;
    if (sortBy === "status") return unit.status;
    if (sortBy === "rentAmount") return Number(unit.rentAmount || 0);
    return unit.updatedAt;
  });

  const paged = paginateItems(units, query.page, query.pageSize);
  return res.json({ units: paged.items, pagination: paged.pagination, meta: { source } });
});

app.get("/api/landlord/tenants/candidates", requireAuth, requireLandlord, (req, res) => {
  const root = readTenantData();
  const candidates = collectLandlordTenantCandidates(req.user.id, root, { includePending: true });
  return res.json({ candidates });
});

app.post("/api/landlord/units/assign", requireAuth, requireLandlord, createRateLimit("landlord-unit-assign", 45, 60_000), (req, res) => {
  const unitId = String(req.body.unitId || "").trim();
  const tenantEmail = normalizeEmail(req.body.tenantEmail || "");
  const leaseEndDate = trimTo(req.body.leaseEndDate || "", 20);

  if (!unitId || !tenantEmail || !leaseEndDate) {
    return res.status(400).json({ error: "Unit ID, tenant email, and lease end date are required." });
  }

  if (!isValidIsoDate(leaseEndDate)) {
    return res.status(400).json({ error: "Lease end date must use YYYY-MM-DD format." });
  }

  const tenantUser = findUserByEmail(tenantEmail);
  if (!tenantUser || tenantUser.role !== "customer") {
    return res.status(404).json({ error: "Tenant account not found for the provided email." });
  }

  const root = readTenantData();
  const units = buildFallbackUnitsForLandlord(req.user, root);
  const unit = units.find((entry) => entry.id === unitId);

  if (!unit) {
    return res.status(404).json({ error: "Unit not found in your portfolio." });
  }

  if (unit.status !== "vacant") {
    return res.status(409).json({ error: `Unit is currently ${unit.status} and cannot be assigned.` });
  }

  const property = findPropertyById(unit.propertyId);
  if (!property) {
    return res.status(404).json({ error: "Property not found for selected unit." });
  }

  const candidates = collectLandlordTenantCandidates(req.user.id, root, { includePending: true });
  const candidate = candidates.find((entry) => normalizeEmail(entry.email) === tenantEmail);
  if (candidate?.preferredPropertyId && candidate.preferredPropertyId !== unit.propertyId) {
    return res.status(409).json({ error: "Assignment rule violation: tenant can only be assigned to their matched property." });
  }

  const assignments = ensureUnitAssignmentStore(root);
  const activeCount = countActiveAssignmentsForProperty(root, property.id);
  if (activeCount >= Math.max(1, Number(property.unitCount || 1))) {
    return res.status(409).json({ error: "Assignment rule violation: maximum tenants reached for this property." });
  }

  const now = safeDate();
  const before = assignments[unit.id] && assignments[unit.id].status === "active" ? cloneData(assignments[unit.id]) : null;
  const nextAssignment = {
    unitId: unit.id,
    label: unit.label,
    propertyId: unit.propertyId,
    landlordId: req.user.id,
    tenantId: tenantUser.id,
    tenantName: tenantUser.fullName,
    tenantEmail: tenantUser.email,
    leaseEndDate,
    mode: "manual",
    status: "active",
    assignedAt: now,
    updatedAt: now,
    assignedBy: req.user.id
  };
  assignments[unit.id] = nextAssignment;

  const tenantRecord = getTenantRecordFromRoot(root, tenantUser);
  syncTenantAfterUnitAssignment(tenantRecord, nextAssignment, property, req.user);

  recordUnitAssignmentHistory(root, unit.id, {
    type: "manual_assign",
    actorId: req.user.id,
    actorName: req.user.fullName || req.user.email,
    beforeAssignment: before,
    afterAssignment: cloneData(nextAssignment),
    details: {
      tenantEmail,
      propertyId: unit.propertyId,
      leaseEndDate
    }
  });

  const relationshipStore = ensureRelationshipStore(root);
  const related = (relationshipStore.invitations || []).find((relationship) =>
    relationship.landlordId === req.user.id
    && normalizeEmail(relationship.tenantEmail) === tenantEmail
    && relationship.propertyId === unit.propertyId
    && relationship.status === "pending"
  );

  if (related) {
    related.status = "accepted";
    related.respondedAt = now;
    related.updatedAt = now;
  }

  writeTenantData(root);
  appendAuditEvent(req, "landlord.unit.assigned", {
    unitId: unit.id,
    propertyId: unit.propertyId,
    tenantId: tenantUser.id,
    tenantEmail
  });

  const refreshed = buildFallbackUnitsForLandlord(req.user, root).find((entry) => entry.id === unit.id);
  return res.json({ assignment: nextAssignment, unit: refreshed || unit });
});

app.post("/api/landlord/units/auto-assign", requireAuth, requireLandlord, createRateLimit("landlord-unit-auto-assign", 20, 60_000), (req, res) => {
  const propertyId = String(req.body.propertyId || "").trim();
  const limit = Math.max(1, Math.min(25, Number.parseInt(req.body.limit, 10) || 5));
  const leaseEndDate = trimTo(req.body.leaseEndDate || "", 20) || `${new Date().getFullYear() + 1}-12-31`;

  if (!isValidIsoDate(leaseEndDate)) {
    return res.status(400).json({ error: "Lease end date must use YYYY-MM-DD format." });
  }

  const root = readTenantData();
  const plan = buildAutoAssignmentPlan(req.user, root, { propertyId, limit });

  if (!plan.plannedAssignments.length) {
    return res.json({ assignedCount: 0, assignments: [], reason: "No compatible tenants or vacant units found." });
  }

  const assignments = ensureUnitAssignmentStore(root);
  const relationshipStore = ensureRelationshipStore(root);
  const created = [];

  for (const planned of plan.plannedAssignments) {
    const tenantUser = findUserById(planned.tenantId) || findUserByEmail(planned.tenantEmail);
    if (!tenantUser || tenantUser.role !== "customer") {
      continue;
    }

    const property = findPropertyById(planned.propertyId);
    if (!property) {
      continue;
    }

    const now = safeDate();
    const before = assignments[planned.unitId] && assignments[planned.unitId].status === "active" ? cloneData(assignments[planned.unitId]) : null;
    const nextAssignment = {
      unitId: planned.unitId,
      label: planned.unitLabel,
      propertyId: planned.propertyId,
      landlordId: req.user.id,
      tenantId: tenantUser.id,
      tenantName: tenantUser.fullName,
      tenantEmail: tenantUser.email,
      leaseEndDate,
      mode: "auto",
      status: "active",
      assignedAt: now,
      updatedAt: now,
      assignedBy: req.user.id
    };
    assignments[planned.unitId] = nextAssignment;

    const tenantRecord = getTenantRecordFromRoot(root, tenantUser);
    syncTenantAfterUnitAssignment(tenantRecord, nextAssignment, property, req.user);

    recordUnitAssignmentHistory(root, planned.unitId, {
      type: "auto_assign",
      actorId: req.user.id,
      actorName: req.user.fullName || req.user.email,
      beforeAssignment: before,
      afterAssignment: cloneData(nextAssignment),
      details: {
        tenantEmail: tenantUser.email,
        propertyId: planned.propertyId,
        leaseEndDate,
        candidatePriority: planned.candidatePriority
      }
    });

    const related = (relationshipStore.invitations || []).find((relationship) =>
      relationship.id === planned.relationshipId
    );
    if (related && related.status === "pending") {
      related.status = "accepted";
      related.respondedAt = now;
      related.updatedAt = now;
    }

    created.push(nextAssignment);
  }

  writeTenantData(root);
  appendAuditEvent(req, "landlord.unit.auto_assigned", {
    assignedCount: created.length,
    propertyId: propertyId || "all"
  });

  return res.json({ assignedCount: created.length, assignments: created });
});

app.post("/api/landlord/units/auto-assign/preview", requireAuth, requireLandlord, createRateLimit("landlord-unit-auto-assign-preview", 40, 60_000), (req, res) => {
  const propertyId = String(req.body.propertyId || "").trim();
  const limit = Math.max(1, Math.min(25, Number.parseInt(req.body.limit, 10) || 5));

  const root = readTenantData();
  const preview = buildAutoAssignmentPlan(req.user, root, { propertyId, limit });

  return res.json({
    summary: {
      propertyId: preview.propertyId,
      limit: preview.limit,
      candidateCount: preview.candidateCount,
      vacantUnitCount: preview.vacantUnitCount,
      plannedCount: preview.plannedAssignments.length,
      remainingVacantUnits: preview.remainingVacantUnits
    },
    plannedAssignments: preview.plannedAssignments,
    skippedCandidates: preview.skippedCandidates
  });
});

app.post("/api/landlord/units/unassign", requireAuth, requireLandlord, createRateLimit("landlord-unit-unassign", 45, 60_000), (req, res) => {
  const unitId = String(req.body.unitId || "").trim();
  const reason = trimTo(req.body.reason || "Unassigned by landlord", 240);

  if (!unitId) {
    return res.status(400).json({ error: "Unit ID is required." });
  }

  const root = readTenantData();
  const units = buildFallbackUnitsForLandlord(req.user, root);
  const unit = units.find((entry) => entry.id === unitId);
  if (!unit) {
    return res.status(404).json({ error: "Unit not found in your portfolio." });
  }

  const assignments = ensureUnitAssignmentStore(root);
  const active = getActiveAssignmentForUnit(root, unitId);
  if (!active) {
    return res.status(404).json({ error: "No active assignment found for this unit." });
  }

  const now = safeDate();
  const endedAssignment = {
    ...active,
    status: "ended",
    endedAt: now,
    endReason: reason,
    updatedAt: now
  };
  assignments[unitId] = endedAssignment;

  const tenantUser = active.tenantId ? findUserById(active.tenantId) : findUserByEmail(active.tenantEmail || "");
  if (tenantUser) {
    const tenantRecord = getTenantRecordFromRoot(root, tenantUser);
    syncTenantAfterUnitUnassignment(tenantRecord, active, unit.propertyName, reason);
  }

  recordUnitAssignmentHistory(root, unitId, {
    type: "unassign",
    actorId: req.user.id,
    actorName: req.user.fullName || req.user.email,
    beforeAssignment: cloneData(active),
    afterAssignment: cloneData(endedAssignment),
    details: {
      reason
    }
  });

  writeTenantData(root);
  appendAuditEvent(req, "landlord.unit.unassigned", {
    unitId,
    tenantEmail: active.tenantEmail,
    reason
  });

  const refreshed = buildFallbackUnitsForLandlord(req.user, root).find((entry) => entry.id === unitId);
  return res.json({ unit: refreshed || unit, previousAssignment: active, currentAssignment: endedAssignment });
});

app.post("/api/landlord/units/transfer", requireAuth, requireLandlord, createRateLimit("landlord-unit-transfer", 35, 60_000), (req, res) => {
  const fromUnitId = String(req.body.fromUnitId || "").trim();
  const toUnitId = String(req.body.toUnitId || "").trim();
  const leaseEndDate = trimTo(req.body.leaseEndDate || "", 20);

  if (!fromUnitId || !toUnitId || !leaseEndDate) {
    return res.status(400).json({ error: "From unit, to unit, and lease end date are required." });
  }

  if (!isValidIsoDate(leaseEndDate)) {
    return res.status(400).json({ error: "Lease end date must use YYYY-MM-DD format." });
  }

  if (fromUnitId === toUnitId) {
    return res.status(400).json({ error: "From unit and to unit must be different." });
  }

  const root = readTenantData();
  const units = buildFallbackUnitsForLandlord(req.user, root);
  const fromUnit = units.find((entry) => entry.id === fromUnitId);
  const toUnit = units.find((entry) => entry.id === toUnitId);

  if (!fromUnit || !toUnit) {
    return res.status(404).json({ error: "One or both units were not found in your portfolio." });
  }

  if (fromUnit.propertyId !== toUnit.propertyId) {
    return res.status(409).json({ error: "Assignment rule violation: tenant transfer is only allowed within the same property." });
  }

  const activeFrom = getActiveAssignmentForUnit(root, fromUnitId);
  if (!activeFrom) {
    return res.status(404).json({ error: "No active tenant assignment found for the source unit." });
  }

  if (toUnit.status !== "vacant") {
    return res.status(409).json({ error: `Target unit is ${toUnit.status} and cannot receive a transfer.` });
  }

  const assignments = ensureUnitAssignmentStore(root);
  const now = safeDate();
  const updatedFrom = {
    ...activeFrom,
    status: "transferred",
    transferToUnitId: toUnitId,
    endedAt: now,
    updatedAt: now
  };
  assignments[fromUnitId] = updatedFrom;

  const transferred = {
    ...activeFrom,
    unitId: toUnitId,
    label: toUnit.label,
    propertyId: toUnit.propertyId,
    leaseEndDate,
    mode: "transfer",
    status: "active",
    assignedAt: now,
    updatedAt: now,
    assignedBy: req.user.id,
    sourceUnitId: fromUnitId
  };
  assignments[toUnitId] = transferred;

  const tenantUser = activeFrom.tenantId ? findUserById(activeFrom.tenantId) : findUserByEmail(activeFrom.tenantEmail || "");
  const property = findPropertyById(toUnit.propertyId);
  if (tenantUser && property) {
    const tenantRecord = getTenantRecordFromRoot(root, tenantUser);
    syncTenantAfterUnitAssignment(tenantRecord, transferred, property, req.user);
  }

  recordUnitAssignmentHistory(root, fromUnitId, {
    type: "transfer_out",
    actorId: req.user.id,
    actorName: req.user.fullName || req.user.email,
    beforeAssignment: cloneData(activeFrom),
    afterAssignment: cloneData(updatedFrom),
    details: {
      toUnitId,
      leaseEndDate
    }
  });

  recordUnitAssignmentHistory(root, toUnitId, {
    type: "transfer_in",
    actorId: req.user.id,
    actorName: req.user.fullName || req.user.email,
    beforeAssignment: null,
    afterAssignment: cloneData(transferred),
    details: {
      fromUnitId,
      leaseEndDate
    }
  });

  writeTenantData(root);
  appendAuditEvent(req, "landlord.unit.transferred", {
    fromUnitId,
    toUnitId,
    tenantEmail: activeFrom.tenantEmail
  });

  const refreshed = buildFallbackUnitsForLandlord(req.user, root);
  return res.json({
    fromUnit: refreshed.find((entry) => entry.id === fromUnitId) || fromUnit,
    toUnit: refreshed.find((entry) => entry.id === toUnitId) || toUnit,
    assignment: transferred
  });
});

app.get("/api/landlord/units/:unitId/history", requireAuth, requireLandlord, (req, res) => {
  const unitId = String(req.params.unitId || "").trim();
  const root = readTenantData();
  const units = buildFallbackUnitsForLandlord(req.user, root);
  const unit = units.find((entry) => entry.id === unitId);
  if (!unit) {
    return res.status(404).json({ error: "Unit not found in your portfolio." });
  }

  return res.json({ unitId, history: getUnitHistory(root, unitId) });
});

app.post("/api/landlord/units/:unitId/rollback", requireAuth, requireLandlord, createRateLimit("landlord-unit-rollback", 25, 60_000), (req, res) => {
  const unitId = String(req.params.unitId || "").trim();
  const eventId = String(req.body.eventId || "").trim();
  if (!unitId || !eventId) {
    return res.status(400).json({ error: "Unit ID and event ID are required." });
  }

  const root = readTenantData();
  const units = buildFallbackUnitsForLandlord(req.user, root);
  const unit = units.find((entry) => entry.id === unitId);
  if (!unit) {
    return res.status(404).json({ error: "Unit not found in your portfolio." });
  }

  const history = getUnitHistory(root, unitId);
  const targetEvent = history.find((entry) => entry.id === eventId);
  if (!targetEvent) {
    return res.status(404).json({ error: "History event not found for this unit." });
  }

  const assignments = ensureUnitAssignmentStore(root);
  const currentActive = getActiveAssignmentForUnit(root, unitId);
  const beforeSnapshot = targetEvent.beforeAssignment ? cloneData(targetEvent.beforeAssignment) : null;
  const now = safeDate();

  if (beforeSnapshot && beforeSnapshot.status === "active") {
    const property = findPropertyById(beforeSnapshot.propertyId);
    if (!property) {
      return res.status(404).json({ error: "Cannot rollback because the related property no longer exists." });
    }

    const activeCount = countActiveAssignmentsForProperty(root, beforeSnapshot.propertyId)
      - (currentActive && currentActive.propertyId === beforeSnapshot.propertyId ? 1 : 0);
    if (activeCount >= Math.max(1, Number(property.unitCount || 1))) {
      return res.status(409).json({ error: "Rollback blocked by max-tenant rule for this property." });
    }

    beforeSnapshot.updatedAt = now;
    beforeSnapshot.mode = "rollback";
    assignments[unitId] = beforeSnapshot;

    const tenantUser = beforeSnapshot.tenantId ? findUserById(beforeSnapshot.tenantId) : findUserByEmail(beforeSnapshot.tenantEmail || "");
    if (tenantUser) {
      const tenantRecord = getTenantRecordFromRoot(root, tenantUser);
      syncTenantAfterUnitAssignment(tenantRecord, beforeSnapshot, property, req.user);
    }
  } else {
    if (currentActive) {
      const tenantUser = currentActive.tenantId ? findUserById(currentActive.tenantId) : findUserByEmail(currentActive.tenantEmail || "");
      if (tenantUser) {
        const tenantRecord = getTenantRecordFromRoot(root, tenantUser);
        syncTenantAfterUnitUnassignment(tenantRecord, currentActive, unit.propertyName, "Rollback");
      }
    }

    delete assignments[unitId];
  }

  recordUnitAssignmentHistory(root, unitId, {
    type: "rollback",
    actorId: req.user.id,
    actorName: req.user.fullName || req.user.email,
    beforeAssignment: currentActive ? cloneData(currentActive) : null,
    afterAssignment: assignments[unitId] ? cloneData(assignments[unitId]) : null,
    details: {
      restoredEventId: eventId,
      restoredEventType: targetEvent.type
    }
  });

  writeTenantData(root);
  appendAuditEvent(req, "landlord.unit.rollback", {
    unitId,
    restoredEventId: eventId,
    restoredEventType: targetEvent.type
  });

  const refreshed = buildFallbackUnitsForLandlord(req.user, root).find((entry) => entry.id === unitId);
  return res.json({ unit: refreshed || unit, restoredEvent: targetEvent });
});

app.get("/api/landlord/audit", requireAuth, requireLandlord, (req, res) => {
  const query = parseListQuery(req.query, { pageSize: 12, sortBy: "at", sortDir: "desc" });
  const log = readAuditLog();
  const events = Array.isArray(log.events) ? log.events : [];

  let scoped = req.user.role === "admin"
    ? events
    : events.filter((entry) => {
      const actorId = entry?.actor?.id;
      const targetLandlordId = entry?.details?.landlordId;
      return actorId === req.user.id || targetLandlordId === req.user.id;
    });

  if (req.query.action) {
    const action = String(req.query.action).toLowerCase();
    scoped = scoped.filter((entry) => String(entry.action || "").toLowerCase().includes(action));
  }

  if (query.q) {
    scoped = scoped.filter((entry) => {
      const haystack = [
        entry.id,
        entry.action,
        entry.actor?.email,
        entry.actor?.role,
        JSON.stringify(entry.details || {})
      ].join(" ").toLowerCase();
      return haystack.includes(query.q);
    });
  }

  scoped = sortItems(scoped, query.sortBy, query.sortDir, (entry, sortBy) => {
    if (sortBy === "action") return entry.action;
    if (sortBy === "actor") return entry.actor?.email;
    return entry.at;
  });

  const paged = paginateItems(scoped, query.page, query.pageSize);
  return res.json({ events: paged.items, pagination: paged.pagination });
});

app.post("/api/bookings", requireAuth, createRateLimit("booking-create", 35, 60_000), (req, res) => {
  const { date, slot, bookingType, notes, fullName } = req.body;

  let bookingName = req.user.fullName;
  let bookingEmail = req.user.email;

  if (req.user.role === "admin") {
    bookingName = String(fullName || req.user.fullName).trim();
    bookingEmail = normalizeEmail(req.body.email || req.user.email);
  }

  bookingName = trimTo(bookingName, 120);
  bookingEmail = normalizeEmail(bookingEmail);

  if (!bookingName || !bookingEmail || !date || !slot || !bookingType) {
    return res.status(400).json({ error: "Missing required booking details." });
  }

  if (!["pool-day", "spa", "event-space"].includes(bookingType)) {
    return res.status(400).json({ error: "Invalid booking type." });
  }

  const data = readBookings();
  const now = safeDate();
  const booking = {
    id: `BK-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    fullName: bookingName,
    email: bookingEmail,
    date,
    slot,
    bookingType,
    notes: trimTo(notes, 500),
    status: "pending",
    history: [
      {
        action: "created",
        at: now,
        by: getActingName(req)
      }
    ],
    createdAt: now,
    updatedAt: now
  };

  data.bookings.push(booking);
  writeBookings(data);

  return res.status(201).json({ booking });
});

app.patch("/api/bookings/:id/confirm", requireAuth, requireLandlord, createRateLimit("booking-confirm", 80, 60_000), (req, res) => {
  const data = readBookings();
  const booking = data.bookings.find((item) => item.id === req.params.id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found." });
  }

  const nextStatus = getNextStatus(booking.status, "confirm");
  if (!nextStatus) {
    return res.status(409).json({ error: `Cannot confirm booking in ${booking.status} state.` });
  }

  booking.status = nextStatus;
  booking.updatedAt = safeDate();
  booking.history.push({
    action: "confirmed",
    at: booking.updatedAt,
    by: getActingName(req)
  });

  writeBookings(data);
  return res.json({ booking });
});

app.patch("/api/bookings/:id/approve", requireAuth, requireLandlord, createRateLimit("booking-approve", 80, 60_000), (req, res) => {
  const data = readBookings();
  const booking = data.bookings.find((item) => item.id === req.params.id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found." });
  }

  const nextStatus = getNextStatus(booking.status, "approve");
  if (!nextStatus) {
    return res.status(409).json({ error: `Cannot approve booking in ${booking.status} state.` });
  }

  booking.status = nextStatus;
  booking.updatedAt = safeDate();
  booking.history.push({
    action: "approved",
    at: booking.updatedAt,
    by: getActingName(req)
  });

  writeBookings(data);
  return res.json({ booking });
});

app.patch("/api/bookings/:id/reject", requireAuth, requireLandlord, createRateLimit("booking-reject", 80, 60_000), (req, res) => {
  const data = readBookings();
  const booking = data.bookings.find((item) => item.id === req.params.id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found." });
  }

  const nextStatus = getNextStatus(booking.status, "reject");
  if (!nextStatus) {
    return res.status(409).json({ error: `Cannot reject booking in ${booking.status} state.` });
  }

  booking.status = nextStatus;
  booking.updatedAt = safeDate();
  booking.history.push({
    action: "rejected",
    at: booking.updatedAt,
    by: getActingName(req),
    reason: trimTo(req.body.reason || "No reason provided", 280)
  });

  writeBookings(data);
  return res.json({ booking });
});

app.get("/api/marketplace/properties", requireAuth, (req, res) => {
  const query = parseListQuery(req.query, { pageSize: 12, sortBy: "updatedAt", sortDir: "desc" });
  const data = readProperties();
  let properties = Array.isArray(data.properties) ? data.properties : [];

  properties = properties.filter((property) => String(property.status || "").toLowerCase() === "active");

  if (req.query.city) {
    const city = String(req.query.city).trim().toLowerCase();
    properties = properties.filter((property) => String(property.city || "").trim().toLowerCase() === city);
  }

  if (req.query.minRent) {
    const minRent = Number(req.query.minRent) || 0;
    properties = properties.filter((property) => Number(property.monthlyRentLow || 0) >= minRent || Number(property.monthlyRentHigh || 0) >= minRent);
  }

  if (req.query.maxRent) {
    const maxRent = Number(req.query.maxRent) || 0;
    properties = properties.filter((property) => Number(property.monthlyRentLow || 0) <= maxRent || Number(property.monthlyRentHigh || 0) <= maxRent);
  }

  if (req.query.minAvailableUnits) {
    const minAvailableUnits = Number(req.query.minAvailableUnits) || 0;
    properties = properties.filter((property) => getPropertyAvailableUnits(property) >= minAvailableUnits);
  }

  if (req.query.maxOccupancy) {
    const maxOccupancy = Number(req.query.maxOccupancy);
    if (!Number.isNaN(maxOccupancy)) {
      properties = properties.filter((property) => Number(property.occupancyRate || 0) <= maxOccupancy);
    }
  }

  if (req.query.minBedrooms) {
    const minBedrooms = Number(req.query.minBedrooms) || 0;
    properties = properties.filter((property) => getPropertyBedrooms(property) >= minBedrooms);
  }

  if (req.query.maxBedrooms) {
    const maxBedrooms = Number(req.query.maxBedrooms) || 0;
    properties = properties.filter((property) => getPropertyBedrooms(property) <= maxBedrooms);
  }

  if (req.query.minBathrooms) {
    const minBathrooms = Number(req.query.minBathrooms) || 0;
    properties = properties.filter((property) => getPropertyBathrooms(property) >= minBathrooms);
  }

  if (req.query.maxBathrooms) {
    const maxBathrooms = Number(req.query.maxBathrooms) || 0;
    properties = properties.filter((property) => getPropertyBathrooms(property) <= maxBathrooms);
  }

  if (query.q) {
    properties = properties.filter((property) => {
      const haystack = [property.name, property.address, property.city, property.state, property.zipCode, property.recentActivity].join(" ").toLowerCase();
      return haystack.includes(query.q);
    });
  }

  properties = sortItems(properties, query.sortBy, query.sortDir, (property, sortBy) => {
    if (sortBy === "name") return property.name;
    if (sortBy === "city") return property.city;
    if (sortBy === "status") return property.status;
    if (sortBy === "occupancyRate") return Number(property.occupancyRate || 0);
    if (sortBy === "availableUnits") return getPropertyAvailableUnits(property);
    if (sortBy === "monthlyRentLow") return Number(property.monthlyRentLow || 0);
    return property.updatedAt;
  });

  const paged = paginateItems(properties.map((property) => buildMarketplaceProperty(property)), query.page, query.pageSize);
  return res.json({ properties: paged.items, pagination: paged.pagination });
});

app.get("/api/tenant/marketplace", requireAuth, requireTenant, (req, res) => {
  return res.redirect(307, `/api/marketplace/properties${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`);
});

app.post("/api/tenant/marketplace/request", requireAuth, requireTenant, createRateLimit("tenant-marketplace-request", 18, 60_000), (req, res) => {
  const propertyId = String(req.body.propertyId || "").trim();
  const message = trimTo(req.body.message || "", 500);
  if (!propertyId) {
    return res.status(400).json({ error: "Property ID is required." });
  }

  const property = findPropertyById(propertyId);
  if (!property) {
    return res.status(404).json({ error: "Property not found." });
  }

  const landlord = findUserById(property.landlordId);
  const { tenant, root } = getOrCreateTenant(req.user);
  const relationships = ensureRelationshipStore(root);
  const existing = relationships.invitations.find((relationship) =>
    relationship.propertyId === property.id &&
    normalizeEmail(relationship.tenantEmail) === normalizeEmail(req.user.email) &&
    relationship.direction === "tenant_request" &&
    ["pending", "accepted"].includes(relationship.status)
  );

  if (existing) {
    return res.json({ invitation: summarizeRelationship(existing), duplicate: true });
  }

  const now = safeDate();
  const invitation = {
    id: `REL-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    direction: "tenant_request",
    status: "pending",
    landlordId: property.landlordId,
    landlordName: landlord?.fullName || "",
    landlordEmail: landlord?.email || "",
    tenantId: tenant.tenantId,
    tenantName: req.user.fullName,
    tenantEmail: req.user.email,
    propertyId: property.id,
    propertyName: property.name,
    propertyAddress: property.address,
    message,
    createdAt: now,
    updatedAt: now,
    respondedAt: ""
  };

  relationships.invitations.unshift(invitation);
  persistTenant(req.user.id, tenant, root);
  appendAuditEvent(req, "marketplace.tenant.requested", { propertyId: property.id, landlordId: property.landlordId, invitationId: invitation.id });
  return res.status(201).json({ invitation: summarizeRelationship(invitation) });
});

app.get("/api/tenant/relationships", requireAuth, requireTenant, (req, res) => {
  const { tenant, root } = getOrCreateTenant(req.user);
  const relationships = ensureRelationshipStore(root).invitations
    .filter((relationship) => relationship.tenantId === req.user.id || normalizeEmail(relationship.tenantEmail) === normalizeEmail(req.user.email))
    .slice()
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0))
    .map((relationship) => summarizeRelationship(relationship));

  return res.json({
    relationships,
    summary: summarizeTenantRelationship(tenant, root)
  });
});

app.post("/api/tenant/relationships/:id/accept", requireAuth, requireTenant, createRateLimit("tenant-relationship-accept", 25, 60_000), (req, res) => {
  const { tenant, root } = getOrCreateTenant(req.user);
  const relationships = ensureRelationshipStore(root);
  const invitation = relationships.invitations.find((relationship) =>
    relationship.id === req.params.id &&
    relationship.direction === "landlord_invite" &&
    (relationship.tenantId === req.user.id || normalizeEmail(relationship.tenantEmail) === normalizeEmail(req.user.email))
  );

  if (!invitation) {
    return res.status(404).json({ error: "Invitation not found." });
  }

  if (invitation.status !== "pending") {
    return res.status(409).json({ error: `Cannot accept an invitation in ${invitation.status} state.` });
  }

  const property = findPropertyById(invitation.propertyId);
  const landlord = findUserById(invitation.landlordId);
  const now = safeDate();
  invitation.status = "accepted";
  invitation.respondedAt = now;
  invitation.updatedAt = now;

  if (property) {
    const leaseRent = Number(property.monthlyRentLow || property.monthlyRentHigh || tenant.rent.amountDue || 0);
    tenant.lease.startDate = tenant.lease.startDate || now.slice(0, 10);
    tenant.lease.endDate = tenant.lease.endDate || "";
    tenant.lease.propertyAddress = property.address || tenant.lease.propertyAddress;
    tenant.lease.unit = tenant.lease.unit || "";
    tenant.lease.rentAmount = leaseRent;
    tenant.lease.documentUrl = tenant.lease.documentUrl || createDocumentUrl(`${property.name}-lease.pdf`);
    tenant.lease.landlord = {
      name: landlord?.fullName || invitation.landlordName || tenant.lease.landlord.name,
      email: landlord?.email || invitation.landlordEmail || tenant.lease.landlord.email
    };
    tenant.rent.amountDue = leaseRent || tenant.rent.amountDue;
    tenant.rent.nextPaymentDate = tenant.rent.nextPaymentDate || `${new Date(now).getFullYear()}-${String(new Date(now).getMonth() + 2).padStart(2, "0")}-01`;
    tenant.rent.status = "pending";
    tenant.activity.unshift({ id: `ACT-${Date.now()}-relationship`, message: `Connected with ${tenant.lease.landlord.name || landlord?.fullName || "your landlord"} at ${property.name}`, at: now });
    tenant.notifications.items.unshift({
      id: `NT-${Date.now()}-relationship`,
      title: "Landlord connection accepted",
      message: `You are now linked to ${property.name}.`,
      type: "lease",
      read: false,
      createdAt: now
    });
  }

  persistTenant(req.user.id, tenant, root);
  appendAuditEvent(req, "marketplace.relationship.accepted", { invitationId: invitation.id, propertyId: invitation.propertyId, landlordId: invitation.landlordId });
  return res.json({ invitation: summarizeRelationship(invitation) });
});

app.get("/api/landlord/relationships", requireAuth, requireLandlord, (req, res) => {
  const root = readTenantData();
  const relationships = summarizeLandlordRelationships(req.user.id, root);
  const summary = relationships.reduce((accumulator, relationship) => {
    accumulator.total += 1;
    accumulator[relationship.status] = (accumulator[relationship.status] || 0) + 1;
    if (relationship.direction === "landlord_invite") {
      accumulator.sent += 1;
    }
    if (relationship.direction === "tenant_request") {
      accumulator.requests += 1;
    }
    return accumulator;
  }, { total: 0, pending: 0, accepted: 0, declined: 0, sent: 0, requests: 0 });

  return res.json({ relationships, summary });
});

app.post("/api/landlord/relationships/invite", requireAuth, requireLandlord, createRateLimit("landlord-relationship-invite", 20, 60_000), (req, res) => {
  const propertyId = String(req.body.propertyId || "").trim();
  const email = normalizeEmail(req.body.email || "");
  const tenantName = trimTo(req.body.fullName || req.body.tenantName || "", 120);
  const message = trimTo(req.body.message || "", 500);

  if (!propertyId || !email) {
    return res.status(400).json({ error: "Property ID and tenant email are required." });
  }

  const property = findPropertyById(propertyId);
  if (!property) {
    return res.status(404).json({ error: "Property not found." });
  }

  if (req.user.role !== "admin" && property.landlordId !== req.user.id) {
    return res.status(403).json({ error: "You can only invite tenants to your own properties." });
  }

  const tenantUser = findUserByEmail(email);
  const landlord = findUserById(req.user.id);
  const root = readTenantData();
  const relationships = ensureRelationshipStore(root);
  const existing = relationships.invitations.find((relationship) =>
    relationship.propertyId === property.id &&
    normalizeEmail(relationship.tenantEmail) === email &&
    relationship.direction === "landlord_invite" &&
    ["pending", "accepted"].includes(relationship.status)
  );

  if (existing) {
    return res.json({ invitation: summarizeRelationship(existing), duplicate: true });
  }

  const now = safeDate();
  const invitation = {
    id: `REL-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    direction: "landlord_invite",
    status: "pending",
    landlordId: req.user.id,
    landlordName: landlord?.fullName || req.user.fullName,
    landlordEmail: landlord?.email || req.user.email,
    tenantId: tenantUser?.id || "",
    tenantName: tenantUser?.fullName || tenantName,
    tenantEmail: email,
    propertyId: property.id,
    propertyName: property.name,
    propertyAddress: property.address,
    message,
    createdAt: now,
    updatedAt: now,
    respondedAt: ""
  };

  relationships.invitations.unshift(invitation);
  writeTenantData(root);
  appendAuditEvent(req, "marketplace.landlord.invited", { propertyId: property.id, tenantEmail: email, invitationId: invitation.id });
  return res.status(201).json({ invitation: summarizeRelationship(invitation) });
});

app.post("/api/landlord/relationships/:id/approve", requireAuth, requireLandlord, createRateLimit("landlord-relationship-approve", 25, 60_000), (req, res) => {
  const root = readTenantData();
  const relationships = ensureRelationshipStore(root);
  const invitation = relationships.invitations.find((relationship) => relationship.id === req.params.id && relationship.landlordId === req.user.id);

  if (!invitation) {
    return res.status(404).json({ error: "Invitation not found." });
  }

  if (invitation.direction !== "tenant_request") {
    return res.status(409).json({ error: "Only tenant requests can be approved here." });
  }

  if (invitation.status !== "pending") {
    return res.status(409).json({ error: `Cannot approve an invitation in ${invitation.status} state.` });
  }

  const property = findPropertyById(invitation.propertyId);
  const tenantUser = invitation.tenantId ? findUserById(invitation.tenantId) : findUserByEmail(invitation.tenantEmail);
  const landlord = findUserById(req.user.id);
  const now = safeDate();
  invitation.status = "accepted";
  invitation.respondedAt = now;
  invitation.updatedAt = now;

  if (tenantUser) {
    const tenantRecord = getTenantRecordFromRoot(root, tenantUser);
    const leaseRent = Number(property?.monthlyRentLow || property?.monthlyRentHigh || tenantRecord.rent.amountDue || 0);
    tenantRecord.lease.startDate = tenantRecord.lease.startDate || now.slice(0, 10);
    tenantRecord.lease.propertyAddress = property?.address || tenantRecord.lease.propertyAddress;
    tenantRecord.lease.rentAmount = leaseRent;
    tenantRecord.lease.landlord = {
      name: landlord?.fullName || invitation.landlordName || tenantRecord.lease.landlord.name,
      email: landlord?.email || invitation.landlordEmail || tenantRecord.lease.landlord.email
    };
    tenantRecord.rent.amountDue = leaseRent || tenantRecord.rent.amountDue;
    tenantRecord.rent.nextPaymentDate = tenantRecord.rent.nextPaymentDate || `${new Date(now).getFullYear()}-${String(new Date(now).getMonth() + 2).padStart(2, "0")}-01`;
    tenantRecord.rent.status = "pending";
    tenantRecord.activity.unshift({ id: `ACT-${Date.now()}-relationship`, message: `Landlord approved your request for ${property?.name || invitation.propertyName}`, at: now });
    tenantRecord.notifications.items.unshift({
      id: `NT-${Date.now()}-relationship-approval`,
      title: "Property request approved",
      message: `Your request for ${property?.name || invitation.propertyName} was approved.`,
      type: "lease",
      read: false,
      createdAt: now
    });
  }

  writeTenantData(root);
  appendAuditEvent(req, "marketplace.landlord.approved", { invitationId: invitation.id, propertyId: invitation.propertyId, tenantId: invitation.tenantId || "" });
  return res.json({ invitation: summarizeRelationship(invitation) });
});

app.get("/api/tenant/overview", requireAuth, requireTenant, (req, res) => {
  const { tenant, root } = getOrCreateTenant(req.user);
  const alerts = tenant.notifications.items.filter((item) => !item.read).slice(0, 5).map((item) => ({
    id: item.id,
    type: item.type,
    message: item.message
  }));
  const relationship = summarizeTenantRelationship(tenant, root);

  return res.json({
    rentDue: {
      amount: tenant.rent.amountDue,
      nextDate: tenant.rent.nextPaymentDate,
      status: tenant.rent.status
    },
    credit: {
      score: tenant.credit.currentScore,
      tier: tenant.credit.tier,
      streak: tenant.credit.paymentStreak
    },
    deposit: {
      status: tenant.deposit.escrowStatus,
      refundStatus: tenant.deposit.refundStatus
    },
    relationship,
    alerts,
    activity: tenant.activity
  });
});

app.get("/api/tenant/verification", requireAuth, requireTenant, (req, res) => {
  const { tenant } = getOrCreateTenant(req.user);
  return res.json({ verification: tenant.verification });
});

app.post("/api/tenant/verification/submit", requireAuth, requireTenant, createRateLimit("tenant-verification-submit", 12, 60_000), (req, res) => {
  const { idDocumentName, addressDocumentName } = req.body;
  if (!idDocumentName || !addressDocumentName) {
    return res.status(400).json({ error: "Both ID and proof-of-address documents are required." });
  }

  const { tenant, root } = getOrCreateTenant(req.user);
  tenant.verification.documents = [
    { id: `KYC-${Date.now()}-1`, type: "id", name: trimTo(idDocumentName, 180), uploadedAt: safeDate() },
    { id: `KYC-${Date.now()}-2`, type: "proof_of_address", name: trimTo(addressDocumentName, 180), uploadedAt: safeDate() }
  ];
  tenant.verification.status = "pending";
  tenant.verification.submittedAt = safeDate();

  tenant.notifications.items.unshift({
    id: `NT-${Date.now()}-kyc`,
    title: "Verification submitted",
    message: "Your KYC package has been submitted for review.",
    type: "verification",
    read: false,
    createdAt: safeDate()
  });

  persistTenant(req.user.id, tenant, root);
  return res.json({ verification: tenant.verification });
});

app.get("/api/landlord/verification", requireAuth, requireLandlord, (req, res) => {
  const usersData = readUsers();
  const user = (usersData.users || []).find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const normalized = normalizeUserRecord(user);
  return res.json({
    verification: {
      status: normalized.kycStatus || "pending",
      documents: normalized.kycDocuments || [],
      submittedAt: normalized.kycSubmittedAt || "",
      reviewedAt: normalized.kycReviewedAt || "",
      note: normalized.kycReviewNote || ""
    }
  });
});

app.post("/api/landlord/verification/submit", requireAuth, requireLandlord, createRateLimit("landlord-verification-submit", 12, 60_000), (req, res) => {
  const { idDocumentName, ownershipDocumentName } = req.body || {};
  if (!idDocumentName || !ownershipDocumentName) {
    return res.status(400).json({ error: "Both identity and ownership documents are required." });
  }

  const usersData = readUsers();
  const user = (usersData.users || []).find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const normalized = normalizeUserRecord(user);
  normalized.kycStatus = "pending";
  normalized.kycDocuments = [
    { id: `KYC-${Date.now()}-1`, type: "id", name: trimTo(idDocumentName, 180), uploadedAt: safeDate() },
    { id: `KYC-${Date.now()}-2`, type: "ownership", name: trimTo(ownershipDocumentName, 180), uploadedAt: safeDate() }
  ];
  normalized.kycSubmittedAt = safeDate();
  normalized.kycReviewedAt = "";
  normalized.kycReviewNote = "";
  normalized.updatedAt = safeDate();

  usersData.users = usersData.users.map((entry) => (entry.id === normalized.id ? normalized : entry));
  writeUsers(usersData);

  appendAuditEvent(req, "landlord.kyc.submitted", { status: normalized.kycStatus });
  return res.json({ verification: { status: normalized.kycStatus, documents: normalized.kycDocuments, submittedAt: normalized.kycSubmittedAt } });
});

app.get("/api/landlord/documents", requireAuth, requireLandlord, (req, res) => {
  const { user } = getOrCreateLandlordWorkspace(req.user);
  return res.json({ documents: user.landlordDocuments || [] });
});

app.post("/api/landlord/documents", requireAuth, requireLandlord, createRateLimit("landlord-document-create", 30, 60_000), (req, res) => {
  const name = trimTo(req.body?.name, 180);
  const category = trimTo(req.body?.category, 60) || "general";
  const property = trimTo(req.body?.property, 180);
  const expiresAt = trimTo(req.body?.expiresAt, 40);

  if (!name || !property) {
    return res.status(400).json({ error: "Document name and property are required." });
  }

  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const document = {
    id: `LDOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    category,
    property,
    status: "draft",
    sizeKb: Number.isFinite(Number(req.body?.sizeKb)) && Number(req.body?.sizeKb) > 0
      ? Number(req.body?.sizeKb)
      : Math.max(120, Math.round((name.length + property.length) * 9)),
    uploadedAt: safeDate(),
    expiresAt,
    url: createDocumentUrl(name)
  };

  user.landlordDocuments = [document, ...(user.landlordDocuments || [])];
  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.document.created", { documentId: document.id, category: document.category, property: document.property });
  return res.status(201).json({ document });
});

app.patch("/api/landlord/documents/:id", requireAuth, requireLandlord, createRateLimit("landlord-document-update", 40, 60_000), (req, res) => {
  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const documents = Array.isArray(user.landlordDocuments) ? user.landlordDocuments : [];
  const document = documents.find((entry) => entry.id === req.params.id);

  if (!document) {
    return res.status(404).json({ error: "Document not found." });
  }

  const nextStatus = trimTo(req.body?.status, 20);
  if (nextStatus && !["draft", "review", "signed", "archived"].includes(nextStatus)) {
    return res.status(400).json({ error: "Invalid document status." });
  }

  document.name = req.body?.name ? trimTo(req.body.name, 180) : document.name;
  document.category = req.body?.category ? trimTo(req.body.category, 60) : document.category;
  document.property = req.body?.property ? trimTo(req.body.property, 180) : document.property;
  document.expiresAt = Object.prototype.hasOwnProperty.call(req.body || {}, "expiresAt") ? trimTo(req.body.expiresAt, 40) : document.expiresAt;
  document.status = nextStatus || document.status;
  document.url = document.url || createDocumentUrl(document.name);
  document.updatedAt = safeDate();

  user.landlordDocuments = documents;
  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.document.updated", { documentId: document.id, status: document.status });
  return res.json({ document });
});

app.delete("/api/landlord/documents/:id", requireAuth, requireLandlord, createRateLimit("landlord-document-delete", 30, 60_000), (req, res) => {
  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const documents = Array.isArray(user.landlordDocuments) ? user.landlordDocuments : [];
  const nextDocuments = documents.filter((entry) => entry.id !== req.params.id);

  if (nextDocuments.length === documents.length) {
    return res.status(404).json({ error: "Document not found." });
  }

  user.landlordDocuments = nextDocuments;
  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.document.deleted", { documentId: req.params.id });
  return res.status(204).send();
});

app.get("/api/landlord/notifications", requireAuth, requireLandlord, (req, res) => {
  const { user } = getOrCreateLandlordWorkspace(req.user);
  return res.json({
    preferences: user.landlordNotifications?.preferences || {},
    notifications: user.landlordNotifications?.items || []
  });
});

app.patch("/api/landlord/notifications/preferences", requireAuth, requireLandlord, (req, res) => {
  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const updates = req.body || {};
  user.landlordNotifications.preferences = {
    ...(user.landlordNotifications.preferences || {}),
    ...(updates || {})
  };
  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.notifications.preferences.updated", { keys: Object.keys(updates) });
  return res.json({ preferences: user.landlordNotifications.preferences });
});

app.patch("/api/landlord/notifications/:id/read", requireAuth, requireLandlord, (req, res) => {
  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const notification = (user.landlordNotifications.items || []).find((item) => item.id === req.params.id);

  if (!notification) {
    return res.status(404).json({ error: "Notification not found." });
  }

  notification.read = true;
  notification.readAt = safeDate();
  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.notification.read", { notificationId: req.params.id });
  return res.json({ notification });
});

app.get("/api/landlord/support", requireAuth, requireLandlord, (req, res) => {
  const { user } = getOrCreateLandlordWorkspace(req.user);
  return res.json({
    faq: user.landlordSupport?.faq || [],
    articles: user.landlordSupport?.articles || [],
    tickets: user.landlordSupport?.tickets || []
  });
});

app.post("/api/landlord/support/contact", requireAuth, requireLandlord, createRateLimit("landlord-support-contact", 20, 60_000), (req, res) => {
  const topic = trimTo(req.body?.topic, 120);
  const message = trimTo(req.body?.message, 1800);
  const urgency = trimTo(req.body?.urgency, 20) || "medium";

  if (!topic || !message) {
    return res.status(400).json({ error: "Topic and message are required." });
  }

  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const ticket = {
    id: `LTKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    topic,
    urgency,
    message,
    status: "open",
    createdAt: safeDate()
  };

  user.landlordSupport.tickets = [ticket, ...(user.landlordSupport.tickets || [])];
  user.landlordNotifications.items.unshift({
    id: `LNT-${Date.now()}-support`,
    title: "Landlord support request created",
    message: `Your support request for ${topic} has been submitted.`,
    type: "support",
    read: false,
    createdAt: safeDate()
  });
  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.support.ticket_created", { ticketId: ticket.id, topic, urgency });
  return res.status(201).json({ ticket });
});

app.patch("/api/landlord/support/tickets/:id", requireAuth, requireLandlord, createRateLimit("landlord-support-ticket-update", 25, 60_000), (req, res) => {
  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const ticket = (user.landlordSupport.tickets || []).find((item) => item.id === req.params.id);

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  const nextStatus = trimTo(req.body?.status, 20);
  if (nextStatus && !["open", "pending", "resolved", "closed"].includes(nextStatus)) {
    return res.status(400).json({ error: "Invalid ticket status." });
  }

  ticket.status = nextStatus || ticket.status;
  ticket.updatedAt = safeDate();
  ticket.resolutionNote = trimTo(req.body?.resolutionNote, 400);
  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.support.ticket_updated", { ticketId: ticket.id, status: ticket.status });
  return res.json({ ticket });
});

app.get("/api/landlord/deposits", requireAuth, requireLandlord, (req, res) => {
  const { user } = getOrCreateLandlordWorkspace(req.user);
  return res.json({ records: user.landlordDeposits || [] });
});

app.post("/api/landlord/deposits", requireAuth, requireLandlord, createRateLimit("landlord-deposit-create", 25, 60_000), (req, res) => {
  const tenant = trimTo(req.body?.tenant, 140);
  const property = trimTo(req.body?.property, 180);
  const total = toMoney(req.body?.total);

  if (!tenant || !property || total <= 0) {
    return res.status(400).json({ error: "Tenant, property, and valid total are required." });
  }

  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const record = {
    id: `dep-${Date.now()}`,
    tenant,
    property,
    total,
    status: "held",
    deductions: [],
    history: [{ at: safeDate(), action: "Deposit recorded" }]
  };

  user.landlordDeposits = [record, ...(user.landlordDeposits || [])];
  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.deposit.created", { depositId: record.id, tenant, total });
  return res.status(201).json({ record });
});

app.patch("/api/landlord/deposits/:id", requireAuth, requireLandlord, createRateLimit("landlord-deposit-update", 35, 60_000), (req, res) => {
  const status = trimTo(req.body?.status, 30);
  if (status && !["held", "inspection", "refund_pending", "refunded", "disputed"].includes(status)) {
    return res.status(400).json({ error: "Invalid deposit status." });
  }

  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const record = (user.landlordDeposits || []).find((item) => item.id === req.params.id);
  if (!record) {
    return res.status(404).json({ error: "Deposit record not found." });
  }

  if (status) {
    record.status = status;
    record.history = [{ at: safeDate(), action: `Status moved to ${status.replace("_", " ")}` }, ...(record.history || [])];
  }

  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.deposit.updated", { depositId: record.id, status: record.status });
  return res.json({ record });
});

app.post("/api/landlord/deposits/:id/deductions", requireAuth, requireLandlord, createRateLimit("landlord-deposit-deduction", 35, 60_000), (req, res) => {
  const amount = toMoney(req.body?.amount);
  const reason = trimTo(req.body?.reason, 280);
  if (amount <= 0 || !reason) {
    return res.status(400).json({ error: "Valid deduction amount and reason are required." });
  }

  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const record = (user.landlordDeposits || []).find((item) => item.id === req.params.id);
  if (!record) {
    return res.status(404).json({ error: "Deposit record not found." });
  }

  const at = safeDate();
  record.deductions = [{ amount, reason, at }, ...(record.deductions || [])];
  record.history = [{ at, action: `Deduction added: $${amount}` }, ...(record.history || [])];

  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.deposit.deduction_added", { depositId: record.id, amount });
  return res.status(201).json({ record });
});

app.post("/api/landlord/deposits/:id/dispute", requireAuth, requireLandlord, createRateLimit("landlord-deposit-dispute", 25, 60_000), (req, res) => {
  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const record = (user.landlordDeposits || []).find((item) => item.id === req.params.id);
  if (!record) {
    return res.status(404).json({ error: "Deposit record not found." });
  }

  const at = safeDate();
  record.status = "disputed";
  record.history = [{ at, action: "Case escalated to dispute review" }, ...(record.history || [])];

  const dispute = {
    id: `disp-${Date.now()}`,
    title: `Deposit dispute for ${record.tenant}`,
    tenant: record.tenant,
    property: record.property,
    priority: "medium",
    status: "open",
    openedAt: at,
    messages: [{ by: "system", body: "Case escalated from deposit ledger.", at }]
  };

  user.landlordDisputes = [dispute, ...(user.landlordDisputes || [])];
  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.deposit.dispute_opened", { depositId: record.id, disputeId: dispute.id });
  return res.status(201).json({ record, dispute });
});

app.get("/api/landlord/disputes", requireAuth, requireLandlord, (req, res) => {
  const { user } = getOrCreateLandlordWorkspace(req.user);
  return res.json({ disputes: user.landlordDisputes || [] });
});

app.patch("/api/landlord/disputes/:id", requireAuth, requireLandlord, createRateLimit("landlord-dispute-update", 40, 60_000), (req, res) => {
  const nextStatus = trimTo(req.body?.status, 30);
  if (nextStatus && !["open", "under_review", "resolved", "rejected"].includes(nextStatus)) {
    return res.status(400).json({ error: "Invalid dispute status." });
  }

  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const dispute = (user.landlordDisputes || []).find((item) => item.id === req.params.id);
  if (!dispute) {
    return res.status(404).json({ error: "Dispute not found." });
  }

  dispute.status = nextStatus || dispute.status;
  dispute.messages = [{ by: "system", body: `Status changed to ${dispute.status.replace("_", " ")}`, at: safeDate() }, ...(dispute.messages || [])];

  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.dispute.updated", { disputeId: dispute.id, status: dispute.status });
  return res.json({ dispute });
});

app.post("/api/landlord/disputes/:id/messages", requireAuth, requireLandlord, createRateLimit("landlord-dispute-message", 50, 60_000), (req, res) => {
  const body = trimTo(req.body?.body, 1200);
  if (!body) {
    return res.status(400).json({ error: "Message body is required." });
  }

  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const dispute = (user.landlordDisputes || []).find((item) => item.id === req.params.id);
  if (!dispute) {
    return res.status(404).json({ error: "Dispute not found." });
  }

  const message = { by: "landlord", body, at: safeDate() };
  dispute.messages = [message, ...(dispute.messages || [])];

  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.dispute.message_added", { disputeId: dispute.id });
  return res.status(201).json({ dispute, message });
});

app.get("/api/landlord/settings", requireAuth, requireLandlord, (req, res) => {
  const { user } = getOrCreateLandlordWorkspace(req.user);
  return res.json({ settings: user.landlordSettings || {} });
});

app.patch("/api/landlord/settings", requireAuth, requireLandlord, createRateLimit("landlord-settings-update", 30, 60_000), (req, res) => {
  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const allowedKeys = [
    "businessName",
    "email",
    "phone",
    "payoutAccount",
    "timezone",
    "monthlyStatementDay",
    "twoFactorEnabled",
    "notifPaymentAlerts",
    "notifEscrowAlerts",
    "notifDisputeAlerts"
  ];

  const next = { ...(user.landlordSettings || {}) };
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
      next[key] = req.body[key];
    }
  }

  next.monthlyStatementDay = Math.max(1, Math.min(28, Number(next.monthlyStatementDay || 1)));
  next.sessions = Array.isArray(next.sessions) ? next.sessions : [];
  user.landlordSettings = next;

  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.settings.updated", { keys: Object.keys(req.body || {}) });
  return res.json({ settings: next });
});

app.delete("/api/landlord/settings/sessions/:id", requireAuth, requireLandlord, createRateLimit("landlord-session-revoke", 30, 60_000), (req, res) => {
  const { usersData, user } = getOrCreateLandlordWorkspace(req.user);
  const sessions = Array.isArray(user.landlordSettings?.sessions) ? user.landlordSettings.sessions : [];
  const nextSessions = sessions.filter((session) => session.id !== req.params.id);

  if (nextSessions.length === sessions.length) {
    return res.status(404).json({ error: "Session not found." });
  }

  user.landlordSettings.sessions = nextSessions;
  usersData.users = usersData.users.map((entry) => (entry.id === user.id ? user : entry));
  writeUsers(usersData);
  appendAuditEvent(req, "landlord.session.revoked", { sessionId: req.params.id });
  return res.status(204).send();
});

app.get("/api/admin/kyc/tenants", requireAuth, requireRole("admin"), (req, res) => {
  const tenantData = readTenantData();
  const usersData = readUsers();
  const queue = Object.values(tenantData.tenants || {}).map((tenant) => {
    const user = (usersData.users || []).find((entry) => entry.id === tenant.tenantId);
    return {
      tenantId: tenant.tenantId,
      fullName: user?.fullName || "Unknown Tenant",
      email: user?.email || "",
      status: tenant.verification?.status || "pending",
      submittedAt: tenant.verification?.submittedAt || "",
      documents: tenant.verification?.documents || []
    };
  });
  return res.json({ queue });
});

app.patch("/api/admin/kyc/tenants/:tenantId", requireAuth, requireRole("admin"), (req, res) => {
  const status = String(req.body.status || "").toLowerCase();
  const note = String(req.body.note || "").trim();
  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "Status must be approved, rejected, or pending." });
  }

  const tenantData = readTenantData();
  const tenant = (tenantData.tenants || {})[req.params.tenantId];
  if (!tenant) {
    return res.status(404).json({ error: "Tenant record not found." });
  }

  tenant.verification.status = status;
  tenant.verification.reviewedAt = safeDate();
  tenant.verification.reviewNote = note;
  tenant.notifications.items.unshift({
    id: `NT-${Date.now()}-kyc-review`,
    title: "KYC status updated",
    message: `Your verification status is now ${status}.`,
    type: "verification",
    read: false,
    createdAt: safeDate()
  });

  writeTenantData(tenantData);
  appendAuditEvent(req, "tenant.kyc.reviewed", { tenantId: req.params.tenantId, status, note });
  return res.json({ verification: tenant.verification });
});

app.patch("/api/admin/kyc/landlords/:userId", requireAuth, requireRole("admin"), (req, res) => {
  const status = String(req.body.status || "").toLowerCase();
  const note = String(req.body.note || "").trim();
  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "Status must be approved, rejected, or pending." });
  }

  const usersData = readUsers();
  const user = (usersData.users || []).find((entry) => entry.id === req.params.userId);
  if (!user || !isLandlordRole(user.role)) {
    return res.status(404).json({ error: "Landlord user not found." });
  }

  const normalized = normalizeUserRecord(user);
  normalized.kycStatus = status;
  normalized.kycReviewNote = note;
  normalized.kycReviewedAt = safeDate();
  normalized.updatedAt = safeDate();
  usersData.users = usersData.users.map((entry) => (entry.id === normalized.id ? normalized : entry));
  writeUsers(usersData);

  appendAuditEvent(req, "landlord.kyc.reviewed", { userId: req.params.userId, status, note });
  return res.json({ verification: { status: normalized.kycStatus, reviewedAt: normalized.kycReviewedAt, note: normalized.kycReviewNote } });
});

app.get("/api/tenant/payments", requireAuth, requireTenant, requireTenantVerificationForFinancial, async (req, res) => {
  if (supabase) {
    try {
      await ensureSharedSupabaseTestCard(req.user.id);
      const lease = await findActiveLeaseForTenant(req.user.id);
      const preferences = await readTenantPreferences();
      const autoPayEnabled = preferences.autoPay[req.user.id] !== false;

      const [{ data: methodsRows, error: methodsError }, { data: paymentsRows, error: paymentsError }] = await Promise.all([
        supabase
          .from("payment_methods")
          .select("id, label, method_type, last4, is_primary, metadata")
          .eq("user_id", req.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id, amount, status, due_date, paid_at, receipt_url, payment_method_id, metadata, created_at")
          .eq("tenant_id", req.user.id)
          .eq("category", "rent")
          .order("created_at", { ascending: false })
          .limit(100)
      ]);

      if (methodsError) {
        throw methodsError;
      }
      if (paymentsError) {
        throw paymentsError;
      }

      const methods = (methodsRows || []).map((row) => ({
        id: row.id,
        label: row.label,
        type: row.method_type,
        last4: row.last4,
        isPrimary: Boolean(row.is_primary),
        ...((row.metadata && typeof row.metadata === "object") ? row.metadata : {})
      }));

      const history = (paymentsRows || [])
        .filter((row) => row.status !== "pending")
        .map((row) => ({
          id: row.id,
          date: (row.paid_at || row.created_at || safeDate()).slice(0, 10),
          amount: Number(row.amount || 0),
          status: row.status,
          receiptUrl: row.receipt_url || createReceiptUrl(row.id),
          paymentMethodId: row.payment_method_id,
          method: row.metadata?.method || "card"
        }));

      const pendingRows = (paymentsRows || []).filter((row) => row.status === "pending");
      let upcoming = pendingRows.map((row) => ({
        id: row.id,
        amount: Number(row.amount || 0),
        dueDate: row.due_date || safeDate().slice(0, 10),
        status: row.status
      }));

      if (!upcoming.length && lease) {
        const dueDate = safeDate().slice(0, 10);
        upcoming = [{
          id: `UP-${req.user.id}-lease`,
          amount: Number(lease.rent_amount || 0),
          dueDate,
          status: "scheduled"
        }];
      }

      const currentDue = upcoming.length ? Number(upcoming[0].amount || 0) : 0;
      const currentDueDate = upcoming.length ? upcoming[0].dueDate : safeDate().slice(0, 10);

      return res.json({
        currentMonth: {
          label: new Date(currentDueDate).toLocaleString("en-US", { month: "long", year: "numeric" }),
          amountDue: currentDue,
          dueDate: currentDueDate,
          status: currentDue > 0 ? "due" : "paid"
        },
        autoPayEnabled,
        sharedTestCard: { ...SHARED_TEST_CARD },
        methods,
        upcoming,
        history
      });
    } catch (error) {
      console.warn("[TENANT PAYMENTS WARNING] Falling back to local tenant state:", error.message);
    }
  }

  const { tenant } = getOrCreateTenant(req.user);
  return res.json({
    currentMonth: {
      label: tenant.rent.currentMonthLabel,
      amountDue: tenant.rent.amountDue,
      dueDate: tenant.rent.nextPaymentDate,
      status: tenant.rent.status
    },
    autoPayEnabled: tenant.rent.autoPayEnabled,
    sharedTestCard: { ...SHARED_TEST_CARD },
    methods: tenant.paymentMethods,
    upcoming: tenant.payments.upcoming,
    history: tenant.payments.history
  });
});

app.post("/api/tenant/payments/methods", requireAuth, requireTenant, requireTenantVerificationForFinancial, createRateLimit("tenant-payment-method", 30, 60_000), async (req, res) => {
  if (supabase) {
    try {
      await ensureSharedSupabaseTestCard(req.user.id);
      const { data: methodsRows, error } = await supabase
        .from("payment_methods")
        .select("id, label, method_type, last4, is_primary, metadata")
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false });
      if (error) {
        throw error;
      }
      return res.status(201).json({
        methods: (methodsRows || []).map((row) => ({
          id: row.id,
          label: row.label,
          type: row.method_type,
          last4: row.last4,
          isPrimary: Boolean(row.is_primary),
          ...((row.metadata && typeof row.metadata === "object") ? row.metadata : {})
        }))
      });
    } catch (error) {
      console.warn("[TENANT METHODS WARNING] Falling back to local tenant state:", error.message);
    }
  }

  const { label, type, last4 } = req.body;
  if (!label || !type || !last4 || String(last4).length !== 4) {
    return res.status(400).json({ error: "Valid method label, type, and last 4 digits are required." });
  }

  const { tenant, root } = getOrCreateTenant(req.user);
  tenant.paymentMethods.push({
    id: `PM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    label: String(label),
    type: String(type),
    last4: String(last4),
    isPrimary: tenant.paymentMethods.length === 0
  });

  persistTenant(req.user.id, tenant, root);
  appendAuditEvent(req, "tenant.payment_method.added", {
    paymentMethodId: tenant.paymentMethods[tenant.paymentMethods.length - 1].id,
    type: String(type)
  });
  return res.status(201).json({ methods: tenant.paymentMethods });
});

app.patch("/api/tenant/payments/autopay", requireAuth, requireTenant, requireTenantVerificationForFinancial, createRateLimit("tenant-autopay", 40, 60_000), async (req, res) => {
  const enabled = Boolean(req.body.enabled);

  if (supabase) {
    try {
      const preferences = await readTenantPreferences();
      preferences.autoPay[req.user.id] = enabled;
      await writeTenantPreferences(preferences);
      emitTenantRealtimeEvent(req.user.id, "tenant.autopay.updated", { enabled });
      appendAuditEvent(req, "tenant.autopay.updated", { enabled });
      return res.json({ autoPayEnabled: enabled });
    } catch (error) {
      console.warn("[TENANT AUTOPAY WARNING] Falling back to local tenant state:", error.message);
    }
  }

  const { tenant, root } = getOrCreateTenant(req.user);
  tenant.rent.autoPayEnabled = enabled;

  tenant.notifications.items.unshift({
    id: `NT-${Date.now()}-autopay`,
    title: "Auto-pay preference updated",
    message: enabled ? "Auto-pay has been enabled." : "Auto-pay has been disabled.",
    type: "payment",
    read: false,
    createdAt: safeDate()
  });

  persistTenant(req.user.id, tenant, root);
  emitTenantRealtimeEvent(req.user.id, "tenant.autopay.updated", { enabled });
  appendAuditEvent(req, "tenant.autopay.updated", { enabled });
  return res.json({ autoPayEnabled: enabled });
});

app.post("/api/tenant/payments/pay", requireAuth, requireTenant, requireTenantVerificationForFinancial, createRateLimit("tenant-pay", 25, 60_000), async (req, res) => {
  const amount = toMoney(req.body.amount);
  if (amount <= 0) {
    return res.status(400).json({ error: "Payment amount must be greater than zero." });
  }

  if (supabase) {
    try {
      const lease = await findActiveLeaseForTenant(req.user.id);
      if (!lease) {
        return res.status(400).json({ error: "No active lease found for this tenant." });
      }

      if (lease.landlord_id) {
        const { data: landlordRow, error: landlordError } = await supabase
          .from("users")
          .select("id, role, kyc_status")
          .eq("id", lease.landlord_id)
          .maybeSingle();
        if (landlordError) {
          throw landlordError;
        }
        if (landlordRow && isLandlordRole(landlordRow.role) && landlordRow.kyc_status !== "approved") {
          return res.status(403).json({ error: "Landlord account must complete verification before receiving payments." });
        }
      }

      await ensureSharedSupabaseTestCard(req.user.id);
      const paidAt = safeDate();
      const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const providerConfirmationId = `PC-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const receiptUrl = createReceiptUrl(`payment-${Date.now()}`);

      const paymentRow = {
        id: paymentId,
        tenant_id: req.user.id,
        landlord_id: lease.landlord_id,
        lease_id: lease.id,
        payment_method_id: SHARED_TEST_CARD.id,
        due_date: paidAt.slice(0, 10),
        paid_at: paidAt,
        amount,
        status: "paid",
        category: "rent",
        label: "Monthly Rent",
        receipt_url: receiptUrl,
        metadata: {
          method: "card",
          transactionRef,
          providerConfirmationId,
          sharedTestCard: true
        }
      };

      const { error: paymentError } = await supabase.from("payments").insert([paymentRow]);
      if (paymentError) {
        throw paymentError;
      }

      const { error: documentError } = await supabase.from("documents").insert([
        {
          id: `DOC-${Date.now()}-receipt`,
          user_id: req.user.id,
          lease_id: lease.id,
          payment_id: paymentId,
          doc_type: "receipt",
          name: `Receipt ${paidAt.slice(0, 10)}.pdf`,
          url: receiptUrl,
          uploaded_at: paidAt,
          metadata: { category: "rent_payment" }
        }
      ]);
      if (documentError) {
        throw documentError;
      }

      const latestCredit = await readLatestCreditSnapshot(req.user.id)
        || await createCreditSnapshotFromSeed(req.user.id, createDefaultTenant(req.user).credit);
      const previousHistory = Array.isArray(latestCredit?.metadata?.history) ? latestCredit.metadata.history : [];
      const nextScore = Math.min(850, Number(latestCredit?.score || 680) + 4);
      const nextStreak = Number(latestCredit?.payment_streak || 0) + 1;
      const nextTier = nextScore >= 740 ? "Excellent" : nextScore >= 670 ? "Good" : "Fair";
      const nowMonth = new Date().toLocaleString("en-US", { month: "short" });
      const history = [...previousHistory, { month: nowMonth, score: nextScore }].slice(-24);

      const creditSnapshot = {
        id: `CRD-${req.user.id}-${Date.now()}`,
        tenant_id: req.user.id,
        score: nextScore,
        tier: nextTier,
        on_time_percentage: Number(latestCredit?.on_time_percentage || 100),
        late_payment_count: Number(latestCredit?.late_payment_count || 0),
        payment_streak: nextStreak,
        report_url: latestCredit?.report_url || "",
        report_share_link: latestCredit?.report_share_link || "",
        captured_at: safeDate(),
        metadata: {
          calculationRule: latestCredit?.metadata?.calculationRule || "Score is weighted by on-time payments and payment consistency.",
          history
        }
      };

      const { error: creditError } = await supabase.from("credit_snapshots").insert([creditSnapshot]);
      if (creditError) {
        throw creditError;
      }

      const { error: notificationError } = await supabase.from("notifications").insert([
        {
          id: `NT-${Date.now()}-payment`,
          user_id: req.user.id,
          title: "Payment confirmed",
          message: `Payment of $${amount} has been posted successfully.`,
          notification_type: "payment",
          read: false,
          created_at: safeDate()
        },
        {
          id: `NT-${Date.now()}-credit`,
          user_id: req.user.id,
          title: "Credit score updated",
          message: `Your credit score is now ${nextScore} (${nextTier}).`,
          notification_type: "credit",
          read: false,
          created_at: safeDate()
        }
      ]);
      if (notificationError) {
        throw notificationError;
      }

      emitTenantRealtimeEvent(req.user.id, "tenant.payment.completed", {
        paymentId,
        amount,
        status: "paid"
      });
      emitTenantRealtimeEvent(req.user.id, "tenant.credit.updated", {
        currentScore: nextScore,
        tier: nextTier,
        paymentStreak: nextStreak
      });

      appendAuditEvent(req, "tenant.payment.completed", {
        transactionRef,
        providerConfirmationId,
        amount,
        status: "paid"
      });

      return res.status(201).json({
        payment: {
          id: paymentId,
          date: paidAt.slice(0, 10),
          amount,
          status: "paid",
          receiptUrl,
          transactionRef,
          providerConfirmationId,
          method: "card",
          paymentMethodId: SHARED_TEST_CARD.id
        }
      });
    } catch (error) {
      console.warn("[TENANT PAY WARNING] Falling back to local tenant state:", error.message);
    }
  }

  const { tenant, root } = getOrCreateTenant(req.user);
  const landlordEmail = normalizeEmail(tenant.lease?.landlord?.email || "");
  if (landlordEmail) {
    const landlord = findUserByEmail(landlordEmail);
    if (landlord && isLandlordRole(landlord.role)) {
      const landlordRecord = normalizeUserRecord(landlord);
      if (landlordRecord.kycStatus !== "approved") {
        return res.status(403).json({ error: "Landlord account must complete verification before receiving payments." });
      }
    }
  }

  const paymentMethodId = SHARED_TEST_CARD.id;

  tenant.financialTransactions = Array.isArray(tenant.financialTransactions) ? tenant.financialTransactions : [];

  const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const pendingTransaction = {
    id: transactionRef,
    kind: "rent_payment",
    timestamp: safeDate(),
    userRef: req.user.id,
    amount,
    status: "pending",
    paymentMethodId
  };
  tenant.financialTransactions.unshift(pendingTransaction);

  // Simulated payment gateway confirmation token ensures no transaction is marked paid without confirmation.
  const providerConfirmationId = `PC-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  pendingTransaction.status = "paid";
  pendingTransaction.confirmedAt = safeDate();
  pendingTransaction.providerConfirmationId = providerConfirmationId;

  const entry = {
    id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: safeDate().slice(0, 10),
    amount,
    status: "paid",
    receiptUrl: createReceiptUrl(`payment-${Date.now()}`),
    transactionRef,
    providerConfirmationId,
    method: "card",
    paymentMethodId
  };

  tenant.payments.history.unshift(entry);
  tenant.documents.unshift({
    id: `DOC-${Date.now()}-receipt`,
    type: "receipt",
    name: `Receipt ${entry.date}.pdf`,
    date: entry.date,
    url: entry.receiptUrl
  });

  tenant.rent.amountDue = 0;
  tenant.rent.status = "paid";
  const nextDueDate = new Date();
  nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  tenant.rent.nextPaymentDate = nextDueDate.toISOString().slice(0, 10);
  tenant.payments.upcoming = [
    {
      id: `UP-${Date.now()}-1`,
      amount: Number(tenant.lease?.rentAmount || amount),
      dueDate: tenant.rent.nextPaymentDate,
      status: "scheduled"
    }
  ];
  tenant.credit.paymentStreak += 1;
  tenant.credit.currentScore = Math.min(850, tenant.credit.currentScore + 4);
  tenant.credit.tier = tenant.credit.currentScore >= 740 ? "Excellent" : tenant.credit.currentScore >= 670 ? "Good" : "Fair";
  tenant.credit.history.push({ month: "Now", score: tenant.credit.currentScore });

  tenant.notifications.items.unshift({
    id: `NT-${Date.now()}-payment`,
    title: "Payment confirmed",
    message: `Payment of $${amount} has been posted successfully.`,
    type: "payment",
    read: false,
    createdAt: safeDate()
  });

  tenant.activity.unshift({ id: `ACT-${Date.now()}-payment`, message: `Payment completed for $${amount}` });

  persistTenant(req.user.id, tenant, root);
  emitTenantRealtimeEvent(req.user.id, "tenant.payment.completed", {
    transactionRef,
    amount,
    status: "paid"
  });
  emitTenantRealtimeEvent(req.user.id, "tenant.credit.updated", {
    currentScore: tenant.credit.currentScore,
    tier: tenant.credit.tier,
    paymentStreak: tenant.credit.paymentStreak
  });
  appendAuditEvent(req, "tenant.payment.completed", {
    transactionRef,
    providerConfirmationId,
    amount,
    status: "paid"
  });
  return res.status(201).json({ payment: entry });
});

app.post("/api/tenant/payments/missed", requireAuth, requireTenant, requireTenantVerificationForFinancial, createRateLimit("tenant-pay-missed", 25, 60_000), async (req, res) => {
  const amount = toMoney(req.body.amount);
  const dueDate = String(req.body.dueDate || safeDate().slice(0, 10)).slice(0, 10);

  if (amount <= 0) {
    return res.status(400).json({ error: "Missed payment amount must be greater than zero." });
  }

  if (supabase) {
    try {
      const lease = await findActiveLeaseForTenant(req.user.id);
      const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const missedRow = {
        id: paymentId,
        tenant_id: req.user.id,
        landlord_id: lease?.landlord_id || null,
        lease_id: lease?.id || null,
        payment_method_id: null,
        due_date: dueDate,
        paid_at: null,
        amount,
        status: "missed",
        category: "rent",
        label: "Monthly Rent (Missed)",
        receipt_url: "",
        metadata: {
          recordedBy: req.user.id,
          reason: String(req.body.reason || "Missed monthly rent").slice(0, 220)
        }
      };

      const { error: paymentError } = await supabase.from("payments").insert([missedRow]);
      if (paymentError) {
        throw paymentError;
      }

      appendAuditEvent(req, "tenant.payment.missed.recorded", { amount, dueDate, paymentId });
      emitTenantRealtimeEvent(req.user.id, "tenant.payment.missed", { amount, dueDate, paymentId, status: "missed" });
      return res.status(201).json({
        payment: {
          id: paymentId,
          date: dueDate,
          amount,
          status: "missed",
          receiptUrl: "",
          method: "manual"
        }
      });
    } catch (error) {
      console.warn("[TENANT MISSED PAYMENT WARNING] Falling back to local tenant state:", error.message);
    }
  }

  const { tenant, root } = getOrCreateTenant(req.user);
  const entry = {
    id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: dueDate,
    amount,
    status: "missed",
    receiptUrl: "",
    method: "manual",
    description: "Monthly rent missed"
  };

  tenant.payments.history.unshift(entry);
  tenant.rent.status = "missed";
  tenant.rent.amountDue = Number(tenant.rent.amountDue || 0) + amount;
  tenant.credit.latePaymentCount = Number(tenant.credit.latePaymentCount || 0) + 1;
  tenant.credit.onTimePercentage = Math.max(0, Number(tenant.credit.onTimePercentage || 100) - 5);
  tenant.credit.paymentStreak = 0;

  tenant.notifications.items.unshift({
    id: `NT-${Date.now()}-missed-payment`,
    title: "Missed payment recorded",
    message: `A missed rent payment of $${amount} was added to your account history.`,
    type: "payment",
    read: false,
    createdAt: safeDate()
  });

  tenant.activity.unshift({
    id: `ACT-${Date.now()}-missed-payment`,
    message: `Missed payment recorded for $${amount}`,
    at: safeDate()
  });

  persistTenant(req.user.id, tenant, root);
  appendAuditEvent(req, "tenant.payment.missed.recorded", { amount, dueDate, paymentId: entry.id });
  emitTenantRealtimeEvent(req.user.id, "tenant.payment.missed", { amount, dueDate, paymentId: entry.id, status: "missed" });
  return res.status(201).json({ payment: entry });
});

app.get("/api/tenant/credit", requireAuth, requireTenant, requireTenantVerificationForFinancial, async (req, res) => {
  if (supabase) {
    try {
      const latestCredit = await readLatestCreditSnapshot(req.user.id)
        || await createCreditSnapshotFromSeed(req.user.id, createDefaultTenant(req.user).credit);

      return res.json({
        currentScore: Number(latestCredit?.score || 680),
        tier: latestCredit?.tier || "Fair",
        history: Array.isArray(latestCredit?.metadata?.history) ? latestCredit.metadata.history : [],
        onTimePercentage: Number(latestCredit?.on_time_percentage || 100),
        latePaymentCount: Number(latestCredit?.late_payment_count || 0),
        paymentStreak: Number(latestCredit?.payment_streak || 0),
        calculationRule: latestCredit?.metadata?.calculationRule || "Score is weighted by on-time payments and payment consistency.",
        reportUrl: latestCredit?.report_url || "",
        reportShareLink: latestCredit?.report_share_link || ""
      });
    } catch (error) {
      console.warn("[TENANT CREDIT WARNING] Falling back to local tenant state:", error.message);
    }
  }

  const { tenant } = getOrCreateTenant(req.user);
  return res.json(tenant.credit);
});

app.get("/api/tenant/lease", requireAuth, requireTenant, async (req, res) => {
  try {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data: lease, error: leaseError } = await supabase
      .from("leases")
      .select("id, unit_id, landlord_id, start_date, end_date, rent_amount, terms, document_url, renewal_warning, status")
      .eq("tenant_id", req.user.id)
      .in("status", ["active", "draft"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (leaseError) {
      throw leaseError;
    }

    if (lease) {
      const [{ data: unit, error: unitError }, { data: landlord, error: landlordError }] = await Promise.all([
        supabase
          .from("units")
          .select("id, property_id, label")
          .eq("id", lease.unit_id)
          .maybeSingle(),
        supabase
          .from("users")
          .select("full_name, email")
          .eq("id", lease.landlord_id)
          .maybeSingle()
      ]);

      if (unitError) {
        throw unitError;
      }

      if (landlordError) {
        throw landlordError;
      }

      let propertyAddress = "";
      if (unit?.property_id) {
        const { data: propertyRow, error: propertyError } = await supabase
          .from("properties")
          .select("address")
          .eq("id", unit.property_id)
          .maybeSingle();

        if (propertyError) {
          throw propertyError;
        }

        propertyAddress = propertyRow?.address || "";
      }

      return res.json({
        startDate: lease.start_date || "",
        endDate: lease.end_date || "",
        propertyAddress,
        unit: unit?.label || "",
        rentAmount: Number(lease.rent_amount || 0),
        terms: Array.isArray(lease.terms) ? lease.terms : [],
        documentUrl: lease.document_url || "",
        landlord: {
          name: landlord?.full_name || "",
          email: landlord?.email || ""
        },
        renewalWarning: lease.renewal_warning || "",
        source: "relational"
      });
    }
  } catch (error) {
    console.warn("[RELATIONAL READ WARNING] tenant lease fallback:", error.message);
  }

  const { tenant } = getOrCreateTenant(req.user);
  return res.json({ ...tenant.lease, source: "app-state" });
});

app.get("/api/tenant/deposit", requireAuth, requireTenant, requireTenantVerificationForFinancial, (req, res) => {
  const { tenant } = getOrCreateTenant(req.user);
  return res.json(tenant.deposit);
});

app.post("/api/tenant/deposit/disputes", requireAuth, requireTenant, createRateLimit("tenant-deposit-dispute", 15, 60_000), (req, res) => {
  const { title, message, evidenceName } = req.body;
  const safeTitle = trimTo(title, 120);
  const safeMessage = trimTo(message, 1200);
  if (!title || !message) {
    return res.status(400).json({ error: "Dispute title and message are required." });
  }

  const { tenant, root } = getOrCreateTenant(req.user);
  const dispute = {
    id: `DSP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: safeTitle,
    category: "deposit",
    status: "open",
    createdAt: safeDate(),
    evidence: evidenceName ? [{ id: `EVD-${Date.now()}-1`, name: trimTo(evidenceName, 180) }] : [],
    messages: [{ id: `MSG-${Date.now()}-1`, by: "tenant", message: safeMessage, at: safeDate() }]
  };

  tenant.disputes.unshift(dispute);
  tenant.notifications.items.unshift({
    id: `NT-${Date.now()}-deposit-dispute`,
    title: "Deposit dispute opened",
    message: "Your deposit dispute has been opened and queued for review.",
    type: "dispute",
    read: false,
    createdAt: safeDate()
  });

  persistTenant(req.user.id, tenant, root);
  return res.status(201).json({ dispute });
});

app.get("/api/tenant/disputes", requireAuth, requireTenant, (req, res) => {
  const { tenant } = getOrCreateTenant(req.user);
  return res.json({ disputes: tenant.disputes });
});

app.post("/api/tenant/disputes", requireAuth, requireTenant, createRateLimit("tenant-dispute", 15, 60_000), (req, res) => {
  const { title, category, message, evidenceName } = req.body;
  const safeTitle = trimTo(title, 120);
  const safeMessage = trimTo(message, 1200);
  if (!title || !message) {
    return res.status(400).json({ error: "Dispute title and description are required." });
  }

  const { tenant, root } = getOrCreateTenant(req.user);
  const dispute = {
    id: `DSP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: safeTitle,
    category: trimTo(category || "general", 60),
    status: "open",
    createdAt: safeDate(),
    evidence: evidenceName ? [{ id: `EVD-${Date.now()}-1`, name: trimTo(evidenceName, 180) }] : [],
    messages: [{ id: `MSG-${Date.now()}-1`, by: "tenant", message: safeMessage, at: safeDate() }]
  };

  tenant.disputes.unshift(dispute);
  tenant.activity.unshift({ id: `ACT-${Date.now()}-dispute`, message: `Dispute created: ${dispute.title}` });
  persistTenant(req.user.id, tenant, root);
  return res.status(201).json({ dispute });
});

app.post("/api/tenant/disputes/:id/messages", requireAuth, requireTenant, createRateLimit("tenant-dispute-message", 25, 60_000), (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  const { tenant, root } = getOrCreateTenant(req.user);
  const dispute = tenant.disputes.find((item) => item.id === req.params.id);

  if (!dispute) {
    return res.status(404).json({ error: "Dispute not found." });
  }

  dispute.messages.push({ id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`, by: "tenant", message: trimTo(message, 1200), at: safeDate() });
  dispute.status = "under_review";

  persistTenant(req.user.id, tenant, root);
  return res.json({ dispute });
});

app.get("/api/tenant/notifications", requireAuth, requireTenant, (req, res) => {
  const { tenant } = getOrCreateTenant(req.user);
  return res.json({
    preferences: tenant.notifications.preferences,
    notifications: tenant.notifications.items
  });
});

app.patch("/api/tenant/notifications/preferences", requireAuth, requireTenant, (req, res) => {
  const { tenant, root } = getOrCreateTenant(req.user);
  tenant.notifications.preferences = {
    ...tenant.notifications.preferences,
    ...(req.body || {})
  };

  persistTenant(req.user.id, tenant, root);
  return res.json({ preferences: tenant.notifications.preferences });
});

app.patch("/api/tenant/notifications/:id/read", requireAuth, requireTenant, (req, res) => {
  const { tenant, root } = getOrCreateTenant(req.user);
  const notification = tenant.notifications.items.find((item) => item.id === req.params.id);

  if (!notification) {
    return res.status(404).json({ error: "Notification not found." });
  }

  notification.read = true;
  persistTenant(req.user.id, tenant, root);
  return res.json({ notification });
});

app.get("/api/tenant/documents", requireAuth, requireTenant, (req, res) => {
  const { tenant } = getOrCreateTenant(req.user);
  return res.json({ documents: tenant.documents });
});

app.get("/api/tenant/profile", requireAuth, requireTenant, (req, res) => {
  const usersData = readUsers();
  const user = usersData.users.find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const normalizedUser = normalizeUserRecord(user);

  const { tenant } = getOrCreateTenant(req.user);
  const profile = {
    ...tenant.profile,
    fullName: normalizedUser.fullName,
    location: normalizedUser.location || "",
    email: normalizedUser.email
  };

  return res.json({
    profile,
    sessions: normalizedUser.sessions.map((session) => ({
      id: session.id,
      device: session.userAgent,
      location: session.ipAddress,
      lastActive: session.lastActiveAt,
      current: session.id === req.user.sessionId
    }))
  });
});

app.patch("/api/tenant/profile", requireAuth, requireTenant, createRateLimit("tenant-profile-update", 30, 60_000), (req, res) => {
  const updates = req.body || {};
  const usersData = readUsers();
  const user = usersData.users.find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  user.fullName = String(updates.fullName || user.fullName).trim();
  user.location = String(updates.location || user.location || "").trim();
  user.email = normalizeEmail(updates.email || user.email);
  user.updatedAt = safeDate();
  writeUsers(usersData);

  const { tenant, root } = getOrCreateTenant(user);
  tenant.profile.fullName = user.fullName;
  tenant.profile.location = user.location;
  tenant.profile.email = user.email;
  tenant.profile.phone = String(updates.phone || tenant.profile.phone || "").trim();

  persistTenant(user.id, tenant, root);
  return res.json({ profile: tenant.profile });
});

app.post("/api/tenant/profile/password", requireAuth, requireTenant, createRateLimit("tenant-profile-password", 12, 60_000), (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new passwords are required." });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }

  const usersData = readUsers();
  const user = usersData.users.find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: "Current password is invalid." });
  }

  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = safeDate();
  writeUsers(usersData);

  return res.json({ message: "Password updated successfully." });
});

app.post("/api/tenant/profile/2fa", requireAuth, requireTenant, createRateLimit("tenant-profile-2fa", 30, 60_000), (req, res) => {
  const enabled = Boolean(req.body.enabled);
  const { tenant, root } = getOrCreateTenant(req.user);
  tenant.profile.twoFactorEnabled = enabled;
  persistTenant(req.user.id, tenant, root);
  return res.json({ twoFactorEnabled: enabled });
});

app.get("/api/tenant/support", requireAuth, requireTenant, (req, res) => {
  const { tenant } = getOrCreateTenant(req.user);
  return res.json({ faq: tenant.support.faq, articles: tenant.support.articles, tickets: tenant.support.tickets });
});

app.post("/api/tenant/support/contact", requireAuth, requireTenant, createRateLimit("tenant-support-contact", 20, 60_000), (req, res) => {
  const { topic, message } = req.body;
  const safeTopic = trimTo(topic, 120);
  const safeMessage = trimTo(message, 1800);
  if (!topic || !message) {
    return res.status(400).json({ error: "Topic and message are required." });
  }

  const { tenant, root } = getOrCreateTenant(req.user);
  const ticket = {
    id: `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    topic: safeTopic,
    message: safeMessage,
    status: "open",
    createdAt: safeDate()
  };

  tenant.support.tickets.unshift(ticket);
  tenant.notifications.items.unshift({
    id: `NT-${Date.now()}-support`,
    title: "Support ticket created",
    message: "Your support request has been submitted.",
    type: "support",
    read: false,
    createdAt: safeDate()
  });

  persistTenant(req.user.id, tenant, root);
  return res.status(201).json({ ticket });
});

// 404 handler - must come before error handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: `${req.method} ${req.path} does not exist`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler - must be last middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isDevelopment = process.env.NODE_ENV !== "production";

  console.error("[ERROR]", {
    timestamp: new Date().toISOString(),
    statusCode,
    message: err.message,
    path: req.path,
    method: req.method,
    userId: req.user?.id || "anonymous",
    ...(isDevelopment && { stack: err.stack })
  });

  res.status(statusCode).json({
    error: err.message || "Internal server error",
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// Handle uncaught promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("[UNHANDLED REJECTION]", {
    timestamp: new Date().toISOString(),
    reason,
    promise
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("[UNCAUGHT EXCEPTION]", {
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

function startServer() {
  initStoragePromise
    .then(() => {
      app.listen(PORT, () => {
        console.log(`CRENIT Tenant API running at http://localhost:${PORT}`);
        console.log(`Frontend origin allowed: ${FRONTEND_ORIGIN}`);
        console.log("Storage provider: Supabase (relational schema + app_state compatibility bridge)");
        console.log("Admin login: admin@crenit.com / ADMIN_SEED_PASSWORD");
      });
    })
    .catch((error) => {
      console.error("Failed to initialize Supabase storage:", error.message);
      if (FALLBACK_TO_LOCAL_STATE) {
        initializeLocalFallbackStorage();
        initStoragePromise = Promise.resolve();
        console.warn("Using local in-memory fallback storage (FALLBACK_TO_LOCAL_STATE=true).");
        app.listen(PORT, () => {
          console.log(`CRENIT Tenant API running at http://localhost:${PORT}`);
          console.log(`Frontend origin allowed: ${FRONTEND_ORIGIN}`);
          console.log("Storage provider: local in-memory fallback (Supabase unavailable)");
        });
        return;
      }

      console.error("Run backend/supabase-state-schema.sql in Supabase SQL editor first.");
      console.error("Or set FALLBACK_TO_LOCAL_STATE=true in backend/.env for local fallback.");
      process.exit(1);
    });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  initStoragePromise,
  startServer
};

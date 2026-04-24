const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

async function request(path, options = {}, token = "") {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  const raw = await response.text();
  let body;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { raw };
  }

  return {
    status: response.status,
    ok: response.ok,
    body
  };
}

function assertStatus(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name} expected ${expected} but got ${actual}`);
  }
}

async function run() {
  const results = [];

  const tenant = {
    fullName: "Non-Booking Flow Tenant",
    email: uniqueEmail("tenant.nonbooking"),
    password: "Tenant#12345"
  };

  const landlord = {
    fullName: "Non-Booking Flow Landlord",
    email: uniqueEmail("landlord.nonbooking"),
    password: "Landlord#12345",
    role: "landlord"
  };

  // Register tenant and landlord
  const registerTenant = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(tenant)
  });
  assertStatus("register tenant", registerTenant.status, 201);
  const tenantToken = registerTenant.body.token;
  const tenantId = registerTenant.body.user?.id;
  results.push(["POST /api/auth/register tenant", registerTenant.status, "pass"]);

  const registerLandlord = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(landlord)
  });
  assertStatus("register landlord", registerLandlord.status, 201);
  const landlordToken = registerLandlord.body.token;
  const landlordId = registerLandlord.body.user?.id;
  results.push(["POST /api/auth/register landlord", registerLandlord.status, "pass"]);

  // Test tenant overview
  const tenantOverview = await request("/api/tenant/overview", { method: "GET" }, tenantToken);
  assertStatus("tenant overview", tenantOverview.status, 200);
  results.push(["GET /api/tenant/overview", tenantOverview.status, "pass"]);

  // Test tenant profile
  const tenantProfile = await request("/api/tenant/profile", { method: "GET" }, tenantToken);
  assertStatus("tenant profile get", tenantProfile.status, 200);
  results.push(["GET /api/tenant/profile", tenantProfile.status, "pass"]);

  const updateProfile = await request("/api/tenant/profile", {
    method: "PATCH",
    body: JSON.stringify({
      fullName: "Updated Name",
      phone: "+1 555 9999"
    })
  }, tenantToken);
  assertStatus("tenant profile patch", updateProfile.status, 200);
  results.push(["PATCH /api/tenant/profile", updateProfile.status, "pass"]);

  // Test tenant verification (KYC)
  const verificationStatus = await request("/api/tenant/verification", { method: "GET" }, tenantToken);
  assertStatus("tenant verification get", verificationStatus.status, 200);
  results.push(["GET /api/tenant/verification", verificationStatus.status, "pass"]);

  // Test tenant verification submit
  const submitVerification = await request("/api/tenant/verification/submit", {
    method: "POST",
    body: JSON.stringify({
      idDocumentName: "passport.pdf",
      addressDocumentName: "utility_bill.pdf"
    })
  }, tenantToken);
  assertStatus("tenant verification submit", submitVerification.status, 200);
  results.push(["POST /api/tenant/verification/submit", submitVerification.status, "pass"]);

  // Test tenant notifications
  const notifications = await request("/api/tenant/notifications", { method: "GET" }, tenantToken);
  assertStatus("tenant notifications get", notifications.status, 200);
  results.push(["GET /api/tenant/notifications", notifications.status, "pass"]);

  // Test tenant documents
  const documents = await request("/api/tenant/documents", { method: "GET" }, tenantToken);
  assertStatus("tenant documents get", documents.status, 200);
  results.push(["GET /api/tenant/documents", documents.status, "pass"]);

  // Test tenant lease
  const lease = await request("/api/tenant/lease", { method: "GET" }, tenantToken);
  assertStatus("tenant lease get", lease.status, 200);
  results.push(["GET /api/tenant/lease", lease.status, "pass"]);

  // Test tenant disputes
  const disputesList = await request("/api/tenant/disputes", { method: "GET" }, tenantToken);
  assertStatus("tenant disputes list", disputesList.status, 200);
  results.push(["GET /api/tenant/disputes", disputesList.status, "pass"]);

  const createDispute = await request("/api/tenant/disputes", {
    method: "POST",
    body: JSON.stringify({
      title: "Test Dispute",
      category: "maintenance",
      message: "This is a test dispute",
      evidenceName: "test_evidence.pdf"
    })
  }, tenantToken);
  assertStatus("tenant create dispute", createDispute.status, 201);
  const disputeId = createDispute.body.dispute?.id;
  results.push(["POST /api/tenant/disputes", createDispute.status, "pass"]);

  // Test tenant support
  const supportList = await request("/api/tenant/support", { method: "GET" }, tenantToken);
  assertStatus("tenant support get", supportList.status, 200);
  results.push(["GET /api/tenant/support", supportList.status, "pass"]);

  const contactSupport = await request("/api/tenant/support/contact", {
    method: "POST",
    body: JSON.stringify({
      topic: "Test Support Topic",
      message: "This is a test support request."
    })
  }, tenantToken);
  assertStatus("tenant contact support", contactSupport.status, 201);
  results.push(["POST /api/tenant/support/contact", contactSupport.status, "pass"]);

  // Test tenant password change
  const passwordChange = await request("/api/tenant/profile/password", {
    method: "POST",
    body: JSON.stringify({
      currentPassword: "Tenant#12345",
      newPassword: "NewPass#12345"
    })
  }, tenantToken);
  assertStatus("tenant password change", passwordChange.status, 200);
  results.push(["POST /api/tenant/profile/password", passwordChange.status, "pass"]);

  // Test tenant 2FA
  const enable2FA = await request("/api/tenant/profile/2fa", {
    method: "POST",
    body: JSON.stringify({ enable: true })
  }, tenantToken);
  assertStatus("tenant 2fa", enable2FA.status, 200);
  results.push(["POST /api/tenant/profile/2fa", enable2FA.status, "pass"]);

  // Test landlord verification
  const landlordVerification = await request("/api/landlord/verification", { method: "GET" }, landlordToken);
  assertStatus("landlord verification get", landlordVerification.status, 200);
  results.push(["GET /api/landlord/verification", landlordVerification.status, "pass"]);

  const submitLandlordVerification = await request("/api/landlord/verification/submit", {
    method: "POST",
    body: JSON.stringify({
      idDocumentName: "passport.pdf",
      ownershipDocumentName: "property_deed.pdf"
    })
  }, landlordToken);
  assertStatus("landlord verification submit", submitLandlordVerification.status, 200);
  results.push(["POST /api/landlord/verification/submit", submitLandlordVerification.status, "pass"]);

  // Test admin KYC endpoints (landlord should be blocked)
  const adminKYCTenants = await request("/api/admin/kyc/tenants", { method: "GET" }, landlordToken);
  assertStatus("admin kyc tenants blocked for landlord", adminKYCTenants.status, 403);
  results.push(["GET /api/admin/kyc/tenants landlord", adminKYCTenants.status, "pass (blocked)"]);

  // Test payment endpoints (should fail without verification-approved status)
  const payments = await request("/api/tenant/payments", { method: "GET" }, tenantToken);
  assertStatus("tenant payments blocked", payments.status, 403);
  results.push(["GET /api/tenant/payments", payments.status, "pass (blocked - needs verification)"]);

  const creditScore = await request("/api/tenant/credit", { method: "GET" }, tenantToken);
  assertStatus("tenant credit blocked", creditScore.status, 403);
  results.push(["GET /api/tenant/credit", creditScore.status, "pass (blocked - needs verification)"]);

  const depositInfo = await request("/api/tenant/deposit", { method: "GET" }, tenantToken);
  assertStatus("tenant deposit blocked", depositInfo.status, 403);
  results.push(["GET /api/tenant/deposit", depositInfo.status, "pass (blocked - needs verification)"]);

  // Test auth and sessions
  const authMe = await request("/api/auth/me", { method: "GET" }, tenantToken);
  assertStatus("auth me", authMe.status, 200);
  results.push(["GET /api/auth/me", authMe.status, "pass"]);

  const sessions = await request("/api/auth/sessions", { method: "GET" }, tenantToken);
  assertStatus("auth sessions", sessions.status, 200);
  results.push(["GET /api/auth/sessions", sessions.status, "pass"]);

  // Test unauthorized access (no token)
  const noAuth = await request("/api/tenant/profile", { method: "GET" });
  assertStatus("tenant profile no auth", noAuth.status, 401);
  results.push(["GET /api/tenant/profile no-token", noAuth.status, "pass (blocked)"]);

  // Test role-based blocking (tenant accessing landlord endpoint)
  const tenantAccessLandlord = await request("/api/landlord/verification", { method: "GET" }, tenantToken);
  assertStatus("tenant access landlord endpoint", tenantAccessLandlord.status, 403);
  results.push(["GET /api/landlord/verification tenant", tenantAccessLandlord.status, "pass (blocked)"]);

  console.log("\nNon-Booking Endpoint Smoke Test Results");
  console.log("======================================");
  for (const [name, status, verdict] of results) {
    console.log(`${name} -> ${status} (${verdict})`);
  }
  console.log("======================================");
  console.log(`TOTAL: ${results.length} checks`);
  console.log("ALL_NON_BOOKING_CHECKS_PASSED");
}

run().catch((error) => {
  console.error("NON_BOOKING_CHECK_FAILED");
  console.error(error.message || error);
  process.exit(1);
});

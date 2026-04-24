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
    fullName: "Booking Flow Tenant",
    email: uniqueEmail("tenant.booking.flow"),
    password: "Tenant#12345"
  };

  const landlord = {
    fullName: "Booking Flow Landlord",
    email: uniqueEmail("landlord.booking.flow"),
    password: "Landlord#12345",
    role: "landlord"
  };

  const health = await request("/api/health", { method: "GET" });
  assertStatus("health", health.status, 200);
  results.push(["GET /api/health", health.status, "pass"]);

  const registerTenant = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(tenant)
  });
  assertStatus("register tenant", registerTenant.status, 201);
  const tenantToken = registerTenant.body.token;
  results.push(["POST /api/auth/register tenant", registerTenant.status, tenantToken ? "pass" : "fail"]);

  const registerLandlord = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(landlord)
  });
  assertStatus("register landlord", registerLandlord.status, 201);
  const landlordToken = registerLandlord.body.token;
  results.push(["POST /api/auth/register landlord", registerLandlord.status, landlordToken ? "pass" : "fail"]);

  const createBooking = await request("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      date: "2026-04-10",
      slot: "10:00-12:00",
      bookingType: "event-space",
      notes: "E2E booking flow test"
    })
  }, tenantToken);
  assertStatus("create booking", createBooking.status, 201);
  const bookingId = createBooking.body.booking?.id;
  const createdStatus = createBooking.body.booking?.status;
  if (!bookingId || createdStatus !== "pending") {
    throw new Error("create booking did not return pending booking id");
  }
  results.push(["POST /api/bookings tenant", createBooking.status, `pass (${createdStatus})`]);

  const tenantBookingList = await request("/api/bookings", { method: "GET" }, tenantToken);
  assertStatus("tenant bookings list", tenantBookingList.status, 200);
  const tenantCanSeeOwn = (tenantBookingList.body.bookings || []).some((b) => b.id === bookingId);
  if (!tenantCanSeeOwn) {
    throw new Error("tenant cannot see own booking");
  }
  results.push(["GET /api/bookings tenant", tenantBookingList.status, "pass"]);

  const tenantTriesConfirm = await request(`/api/bookings/${bookingId}/confirm`, {
    method: "PATCH",
    body: JSON.stringify({})
  }, tenantToken);
  assertStatus("tenant confirm denied", tenantTriesConfirm.status, 403);
  results.push(["PATCH /api/bookings/:id/confirm tenant", tenantTriesConfirm.status, "pass (blocked)"]);

  const landlordPendingList = await request("/api/bookings?status=pending", { method: "GET" }, landlordToken);
  assertStatus("landlord pending list", landlordPendingList.status, 200);
  const landlordSeesBooking = (landlordPendingList.body.bookings || []).some((b) => b.id === bookingId);
  if (!landlordSeesBooking) {
    throw new Error("landlord cannot see pending booking");
  }
  results.push(["GET /api/bookings landlord?status=pending", landlordPendingList.status, "pass"]);

  const confirmBooking = await request(`/api/bookings/${bookingId}/confirm`, {
    method: "PATCH",
    body: JSON.stringify({})
  }, landlordToken);
  assertStatus("landlord confirm", confirmBooking.status, 200);
  if (confirmBooking.body.booking?.status !== "confirmed") {
    throw new Error("booking did not move to confirmed");
  }
  results.push(["PATCH /api/bookings/:id/confirm landlord", confirmBooking.status, "pass (confirmed)"]);

  const approveBooking = await request(`/api/bookings/${bookingId}/approve`, {
    method: "PATCH",
    body: JSON.stringify({})
  }, landlordToken);
  assertStatus("landlord approve", approveBooking.status, 200);
  if (approveBooking.body.booking?.status !== "approved") {
    throw new Error("booking did not move to approved");
  }
  results.push(["PATCH /api/bookings/:id/approve landlord", approveBooking.status, "pass (approved)"]);

  const rejectAfterApprove = await request(`/api/bookings/${bookingId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason: "should fail in approved state" })
  }, landlordToken);
  assertStatus("reject after approve blocked", rejectAfterApprove.status, 409);
  results.push(["PATCH /api/bookings/:id/reject after approved", rejectAfterApprove.status, "pass (blocked)"]);

  const createSecondBooking = await request("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      date: "2026-04-12",
      slot: "13:00-15:00",
      bookingType: "spa",
      notes: "Direct reject flow"
    })
  }, tenantToken);
  assertStatus("create second booking", createSecondBooking.status, 201);
  const secondId = createSecondBooking.body.booking?.id;

  const rejectPending = await request(`/api/bookings/${secondId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason: "No availability" })
  }, landlordToken);
  assertStatus("landlord reject pending", rejectPending.status, 200);
  if (rejectPending.body.booking?.status !== "rejected") {
    throw new Error("pending booking did not move to rejected");
  }
  results.push(["PATCH /api/bookings/:id/reject landlord", rejectPending.status, "pass (rejected)"]);

  const tenantFilterApproved = await request("/api/bookings?status=approved", { method: "GET" }, tenantToken);
  assertStatus("tenant approved filter", tenantFilterApproved.status, 200);
  const approvedFound = (tenantFilterApproved.body.bookings || []).some((b) => b.id === bookingId);
  if (!approvedFound) {
    throw new Error("approved filter does not include approved booking");
  }
  results.push(["GET /api/bookings?status=approved tenant", tenantFilterApproved.status, "pass"]);

  console.log("Booking Flow Smoke Test Results");
  console.log("--------------------------------");
  for (const [name, status, verdict] of results) {
    console.log(`${name} -> ${status} (${verdict})`);
  }
  console.log("--------------------------------");
  console.log("ALL_BOOKING_FLOW_CHECKS_PASSED");
}

run().catch((error) => {
  console.error("BOOKING_FLOW_CHECK_FAILED");
  console.error(error.message || error);
  process.exit(1);
});

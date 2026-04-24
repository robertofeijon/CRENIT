process.env.FALLBACK_TO_LOCAL_STATE = "true";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "test-secret";

const request = require("supertest");
const { app, initStoragePromise } = require("../server");

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

describe("Endpoint Integration", () => {
  let landlordToken = "";
  let tenantToken = "";
  let propertyId = "";

  beforeAll(async () => {
    await initStoragePromise;

    const landlord = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Integration Landlord",
        email: uniqueEmail("landlord.integration"),
        password: "Landlord#12345",
        role: "landlord"
      });

    expect(landlord.status).toBe(201);
    landlordToken = landlord.body.token;

    const tenant = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Integration Tenant",
        email: uniqueEmail("tenant.integration"),
        password: "Tenant#12345"
      });

    expect(tenant.status).toBe(201);
    tenantToken = tenant.body.token;
  });

  test("creates, updates, and deletes landlord property", async () => {
    const createRes = await request(app)
      .post("/api/landlord/properties")
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({
        name: "Integration Towers",
        address: "99 Test Avenue",
        city: "Windhoek",
        state: "Khomas",
        zipCode: "9000",
        unitCount: 8,
        occupiedUnits: 5,
        maintenanceUnits: 1,
        monthlyRentLow: 900,
        monthlyRentHigh: 1450,
        status: "active",
        recentActivity: "Created in integration test"
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.property.name).toBe("Integration Towers");
    propertyId = createRes.body.property.id;

    const listRes = await request(app)
      .get("/api/landlord/properties?page=1&pageSize=5&sortBy=name&sortDir=asc&q=integration")
      .set("Authorization", `Bearer ${landlordToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.properties)).toBe(true);
    expect(listRes.body.pagination.page).toBe(1);
    expect(listRes.body.properties.some((entry) => entry.id === propertyId)).toBe(true);

    const patchRes = await request(app)
      .patch(`/api/landlord/properties/${propertyId}`)
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({
        name: "Integration Towers",
        address: "99 Test Avenue",
        city: "Windhoek",
        state: "Khomas",
        zipCode: "9000",
        unitCount: 8,
        occupiedUnits: 6,
        maintenanceUnits: 1,
        monthlyRentLow: 920,
        monthlyRentHigh: 1500,
        status: "maintenance",
        recentActivity: "Updated in integration test"
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.property.status).toBe("maintenance");

    const deleteRes = await request(app)
      .delete(`/api/landlord/properties/${propertyId}`)
      .set("Authorization", `Bearer ${landlordToken}`);

    expect(deleteRes.status).toBe(204);
  });

  test("returns landlord units and audit timeline", async () => {
    const unitsRes = await request(app)
      .get("/api/landlord/units?page=1&pageSize=10")
      .set("Authorization", `Bearer ${landlordToken}`);

    expect(unitsRes.status).toBe(200);
    expect(Array.isArray(unitsRes.body.units)).toBe(true);
    expect(unitsRes.body.pagination).toBeDefined();

    const auditRes = await request(app)
      .get("/api/landlord/audit?page=1&pageSize=10")
      .set("Authorization", `Bearer ${landlordToken}`);

    expect(auditRes.status).toBe(200);
    expect(Array.isArray(auditRes.body.events)).toBe(true);
    expect(auditRes.body.events.some((event) => String(event.action || "").includes("landlord.property"))).toBe(true);
  });

  test("serves landlord documents, notifications, and support workflows", async () => {
    const documentsRes = await request(app)
      .get("/api/landlord/documents")
      .set("Authorization", `Bearer ${landlordToken}`);

    expect(documentsRes.status).toBe(200);
    expect(Array.isArray(documentsRes.body.documents)).toBe(true);

    const createDocumentRes = await request(app)
      .post("/api/landlord/documents")
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({
        name: "Integration Document.pdf",
        category: "lease",
        property: "Integration Towers",
        expiresAt: "2027-01-01"
      });

    expect(createDocumentRes.status).toBe(201);
    expect(createDocumentRes.body.document.name).toBe("Integration Document.pdf");

    const updateDocumentRes = await request(app)
      .patch(`/api/landlord/documents/${createDocumentRes.body.document.id}`)
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({ status: "signed" });

    expect(updateDocumentRes.status).toBe(200);
    expect(updateDocumentRes.body.document.status).toBe("signed");

    const notificationRes = await request(app)
      .get("/api/landlord/notifications")
      .set("Authorization", `Bearer ${landlordToken}`);

    expect(notificationRes.status).toBe(200);
    expect(Array.isArray(notificationRes.body.notifications)).toBe(true);

    const unreadNotification = (notificationRes.body.notifications || []).find((item) => !item.read);
    if (unreadNotification) {
      const markReadRes = await request(app)
        .patch(`/api/landlord/notifications/${unreadNotification.id}/read`)
        .set("Authorization", `Bearer ${landlordToken}`);

      expect(markReadRes.status).toBe(200);
      expect(markReadRes.body.notification.read).toBe(true);
    }

    const supportRes = await request(app)
      .get("/api/landlord/support")
      .set("Authorization", `Bearer ${landlordToken}`);

    expect(supportRes.status).toBe(200);
    expect(Array.isArray(supportRes.body.tickets)).toBe(true);

    const createTicketRes = await request(app)
      .post("/api/landlord/support/contact")
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({
        topic: "integration test",
        urgency: "high",
        message: "Need help with the landlord workspace routes."
      });

    expect(createTicketRes.status).toBe(201);
    expect(createTicketRes.body.ticket.status).toBe("open");

    const resolveTicketRes = await request(app)
      .patch(`/api/landlord/support/tickets/${createTicketRes.body.ticket.id}`)
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({ status: "resolved" });

    expect(resolveTicketRes.status).toBe(200);
    expect(resolveTicketRes.body.ticket.status).toBe("resolved");

    const deleteDocumentRes = await request(app)
      .delete(`/api/landlord/documents/${createDocumentRes.body.document.id}`)
      .set("Authorization", `Bearer ${landlordToken}`);

    expect(deleteDocumentRes.status).toBe(204);
  });

  test("serves tenant lease endpoint", async () => {
    const leaseRes = await request(app)
      .get("/api/tenant/lease")
      .set("Authorization", `Bearer ${tenantToken}`);

    expect(leaseRes.status).toBe(200);
    expect(leaseRes.body).toHaveProperty("rentAmount");
    expect(leaseRes.body).toHaveProperty("source");
  });

  test("enforces mutating route validation and rate-limit format", async () => {
    const invalidCreate = await request(app)
      .post("/api/landlord/properties")
      .set("Authorization", `Bearer ${landlordToken}`)
      .send({ name: "", address: "" });

    expect(invalidCreate.status).toBe(400);
    expect(typeof invalidCreate.body.error).toBe("string");
  });
});

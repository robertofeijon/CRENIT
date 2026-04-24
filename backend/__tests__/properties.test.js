/**
 * Landlord Properties Logic Tests
 * Focus: payload shaping, CRUD invariants, and role authorization decisions.
 */

function toMoney(value) {
  return Math.max(0, Number(value || 0));
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
  return allowed.includes(status) ? status : "active";
}

function shapePropertyPayload(payload, existing = {}) {
  const property = {
    id: existing.id || "PR-TEST-1",
    landlordId: existing.landlordId,
    name: String(payload.name ?? existing.name ?? "").trim(),
    address: String(payload.address ?? existing.address ?? "").trim(),
    city: String(payload.city ?? existing.city ?? "").trim(),
    state: String(payload.state ?? existing.state ?? "").trim(),
    zipCode: String(payload.zipCode ?? existing.zipCode ?? "").trim(),
    unitCount: toCount(payload.unitCount ?? existing.unitCount, 0),
    occupiedUnits: toCount(payload.occupiedUnits ?? existing.occupiedUnits, 0),
    maintenanceUnits: toCount(payload.maintenanceUnits ?? existing.maintenanceUnits, 0),
    monthlyRentLow: toMoney(payload.monthlyRentLow ?? existing.monthlyRentLow),
    monthlyRentHigh: toMoney(payload.monthlyRentHigh ?? existing.monthlyRentHigh),
    status: normalizePropertyStatus(String(payload.status ?? existing.status ?? "active").toLowerCase())
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

function canManageProperty(user, property) {
  if (!user || !property) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  return user.role === "landlord" && user.id === property.landlordId;
}

describe("Property Payload Shaping", () => {
  test("normalizes occupancy and rent ranges", () => {
    const result = shapePropertyPayload(
      {
        name: "Summit Lofts",
        address: "71 Market Street",
        unitCount: 10,
        occupiedUnits: 16,
        maintenanceUnits: 9,
        monthlyRentLow: 2000,
        monthlyRentHigh: 1500,
        status: "pending"
      },
      { landlordId: "USR-L-1" }
    );

    expect(result.error).toBeUndefined();
    expect(result.property.occupiedUnits).toBe(10);
    expect(result.property.maintenanceUnits).toBe(0);
    expect(result.property.monthlyRentLow).toBe(1500);
    expect(result.property.monthlyRentHigh).toBe(2000);
    expect(result.property.occupancyRate).toBe(100);
  });

  test("rejects missing name/address", () => {
    const result = shapePropertyPayload({ name: "", address: "" }, { landlordId: "USR-L-1" });
    expect(result.error).toBe("Property name and address are required.");
  });
});

describe("Property Authorization", () => {
  const property = { id: "PR-1", landlordId: "USR-L-1" };

  test("allows admin to manage any property", () => {
    expect(canManageProperty({ id: "USR-A-1", role: "admin" }, property)).toBe(true);
  });

  test("allows owning landlord", () => {
    expect(canManageProperty({ id: "USR-L-1", role: "landlord" }, property)).toBe(true);
  });

  test("denies non-owner landlord and tenants", () => {
    expect(canManageProperty({ id: "USR-L-2", role: "landlord" }, property)).toBe(false);
    expect(canManageProperty({ id: "USR-T-1", role: "customer" }, property)).toBe(false);
  });
});

describe("Property CRUD Invariants", () => {
  test("create-update-delete workflow keeps ids stable", () => {
    const store = [];

    const created = shapePropertyPayload(
      { name: "Riverside", address: "14 Riverside", unitCount: 4, occupiedUnits: 3 },
      { id: "PR-XYZ", landlordId: "USR-L-1" }
    ).property;
    store.push(created);

    expect(store).toHaveLength(1);
    expect(store[0].id).toBe("PR-XYZ");

    const updated = shapePropertyPayload(
      { occupiedUnits: 4, maintenanceUnits: 1, status: "maintenance" },
      store[0]
    ).property;
    store[0] = updated;

    expect(store[0].id).toBe("PR-XYZ");
    expect(store[0].occupiedUnits).toBe(4);
    expect(store[0].maintenanceUnits).toBe(0); // clamped by available units

    store.splice(0, 1);
    expect(store).toHaveLength(0);
  });
});

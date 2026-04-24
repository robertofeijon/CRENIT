/**
 * Route Smoke Tests
 * Lightweight checks to ensure key route guard structure remains intact.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const appPath = path.resolve(__dirname, "../App.jsx");
const appSource = fs.readFileSync(appPath, "utf8");

describe("Route guard smoke coverage", () => {
  test("tenant routes are wrapped by TenantRoute", () => {
    expect(appSource).toContain("<TenantRoute>");
    expect(appSource).toContain("path=\"/tenant\"");
    expect(appSource).toContain("<TenantLayout />");
  });

  test("landlord routes are wrapped by LandlordRoute", () => {
    expect(appSource).toContain("<LandlordRoute>");
    expect(appSource).toContain("path=\"/landlord\"");
    expect(appSource).toContain("<LandlordLayout />");
  });

  test("unauthenticated users are redirected to auth", () => {
    expect(appSource).toContain("if (!isAuthenticated)");
    expect(appSource).toContain("<Navigate to=\"/auth\" replace />");
  });

  test("home route redirects authenticated users by role", () => {
    expect(appSource).toContain("const homeElement = isAuthenticated");
    expect(appSource).toContain("/landlord/dashboard");
    expect(appSource).toContain("/tenant/welcome");
  });
});

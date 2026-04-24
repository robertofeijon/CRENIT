/**
 * API Utilities Tests
 * Tests API request handling and error management
 */

import { describe, test, expect, beforeEach, vi } from "vitest";

// Mock fetch for testing
global.fetch = vi.fn();

async function apiCall(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

describe("API Call Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should make successful API call", async () => {
    const mockData = { id: 1, name: "Test" };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const result = await apiCall("/api/test");
    expect(result).toEqual(mockData);
  });

  test("should handle API errors", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad request" })
    });

    await expect(apiCall("/api/test")).rejects.toThrow("Bad request");
  });

  test("should include authorization header when provided", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    await apiCall("/api/test", {
      headers: { Authorization: "Bearer token123" }
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token123"
        })
      })
    );
  });

  test("should handle network errors", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(apiCall("/api/test")).rejects.toThrow("Network error");
  });

  test("should handle 401 unauthorized", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" })
    });

    await expect(apiCall("/api/test")).rejects.toThrow("Unauthorized");
  });

  test("should handle 500 server error", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal server error" })
    });

    await expect(apiCall("/api/test")).rejects.toThrow("Internal server error");
  });
});

describe("Auth Token Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test("should retrieve token from localStorage", () => {
    const token = "test-token-123";
    localStorage.setItem("authToken", token);

    expect(localStorage.getItem("authToken")).toBe(token);
  });

  test("should clear token on logout", () => {
    localStorage.setItem("authToken", "test-token");
    localStorage.removeItem("authToken");

    expect(localStorage.getItem("authToken")).toBeNull();
  });
});

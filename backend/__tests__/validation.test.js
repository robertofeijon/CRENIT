/**
 * Data Validation Tests
 * Tests input validation and sanitization
 */

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateEmail(email) {
  const normalized = normalizeEmail(email);
  // Basic email validation regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

describe("Email Normalization", () => {
  test("should normalize email addresses", () => {
    const testCases = [
      ["  user@example.com  ", "user@example.com"],
      ["User@Example.COM", "user@example.com"],
      ["", ""],
      ["null@test.com", "null@test.com"]
    ];

    testCases.forEach(([input, expected]) => {
      expect(normalizeEmail(input)).toBe(expected);
    });
  });

  test("should handle null and undefined gracefully", () => {
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail(false)).toBe("");
  });
});

describe("Email Validation", () => {
  test("should validate correct email formats", () => {
    const validEmails = [
      "user@example.com",
      "first.last@domain.co.uk",
      "user+tag@example.com",
      "123@test.io"
    ];

    validEmails.forEach((email) => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  test("should reject invalid email formats", () => {
    const invalidEmails = [
      "not-an-email",
      "@example.com",
      "user@",
      "user name@example.com",
      "",
      "user@.com"
    ];

    invalidEmails.forEach((email) => {
      expect(validateEmail(email)).toBe(false);
    });
  });

  test("should validate emails with spaces after normalization", () => {
    expect(validateEmail("  user@example.com  ")).toBe(true);
    expect(validateEmail("USER@EXAMPLE.COM")).toBe(true);
  });
});

describe("Input Sanitization", () => {
  test("should handle type coercion safely", () => {
    const testCases = [
      [123, "123"],
      [true, "true"],
      [false, ""],
      [null, ""],
      [undefined, ""],
      [{ test: "object" }, "[object Object]"]
    ];

    testCases.forEach(([input, expected]) => {
      expect(String(input || "").trim()).toBe(expected);
    });
  });

  test("should trim whitespace from inputs", () => {
    const inputs = [
      { value: "  test  ", expected: "test" },
      { value: "\n\r\ttest\n\r\t", expected: "test" },
      { value: "   ", expected: "" }
    ];

    inputs.forEach(({ value, expected }) => {
      expect(String(value).trim()).toBe(expected);
    });
  });
});

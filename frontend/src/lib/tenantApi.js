import { apiRequest } from "./api";

export function getTenantOverview(token) {
  return apiRequest("/api/tenant/overview", { method: "GET" }, token);
}

export function getTenantMarketplace(token, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    params.set(key, String(value));
  });

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/marketplace/properties${suffix}`, { method: "GET" }, token);
}

export function requestMarketplaceMatch(token, payload) {
  return apiRequest("/api/tenant/marketplace/request", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function getTenantRelationships(token) {
  return apiRequest("/api/tenant/relationships", { method: "GET" }, token);
}

export function acceptTenantRelationship(token, relationshipId) {
  return apiRequest(`/api/tenant/relationships/${relationshipId}/accept`, {
    method: "POST",
    body: JSON.stringify({})
  }, token);
}

export function getTenantVerification(token) {
  return apiRequest("/api/tenant/verification", { method: "GET" }, token);
}

export function submitTenantVerification(token, payload) {
  return apiRequest("/api/tenant/verification/submit", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function getTenantPayments(token) {
  return apiRequest("/api/tenant/payments", { method: "GET" }, token);
}

export function submitTenantPayment(token, payload) {
  return apiRequest("/api/tenant/payments/pay", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function recordMissedTenantPayment(token, payload) {
  return apiRequest("/api/tenant/payments/missed", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function updateAutopay(token, enabled) {
  return apiRequest("/api/tenant/payments/autopay", {
    method: "PATCH",
    body: JSON.stringify({ enabled })
  }, token);
}

export function addPaymentMethod(token, payload) {
  return apiRequest("/api/tenant/payments/methods", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function getTenantCredit(token) {
  return apiRequest("/api/tenant/credit", { method: "GET" }, token);
}

export function getTenantLease(token) {
  return apiRequest("/api/tenant/lease", { method: "GET" }, token);
}

export function getTenantDeposit(token) {
  return apiRequest("/api/tenant/deposit", { method: "GET" }, token);
}

export function createDepositDispute(token, payload) {
  return apiRequest("/api/tenant/deposit/disputes", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function getTenantDisputes(token) {
  return apiRequest("/api/tenant/disputes", { method: "GET" }, token);
}

export function createTenantDispute(token, payload) {
  return apiRequest("/api/tenant/disputes", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function addDisputeMessage(token, disputeId, payload) {
  return apiRequest(`/api/tenant/disputes/${disputeId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function getTenantNotifications(token) {
  return apiRequest("/api/tenant/notifications", { method: "GET" }, token);
}

export function updateNotificationPreference(token, payload) {
  return apiRequest("/api/tenant/notifications/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload)
  }, token);
}

export function markNotificationRead(token, notificationId) {
  return apiRequest(`/api/tenant/notifications/${notificationId}/read`, {
    method: "PATCH"
  }, token);
}

export function getTenantDocuments(token) {
  return apiRequest("/api/tenant/documents", { method: "GET" }, token);
}

export function getTenantProfile(token) {
  return apiRequest("/api/tenant/profile", { method: "GET" }, token);
}

export function updateTenantProfile(token, payload) {
  return apiRequest("/api/tenant/profile", {
    method: "PATCH",
    body: JSON.stringify(payload)
  }, token);
}

export function changeTenantPassword(token, payload) {
  return apiRequest("/api/tenant/profile/password", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function toggleTenant2FA(token, enabled) {
  return apiRequest("/api/tenant/profile/2fa", {
    method: "POST",
    body: JSON.stringify({ enabled })
  }, token);
}

export function getTenantSupport(token) {
  return apiRequest("/api/tenant/support", { method: "GET" }, token);
}

export function submitSupportMessage(token, payload) {
  return apiRequest("/api/tenant/support/contact", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

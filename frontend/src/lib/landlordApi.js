import { apiRequest } from "./api";

export function getAdminBookings(token, query = "") {
  return apiRequest(`/api/bookings${query}`, { method: "GET" }, token);
}

export function getLandlordProperties(token, query = {}, requestOptions = {}) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    params.set(key, String(value));
  });

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/landlord/properties${suffix}`, { method: "GET", ...requestOptions }, token);
}

export function getLandlordUnits(token, query = {}, requestOptions = {}) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    params.set(key, String(value));
  });

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/landlord/units${suffix}`, { method: "GET", ...requestOptions }, token);
}

export function getLandlordTenantCandidates(token) {
  return apiRequest("/api/landlord/tenants/candidates", { method: "GET" }, token);
}

export function assignTenantToUnit(token, payload) {
  return apiRequest("/api/landlord/units/assign", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function autoAssignTenantsToUnits(token, payload = {}) {
  return apiRequest("/api/landlord/units/auto-assign", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function previewAutoAssignTenants(token, payload = {}) {
  return apiRequest("/api/landlord/units/auto-assign/preview", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function unassignTenantFromUnit(token, payload) {
  return apiRequest("/api/landlord/units/unassign", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function transferTenantBetweenUnits(token, payload) {
  return apiRequest("/api/landlord/units/transfer", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function getUnitAssignmentHistory(token, unitId) {
  return apiRequest(`/api/landlord/units/${unitId}/history`, { method: "GET" }, token);
}

export function rollbackUnitAssignment(token, unitId, eventId) {
  return apiRequest(`/api/landlord/units/${unitId}/rollback`, {
    method: "POST",
    body: JSON.stringify({ eventId })
  }, token);
}

export function getLandlordAudit(token, query = {}, requestOptions = {}) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    params.set(key, String(value));
  });

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/landlord/audit${suffix}`, { method: "GET", ...requestOptions }, token);
}

export function getLandlordVerification(token) {
  return apiRequest("/api/landlord/verification", { method: "GET" }, token);
}

export function submitLandlordVerification(token, payload) {
  return apiRequest("/api/landlord/verification/submit", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function getLandlordDocuments(token) {
  return apiRequest("/api/landlord/documents", { method: "GET" }, token);
}

export function createLandlordDocument(token, payload) {
  return apiRequest("/api/landlord/documents", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function updateLandlordDocument(token, documentId, payload) {
  return apiRequest(`/api/landlord/documents/${documentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }, token);
}

export function deleteLandlordDocument(token, documentId) {
  return apiRequest(`/api/landlord/documents/${documentId}`, {
    method: "DELETE"
  }, token);
}

export function getLandlordNotifications(token) {
  return apiRequest("/api/landlord/notifications", { method: "GET" }, token);
}

export function updateLandlordNotificationPreferences(token, payload) {
  return apiRequest("/api/landlord/notifications/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload)
  }, token);
}

export function markLandlordNotificationRead(token, notificationId) {
  return apiRequest(`/api/landlord/notifications/${notificationId}/read`, {
    method: "PATCH"
  }, token);
}

export function getLandlordSupport(token) {
  return apiRequest("/api/landlord/support", { method: "GET" }, token);
}

export function submitLandlordSupportMessage(token, payload) {
  return apiRequest("/api/landlord/support/contact", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function updateLandlordSupportTicket(token, ticketId, payload) {
  return apiRequest(`/api/landlord/support/tickets/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }, token);
}

export function getLandlordDeposits(token) {
  return apiRequest("/api/landlord/deposits", { method: "GET" }, token);
}

export function createLandlordDeposit(token, payload) {
  return apiRequest("/api/landlord/deposits", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function updateLandlordDeposit(token, depositId, payload) {
  return apiRequest(`/api/landlord/deposits/${depositId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }, token);
}

export function addLandlordDepositDeduction(token, depositId, payload) {
  return apiRequest(`/api/landlord/deposits/${depositId}/deductions`, {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function flagLandlordDepositDispute(token, depositId) {
  return apiRequest(`/api/landlord/deposits/${depositId}/dispute`, {
    method: "POST",
    body: JSON.stringify({})
  }, token);
}

export function getLandlordDisputes(token) {
  return apiRequest("/api/landlord/disputes", { method: "GET" }, token);
}

export function updateLandlordDispute(token, disputeId, payload) {
  return apiRequest(`/api/landlord/disputes/${disputeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }, token);
}

export function addLandlordDisputeMessage(token, disputeId, payload) {
  return apiRequest(`/api/landlord/disputes/${disputeId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function getLandlordSettings(token) {
  return apiRequest("/api/landlord/settings", { method: "GET" }, token);
}

export function updateLandlordSettings(token, payload) {
  return apiRequest("/api/landlord/settings", {
    method: "PATCH",
    body: JSON.stringify(payload)
  }, token);
}

export function revokeLandlordSession(token, sessionId) {
  return apiRequest(`/api/landlord/settings/sessions/${sessionId}`, {
    method: "DELETE"
  }, token);
}

export function getLandlordRelationships(token) {
  return apiRequest("/api/landlord/relationships", { method: "GET" }, token);
}

export function inviteTenantToProperty(token, payload) {
  return apiRequest("/api/landlord/relationships/invite", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function approveLandlordRelationship(token, relationshipId) {
  return apiRequest(`/api/landlord/relationships/${relationshipId}/approve`, {
    method: "POST",
    body: JSON.stringify({})
  }, token);
}

export function createLandlordProperty(token, payload) {
  return apiRequest("/api/landlord/properties", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function updateLandlordProperty(token, propertyId, payload) {
  return apiRequest(`/api/landlord/properties/${propertyId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }, token);
}

export function deleteLandlordProperty(token, propertyId) {
  return apiRequest(`/api/landlord/properties/${propertyId}`, {
    method: "DELETE"
  }, token);
}

export function confirmBooking(token, bookingId) {
  return apiRequest(`/api/bookings/${bookingId}/confirm`, { method: "PATCH", body: JSON.stringify({}) }, token);
}

export function approveBooking(token, bookingId) {
  return apiRequest(`/api/bookings/${bookingId}/approve`, { method: "PATCH", body: JSON.stringify({}) }, token);
}

export function rejectBooking(token, bookingId, reason) {
  return apiRequest(`/api/bookings/${bookingId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason: reason || "Rejected by landlord" })
  }, token);
}

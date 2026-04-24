const API_BASE = import.meta.env.VITE_API_URL || "/api";

function buildApiUrl(endpoint) {
  const normalizedBase = String(API_BASE || "").trim().replace(/\/+$/, "");
  const normalizedEndpoint = (endpoint.startsWith("/") ? endpoint : `/${endpoint}`).replace(/\/{2,}/g, "/");

  if (!normalizedBase) {
    return normalizedEndpoint;
  }

  const baseHasApiSuffix = /\/api$/i.test(normalizedBase);
  const endpointHasApiPrefix = /^\/api(\/|$)/i.test(normalizedEndpoint);

  if (baseHasApiSuffix && endpointHasApiPrefix) {
    return `${normalizedBase}${normalizedEndpoint.replace(/^\/api/i, "")}`;
  }

  return `${normalizedBase}${normalizedEndpoint}`;
}

export async function apiRequest(endpoint, options = {}, token = "") {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(buildApiUrl(endpoint), { ...options, headers });
  } catch (requestError) {
    if (requestError?.name === "AbortError") {
      throw requestError;
    }
    throw new Error("Cannot reach API server. Ensure backend is running.");
  }

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : {};

  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status}).`);
  }

  return body;
}

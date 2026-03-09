// Update user profile
export async function updateProfile(data: { fullName: string; phoneNumber?: string }) {
  const res = await authorizedFetch(`${BASE}/users/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Profile update failed');
  }
  return res.json();
}
const BASE = 'http://localhost:3000';
let authToken: string | null = null;

// Initialize token from localStorage on module load
function initializeToken() {
  const storedToken = localStorage.getItem('auth_token');
  if (storedToken) {
    authToken = storedToken;
    console.log('Auth token restored from localStorage');
  }
}

// Call this on module load
initializeToken();

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function authorizedFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers: Record<string, string> = init.headers ? {...(init.headers as any)} : {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  } else {
    console.warn('No auth token available for request to:', input);
  }
  return fetch(input, { ...init, headers });
}

interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'tenant' | 'landlord';
    kycStatus: string;
  };
  message?: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export interface SignupDto {
  email: string;
  password: string;
  fullName: string;
  role: 'tenant' | 'landlord';
  phoneNumber?: string;
}

export async function signup(data: SignupDto) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Signup failed');
  }
  return res.json();
}

// additional sample endpoints
export async function fetchTenantPayments() {
  const res = await authorizedFetch(`${BASE}/payments/tenant`);
  if (!res.ok) throw new Error('Failed to load payments');
  return res.json();
}

export async function fetchLandlordOverview() {
  const res = await authorizedFetch(`${BASE}/properties`);
  if (!res.ok) throw new Error('Failed to load overview');
  return res.json();
}

export async function fetchProfile() {
  const res = await authorizedFetch(`${BASE}/auth/me`);
  if (!res.ok) throw new Error('Unable to fetch profile');
  return res.json();
}

export async function fetchRentDue(): Promise<{ amount: string; due: string }> {
  const res = await authorizedFetch(`${BASE}/payments/rent-due`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

// Properties API
export async function fetchLandlordProperties() {
  const res = await authorizedFetch(`${BASE}/properties`);
  if (!res.ok) throw new Error('Failed to load properties');
  return res.json();
}

export async function fetchAvailableProperties() {
  try {
    const res = await fetch(`${BASE}/properties/public/available`);
    if (!res.ok) throw new Error('Failed to load properties');
    return res.json();
  } catch (e) {
    console.error('Error fetching available properties:', e);
    return [];
  }
}

export async function uploadPropertyImage(propertyId: string, file: File) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await authorizedFetch(`${BASE}/properties/${propertyId}/images`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Image upload failed');
  }
  return res.json();
}

export async function fetchPropertyDetails(propertyId: string) {
  const res = await authorizedFetch(`${BASE}/properties/${propertyId}`);
  if (!res.ok) throw new Error('Failed to load property details');
  return res.json();
}

export async function fetchTenantProperty() {
  const res = await authorizedFetch(`${BASE}/tenants/my-property`);
  if (!res.ok) {
    // Endpoint may not exist, return null gracefully
    return null;
  }
  return res.json().catch(() => null);
}

export async function fetchLandlordDisputes() {
  try {
    const res = await authorizedFetch(`${BASE}/disputes/landlord/my-disputes`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Failed to fetch landlord disputes:', e);
    return [];
  }
}

export async function fetchTenantDisputes() {
  try {
    const res = await authorizedFetch(`${BASE}/disputes/tenant/my-disputes`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Failed to fetch tenant disputes:', e);
    return [];
  }
}

export async function createDispute(paymentId: string, type: string, reason: string, description: string, amount: number) {
  const res = await authorizedFetch(`${BASE}/disputes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, type, reason, description, amount }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create dispute');
  }
  return res.json();
}

export async function fetchAllDisputes() {
  try {
    const res = await authorizedFetch(`${BASE}/disputes`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Failed to fetch all disputes:', e);
    return [];
  }
}

export async function resolveDispute(disputeId: string, data: { resolution: string; notes?: string }) {
  const res = await authorizedFetch(`${BASE}/disputes/${disputeId}/resolve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution: data.resolution }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to resolve dispute');
  }
  return res.json();
}

export async function rejectDispute(disputeId: string, data: { resolution: string; notes?: string }) {
  const res = await authorizedFetch(`${BASE}/disputes/${disputeId}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution: data.resolution }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to reject dispute');
  }
  return res.json();
}

// Tenants API
export async function fetchAllTenants() {
  try {
    const res = await authorizedFetch(`${BASE}/tenants/all`);
    if (!res.ok) {
      if (res.status === 404 || res.status === 500) {
        console.warn('Tenants endpoint not available, returning empty list');
        return [];
      }
      throw new Error('Failed to load tenants');
    }
    return res.json();
  } catch (e: any) {
    console.error('Error fetching tenants:', e);
    return [];
  }
}

export async function fetchTenantsByProperty(propertyId: string) {
  try {
    const res = await authorizedFetch(`${BASE}/tenants/by-property/${propertyId}`);
    if (!res.ok) throw new Error('Failed to load tenants');
    return res.json();
  } catch (e: any) {
    console.error('Error fetching property tenants:', e);
    return [];
  }
}

export async function fetchTenantProfile(tenantId: string) {
  try {
    const res = await authorizedFetch(`${BASE}/tenants/profile/${tenantId}`);
    if (!res.ok) throw new Error('Failed to load tenant profile');
    return res.json();
  } catch (e: any) {
    console.error('Error fetching tenant profile:', e);
    return null;
  }
}

export async function fetchTenantReliability(tenantId: string) {
  try {
    const res = await authorizedFetch(`${BASE}/tenants/${tenantId}/reliability`);
    if (!res.ok) throw new Error('Failed to load reliability score');
    return res.json();
  } catch (e: any) {
    console.error('Error fetching reliability:', e);
    return null;
  }
}

// Payments API
// Fetch all payments across all properties (landlord view)
export async function fetchAllPayments() {
  try {
    // Try the all endpoint first
    const res = await authorizedFetch(`${BASE}/payments/property/all`);
    if (res.ok) return res.json();
    
    // Fallback: return empty array if endpoint doesn't exist
    if (res.status === 404 || res.status === 500) {
      console.warn('Payments endpoint not available, returning empty list');
      return [];
    }
    throw new Error('Failed to load payments');
  } catch (e) {
    console.error('Error fetching all payments:', e);
    return [];
  }
}

export async function createPayment(data: { propertyId: string; tenantId: string; amount: number; dueDate: string }) {
  const res = await authorizedFetch(`${BASE}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to create payment');
  }
  return res.json();
}

export async function recordPayment(paymentId: string, data: { amount: number; paidDate: string }) {
  const res = await authorizedFetch(`${BASE}/payments/${paymentId}/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to record payment');
  }
  return res.json();
}

export async function updatePaymentStatus(paymentId: string, status: string) {
  const res = await authorizedFetch(`${BASE}/payments/${paymentId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to update payment status');
  }
  return res.json();
}

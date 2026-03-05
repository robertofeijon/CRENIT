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

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function authorizedFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers: Record<string, string> = init.headers ? {...(init.headers as any)} : {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
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
  try {
    const res = await authorizedFetch(`${BASE}/rent/due`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  } catch (err) {
    // fallback to dummy data if the endpoint doesn't exist yet
    return { amount: '$1,450', due: '2025-06-01' };
  }
}

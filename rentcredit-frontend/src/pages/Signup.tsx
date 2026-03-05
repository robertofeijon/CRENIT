import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup } from '../api';

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup({ email, password, fullName, role, phoneNumber });
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    }
  };

  return (
    <div className="page" style={{ maxWidth: '360px', margin: '80px auto' }}>
      <h2>Create account</h2>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          type="tel"
          placeholder="Phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label>
            <input
              type="radio"
              name="role"
              value="tenant"
              checked={role === 'tenant'}
              onChange={() => setRole('tenant')}
            />
            Tenant
          </label>
          <label>
            <input
              type="radio"
              name="role"
              value="landlord"
              checked={role === 'landlord'}
              onChange={() => setRole('landlord')}
            />
            Landlord
          </label>
        </div>
        <button className="btn btn-primary" type="submit">
          Sign up
        </button>
        {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>}
      </form>
    </div>
  );
}

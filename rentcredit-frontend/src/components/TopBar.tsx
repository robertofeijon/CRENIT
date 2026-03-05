import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function TopBar() {
  const { user, logout } = useAuth();
  const role = user?.role || 'tenant';
  const userName = user?.name || '';

  return (
    <div className="topbar">
      <div className="topbar-logo">
        <div className="logo-mark">R</div>
        <div className="logo-text">RentCredit</div>
      </div>
      <div className="topbar-center">
        <div className="breadcrumb">
          / {role} / <span>{role === 'tenant' ? 'home' : 'overview'}</span>
        </div>
      </div>
      <div className="topbar-right">
        <div className="user-chip">
          <div className="user-ava">
            {userName
              .split(' ')
              .map((s) => s[0])
              .join('')}
          </div>
          <div className="user-name">{userName}</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
}

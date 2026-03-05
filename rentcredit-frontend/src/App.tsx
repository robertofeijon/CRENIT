import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import { NavItem } from './components/NavItem';

import Login from './pages/Login';
import Signup from './pages/Signup';
import TenantHome from './pages/tenant/Home';
import TenantPayments from './pages/tenant/Payments';
import TenantCredit from './pages/tenant/Credit';
import TenantDeposit from './pages/tenant/Deposit';
import TenantSettings from './pages/tenant/Settings';

import LandlordOverview from './pages/landlord/Overview';
import LandlordProperties from './pages/landlord/Properties';
import LandlordTenants from './pages/landlord/Tenants';
import LandlordPayments from './pages/landlord/Payments';
import LandlordDisputes from './pages/landlord/Disputes';

const tenantNav: NavItem[] = [
  { id: 'home', label: 'Home', dot: true },
  { id: 'payments', label: 'Payments Center', dot: true },
  { id: 'credit', label: 'Credit Hub', dot: true },
  { id: 'deposit', label: 'Deposit Tracking', dot: true },
  { id: 'settings', label: 'Settings', dot: true },
];

const landlordNav: NavItem[] = [
  { id: 'overview', label: 'Overview', dot: true },
  { id: 'properties', label: 'Properties', dot: true },
  { id: 'tenants', label: 'Tenants', dot: true },
  { id: 'payments', label: 'Payments', dot: true },
  { id: 'disputes', label: 'Disputes', dot: true, badge: '2' },
];

function RoutesWithAuth() {
  const { user } = useAuth();
  if (!user) {
    return (
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  const navItems = user.role === 'tenant' ? tenantNav : landlordNav;
  const defaultPath = `/${user.role}/${user.role === 'tenant' ? 'home' : 'overview'}`;

  return (
    <>
      <TopBar />
      <Sidebar navItems={navItems} role={user.role} />
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to={defaultPath} />} />
          {user.role === 'tenant' && (
            <>
              <Route path="/tenant/home" element={<TenantHome />} />
              <Route path="/tenant/payments" element={<TenantPayments />} />
              <Route path="/tenant/credit" element={<TenantCredit />} />
              <Route path="/tenant/deposit" element={<TenantDeposit />} />
              <Route path="/tenant/settings" element={<TenantSettings />} />
            </>
          )}
          {user.role === 'landlord' && (
            <>
              <Route path="/landlord/overview" element={<LandlordOverview />} />
              <Route path="/landlord/properties" element={<LandlordProperties />} />
              <Route path="/landlord/tenants" element={<LandlordTenants />} />
              <Route path="/landlord/payments" element={<LandlordPayments />} />
              <Route path="/landlord/disputes" element={<LandlordDisputes />} />
            </>
          )}
          <Route path="*" element={<div className="page">Not found</div>} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RoutesWithAuth />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

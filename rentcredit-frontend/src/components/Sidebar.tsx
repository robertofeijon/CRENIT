import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavItem } from './NavItem';
import { Role } from '../contexts/AuthContext';

interface SidebarProps {
  navItems: NavItem[];
  role: Role;
}

export default function Sidebar({ navItems, role }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = location.pathname.split('/').pop() || '';

  return (
    <nav className="sidebar">
      <div className="nav-group" style={{ marginTop: '8px' }}>
        <div className="nav-group-label">
          {role === 'tenant' ? 'Tenant' : 'Landlord'}
        </div>
        {navItems.map((n) => (
          <div
            key={n.id}
            className={`nav-item ${activeId === n.id ? 'active' : ''}`}
            onClick={() => navigate(`/${role}/${n.id}`)}
          >
            <div className="nav-dot"></div>
            {n.label}
            {n.badge && <span className="nav-badge">{n.badge}</span>}
          </div>
        ))}
      </div>
    </nav>
  );
}

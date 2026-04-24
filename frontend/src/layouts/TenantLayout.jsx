import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRouteTransition } from "../lib/useRouteTransition";
import "../pages/tenant-dark-shell.css";

const tenantNavLinks = [
  { to: "/tenant/welcome", label: "Welcome" },
  { to: "/tenant/dashboard", label: "Dashboard" },
  { to: "/tenant/verification", label: "KYC" },
  { to: "/tenant/payments", label: "Payments" },
  { to: "/tenant/lease", label: "Lease" },
  { to: "/tenant/deposit", label: "Deposit" },
  { to: "/tenant/documents", label: "Documents" },
  { to: "/tenant/settings", label: "Settings" },
  { to: "/tenant/support", label: "Support" }
];

export function TenantLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isTransitioning } = useRouteTransition(280);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!isTransitioning) {
      setShowSkeleton(false);
      return;
    }

    setShowSkeleton(true);
    const hideTimer = window.setTimeout(() => {
      setShowSkeleton(false);
    }, 220);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [isTransitioning]);

  function onLogout() {
    logout();
    navigate("/auth", { replace: true });
  }

  return (
    <main className={`portal-main-ui tenant-main-ui ${isTransitioning ? "is-route-transitioning" : ""}`.trim()}>
      <header className="portal-main-header">
        <div className="portal-logo">Crenit<span>.</span></div>
        <nav className="portal-nav" aria-label="Tenant navigation">
          {tenantNavLinks.map((item) => (
            <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
          ))}
        </nav>
        <button type="button" className="portal-signout" onClick={onLogout}>Sign Out</button>
      </header>

      {showSkeleton ? (
        <div className="route-skeleton-overlay" aria-hidden="true">
          <span className="route-skeleton-line lg" />
          <span className="route-skeleton-line md" />
          <span className="route-skeleton-line sm" />
        </div>
      ) : null}

      <div className={`portal-main-frame route-transition-frame ${isTransitioning ? "is-entering" : ""}`.trim()}>
        <Outlet />
      </div>
    </main>
  );
}

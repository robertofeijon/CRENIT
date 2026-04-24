import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRouteTransition } from "../lib/useRouteTransition";
import "../pages/tenant-dark-shell.css";

const landlordNavLinks = [
  { to: "/landlord/dashboard", label: "Dashboard" },
  { to: "/landlord/properties", label: "Properties" },
  { to: "/landlord/units", label: "Units" },
  { to: "/landlord/tenants", label: "Tenants" },
  { to: "/landlord/payments", label: "Payments" },
  { to: "/landlord/reports", label: "Reports" },
  { to: "/landlord/deposits", label: "Deposits" },
  { to: "/landlord/disputes", label: "Disputes" },
  { to: "/landlord/documents", label: "Documents" },
  { to: "/landlord/communication", label: "Contacts" },
  { to: "/landlord/settings", label: "Settings" },
  { to: "/landlord/support", label: "Support" }
];

export function LandlordLayout() {
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
    <main className={`portal-main-ui landlord-main-ui ${isTransitioning ? "is-route-transitioning" : ""}`.trim()}>
      <header className="portal-main-header">
        <div className="portal-logo">Crenit<span>.</span></div>
        <nav className="portal-nav" aria-label="Landlord navigation">
          {landlordNavLinks.map((item) => (
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

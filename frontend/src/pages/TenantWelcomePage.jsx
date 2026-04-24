import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "../components/ui/StatCard";
import { SectionCard } from "../components/ui/SectionCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { getTenantOverview } from "../lib/tenantApi";

export function TenantWelcomePage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const result = await getTenantOverview(token);
        setData(result);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    load();
  }, [token]);

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  if (!data) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  const quickActions = [
    { to: "/tenant/payments", label: "Pay Rent" },
    { to: "/tenant/verification", label: "Complete KYC" },
    { to: "/tenant/lease", label: "View Lease" },
    { to: "/tenant/deposit", label: "Track Deposit" },
    { to: "/tenant/support", label: "Contact Landlord" }
  ];

  const relationship = data.relationship?.relationship;

  return (
    <div className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Welcome Back</p>
          <h1>Track rent and deposit activity in one clean workspace.</h1>
          <p className="page-hero-copy">Use this workspace to record payments, complete KYC, and keep reliable data for reports.</p>
        </div>
        <div className="hero-actions">
          <Link to="/tenant/payments" className="button-link">Open Payments</Link>
          <Link to="/tenant/support" className="button-link ghost">Ask for Help</Link>
        </div>
      </div>

      <div className="card-grid four">
        <StatCard label="Rent Due" value={`$${data.rentDue.amount.toLocaleString()}`} status={data.rentDue.status} tone="alert" />
        <StatCard label="Next Payment" value={data.rentDue.nextDate} helper="Scheduled due date" />
        <StatCard label="KYC" value={String(data.verification?.status || "pending")} helper="Identity verification" tone="trust" />
        <StatCard label="Deposit" value={`$${Number(data.deposit?.amount || 0).toLocaleString()}`} helper={data.deposit?.status || "tracked"} tone="success" />
      </div>

      <SectionCard title="Connected Landlord">
        {relationship ? (
          <div className="form-grid">
            <p><strong>{relationship.property?.name}</strong></p>
            <p className="muted">{relationship.property?.address}</p>
            <p>Landlord: {relationship.landlord?.name || "Unknown"}</p>
            <p className="muted">{relationship.landlord?.email}</p>
            <p>Status: {relationship.status}</p>
          </div>
        ) : (
          <p className="empty-state">No connected landlord yet. Ask your landlord to link your lease so rent and deposit tracking can begin.</p>
        )}
      </SectionCard>

      <SectionCard title="Recent Status">
        <ul className="list">
          <li>
            <StatusBadge status={data.rentDue.status} />
            <span>Rent status: {data.rentDue.status}</span>
          </li>
          <li>
            <StatusBadge status={data.deposit?.status || "tracked"} />
            <span>Deposit status: {data.deposit?.status || "tracked"}</span>
          </li>
          <li>
            <StatusBadge status={data.verification?.status || "pending"} />
            <span>KYC status: {data.verification?.status || "pending"}</span>
          </li>
        </ul>
      </SectionCard>

      <SectionCard title="Quick Actions">
        <div className="button-row">
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to} className="button-link">{action.label}</Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

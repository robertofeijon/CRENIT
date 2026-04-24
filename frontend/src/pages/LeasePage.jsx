import { useEffect, useState } from "react";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { getTenantLease } from "../lib/tenantApi";

export function LeasePage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    getTenantLease(token).then(setData).catch(() => setData(null));
  }, [token]);

  if (!data) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  return (
    <div className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Lease</p>
          <h1>Your contract terms, property details, and renewal timing in one place.</h1>
          <p className="page-hero-copy">Use this page to verify the key terms fast, then jump straight to the lease document when you need the source record.</p>
        </div>
        <div className="hero-actions">
          <a href={data.documentUrl} target="_blank" rel="noreferrer" className="button-link">View Lease</a>
        </div>
      </div>

      <div className="card-grid four">
        <StatCard label="Rent" value={`$${data.rentAmount.toLocaleString()}`} tone="trust" />
        <StatCard label="Term" value={`${data.startDate} → ${data.endDate}`} helper="Active lease window" />
        <StatCard label="Unit" value={data.unit} helper={data.propertyAddress} />
        <StatCard label="Renewal" value={data.renewalWarning === "renewal_due_soon" ? "Due Soon" : "Stable"} tone="alert" />
      </div>

      <SectionCard title="Lease Details">
        <div className="detail-grid">
          <p>Start Date: <strong>{data.startDate}</strong></p>
          <p>End Date: <strong>{data.endDate}</strong></p>
          <p>Rent Amount: <strong>${data.rentAmount.toLocaleString()}</strong></p>
          <p>Unit: <strong>{data.unit}</strong></p>
          <p>Property: <strong>{data.propertyAddress}</strong></p>
          <p>Landlord: <strong>{data.landlord.name} ({data.landlord.email})</strong></p>
        </div>
      </SectionCard>

      <SectionCard title="Lease Terms Summary">
        <ul className="list">
          {data.terms.map((term) => <li key={term}>{term}</li>)}
        </ul>
      </SectionCard>

      <SectionCard title="Lease Document">
        <a href={data.documentUrl} target="_blank" rel="noreferrer" className="button-link">View / Download Lease Document</a>
      </SectionCard>

      {data.renewalWarning ? <StatusBadge status={data.renewalWarning} /> : null}
    </div>
  );
}

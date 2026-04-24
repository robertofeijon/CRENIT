import { useEffect, useState } from "react";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { getTenantVerification, submitTenantVerification } from "../lib/tenantApi";

export function VerificationPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ idDocumentName: "", addressDocumentName: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const result = await getTenantVerification(token);
    setData(result);
  }

  useEffect(() => {
    load().catch(() => setData(null));
  }, [token]);

  async function onSubmit(event) {
    event.preventDefault();
    setMessage("");

    try {
      await submitTenantVerification(token, form);
      setMessage("Verification submitted successfully.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  if (!data) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  const isSubmitted = data.verification.status !== "not_submitted";

  return (
    <div className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">KYC</p>
          <h1>Complete KYC to verify identity for rent and deposit actions.</h1>
          <p className="page-hero-copy">KYC keeps payment and deposit records trustworthy and compliant.</p>
        </div>
      </div>

      <div className="card-grid three">
        <StatCard label="Status" value={data.verification.status} tone={isSubmitted ? "success" : "alert"} />
        <StatCard label="Required Steps" value={String(data.verification.requiredSteps.length)} helper="Checklist before submission" />
        <StatCard label="Documents" value={String(data.verification.documents.length)} helper="Uploaded evidence" tone="trust" />
      </div>

      <SectionCard title="KYC Status">
        <div className="inline-row">
          <StatusBadge status={data.verification.status} />
          <p>{data.verification.submittedAt ? `Submitted on ${data.verification.submittedAt}` : "Not submitted yet"}</p>
        </div>
        <p className="muted">Verification protects your account, secures payouts, and prevents fraud.</p>
      </SectionCard>

      <SectionCard title="KYC Checklist">
        <ul className="list">
          {data.verification.requiredSteps.map((step) => <li key={step}>{step}</li>)}
        </ul>
      </SectionCard>

      <SectionCard title="KYC Document Upload">
        {isSubmitted ? (
          <p className="empty-state">Your verification package is submitted and currently read-only.</p>
        ) : (
          <form onSubmit={onSubmit} className="form-grid">
            <label>
              Government ID File Name
              <input
                value={form.idDocumentName}
                onChange={(event) => setForm((previous) => ({ ...previous, idDocumentName: event.target.value }))}
                required
              />
            </label>
            <label>
              Proof of Address File Name
              <input
                value={form.addressDocumentName}
                onChange={(event) => setForm((previous) => ({ ...previous, addressDocumentName: event.target.value }))}
                required
              />
            </label>
            <button type="submit">Submit Verification</button>
          </form>
        )}
        {message ? <p className="ok-text">{message}</p> : null}
      </SectionCard>
    </div>
  );
}

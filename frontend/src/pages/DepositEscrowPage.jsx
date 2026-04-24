import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { createDepositDispute, getTenantDeposit } from "../lib/tenantApi";

export function DepositEscrowPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const result = await getTenantDeposit(token);
    setData(result);
  }

  useEffect(() => {
    let active = true;
    load().catch(() => {
      if (active) {
        setData(null);
      }
    });
    return () => {
      active = false;
    };
  }, [token]);

  const totals = useMemo(() => {
    const deductions = data?.deductions || [];
    const deductionTotal = deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const refundEstimate = Math.max(0, Number(data?.totalAmount || 0) - deductionTotal);
    return {
      deductionTotal,
      refundEstimate,
      deductionCount: deductions.length
    };
  }, [data]);

  async function onDispute() {
    try {
      await createDepositDispute(token, {
        title: "Deposit deduction dispute",
        message: note || "Need details about deduction",
        evidenceName: "deposit-evidence.pdf"
      });
      setMessage("Dispute opened successfully.");
      setNote("");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  if (!data) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  const timeline = Array.isArray(data.timeline) ? data.timeline : [];
  const deductions = Array.isArray(data.deductions) ? data.deductions : [];

  return (
    <div className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Deposit Escrow</p>
          <h1>Track escrow status and deductions without guessing.</h1>
          <p className="page-hero-copy">You can see what is held, what is under review, and what evidence is needed before a dispute moves forward.</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={onDispute}>Open Dispute</button>
        </div>
      </div>

      <div className="card-grid four">
        <StatCard label="Total Deposit" value={`$${Number(data.totalAmount || 0).toLocaleString()}`} tone="trust" />
        <StatCard label="Escrow Status" value={data.escrowStatus} status={data.escrowStatus} />
        <StatCard label="Refund Status" value={data.refundStatus} tone="alert" />
        <StatCard label="Deductions" value={String(totals.deductionCount)} helper={`$${totals.deductionTotal.toLocaleString()} total`} tone="success" />
      </div>

      <SectionCard title="Refund Snapshot">
        <div className="detail-grid">
          <div className="detail-card">
            <p className="muted">Estimated Refund</p>
            <strong>${totals.refundEstimate.toLocaleString()}</strong>
          </div>
          <div className="detail-card">
            <p className="muted">Held Amount</p>
            <strong>${Number(data.totalAmount || 0).toLocaleString()}</strong>
          </div>
          <div className="detail-card">
            <p className="muted">Status</p>
            <StatusBadge status={data.escrowStatus} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Deductions">
        {deductions.length ? (
          <ul className="list">
            {deductions.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.reason}</strong>
                  <p className="muted">{item.note || "Landlord deduction note"}</p>
                </span>
                <span>
                  <strong>${Number(item.amount || 0).toLocaleString()}</strong>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No deductions have been applied.</p>
        )}
      </SectionCard>

      <SectionCard title="Deposit Timeline">
        <ul className="list">
          {timeline.map((event) => (
            <li key={event.id}>
              <span>
                <strong>{event.message}</strong>
                <p className="muted">{event.type || "event"}</p>
              </span>
              <span>{event.date ? new Date(event.date).toLocaleString() : "Recently"}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Dispute Deductions">
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain your dispute and upload evidence reference" />
        <div className="button-row">
          <button type="button" onClick={onDispute}>Open Dispute</button>
        </div>
        {message ? <p className="ok-text">{message}</p> : null}
      </SectionCard>
    </div>
  );
}

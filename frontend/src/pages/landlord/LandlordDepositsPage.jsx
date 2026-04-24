import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import {
  addLandlordDepositDeduction,
  createLandlordDeposit,
  flagLandlordDepositDispute,
  getLandlordDeposits,
  updateLandlordDeposit
} from "../../lib/landlordApi";

function nextStatus(status) {
  if (status === "held") {
    return "inspection";
  }
  if (status === "inspection") {
    return "refund_pending";
  }
  if (status === "refund_pending") {
    return "refunded";
  }
  return status;
}

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

export function LandlordDepositsPage() {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ tenant: "", property: "", total: "" });
  const [deductionForm, setDeductionForm] = useState({ id: "", amount: "", reason: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const result = await getLandlordDeposits(token);
    setRecords(Array.isArray(result.records) ? result.records : []);
  }

  useEffect(() => {
    load().catch(() => setRecords([]));
  }, [token]);

  const metrics = useMemo(() => {
    const heldValue = records
      .filter((record) => ["held", "inspection", "refund_pending"].includes(record.status))
      .reduce((sum, record) => sum + Number(record.total || 0), 0);
    const activeDisputes = records.filter((record) => record.status === "disputed").length;
    const pendingRefunds = records.filter((record) => record.status === "refund_pending").length;
    return { heldValue, activeDisputes, pendingRefunds, totalRecords: records.length };
  }, [records]);

  const timeline = useMemo(() => {
    return records
      .flatMap((record) =>
        (record.history || []).map((item) => ({
          key: `${record.id}-${item.at}-${item.action}`,
          at: item.at,
          action: `${item.action} for ${record.tenant}`
        }))
      )
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10);
  }, [records]);

  async function onCreateDeposit(event) {
    event.preventDefault();
    const total = Number(form.total);
    if (!form.tenant || !form.property || !Number.isFinite(total) || total <= 0) {
      setMessage("Enter tenant, property, and a valid deposit amount.");
      return;
    }

    try {
      await createLandlordDeposit(token, {
        tenant: form.tenant.trim(),
        property: form.property.trim(),
        total
      });
      setForm({ tenant: "", property: "", total: "" });
      setMessage("Deposit case added to escrow ledger.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onAdvance(record) {
    const status = nextStatus(record.status);
    if (status === record.status) {
      return;
    }
    try {
      await updateLandlordDeposit(token, record.id, { status });
      setMessage(`Updated ${record.tenant} to ${status.replace("_", " ")}.`);
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onFlagDispute(recordId) {
    try {
      await flagLandlordDepositDispute(token, recordId);
      setMessage("Deposit case moved to disputed.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onAddDeduction(event) {
    event.preventDefault();
    const amount = Number(deductionForm.amount);
    if (!deductionForm.id || !Number.isFinite(amount) || amount <= 0 || !deductionForm.reason.trim()) {
      setMessage("Choose a case, amount, and reason before adding deduction.");
      return;
    }

    try {
      await addLandlordDepositDeduction(token, deductionForm.id, {
        amount,
        reason: deductionForm.reason.trim()
      });
      setDeductionForm({ id: "", amount: "", reason: "" });
      setMessage("Deduction logged with audit history.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  return (
    <div className="page-stack">
      <div className="card-grid four">
        <StatCard label="Escrow Value" value={formatCurrency(metrics.heldValue)} helper="Funds currently held or in review" tone="trust" />
        <StatCard label="Pending Refunds" value={String(metrics.pendingRefunds)} helper="Awaiting release to tenant" tone="alert" />
        <StatCard label="Active Disputes" value={String(metrics.activeDisputes)} helper="Requires review and notes" tone="alert" />
        <StatCard label="Total Cases" value={String(metrics.totalRecords)} helper="Historical and active records" tone="success" />
      </div>

      <SectionCard title="Create Deposit Case">
        <form className="form-grid" onSubmit={onCreateDeposit}>
          <label>
            Tenant Name
            <input value={form.tenant} onChange={(event) => setForm((previous) => ({ ...previous, tenant: event.target.value }))} required />
          </label>
          <label>
            Property
            <input value={form.property} onChange={(event) => setForm((previous) => ({ ...previous, property: event.target.value }))} required />
          </label>
          <label>
            Deposit Amount
            <input type="number" min={1} value={form.total} onChange={(event) => setForm((previous) => ({ ...previous, total: event.target.value }))} required />
          </label>
          <button type="submit">Add Deposit Case</button>
        </form>
      </SectionCard>

      <SectionCard title="Deposits and Escrow">
        {records.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tenant</th><th>Total</th><th>Deductions</th><th>Refund</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const deductionTotal = (record.deductions || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
                  const refund = Math.max(0, Number(record.total || 0) - deductionTotal);
                  return (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.tenant}</strong>
                        <p className="muted">{record.property}</p>
                      </td>
                      <td>{formatCurrency(record.total)}</td>
                      <td>{formatCurrency(deductionTotal)}</td>
                      <td>{formatCurrency(refund)}</td>
                      <td><StatusBadge status={record.status} /></td>
                      <td>
                        <div className="button-row compact-actions">
                          {record.status !== "refunded" && record.status !== "disputed" ? (
                            <button type="button" onClick={() => onAdvance(record)}>Advance</button>
                          ) : null}
                          {record.status !== "disputed" ? (
                            <button type="button" className="ghost" onClick={() => onFlagDispute(record.id)}>Flag Dispute</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No deposit cases yet.</p>
        )}
      </SectionCard>

      <SectionCard title="Add Deduction">
        <form className="form-inline" onSubmit={onAddDeduction}>
          <select value={deductionForm.id} onChange={(event) => setDeductionForm((previous) => ({ ...previous, id: event.target.value }))}>
            <option value="">Select case</option>
            {records.map((record) => (
              <option key={record.id} value={record.id}>{record.tenant} - {record.property}</option>
            ))}
          </select>
          <input type="number" min={1} value={deductionForm.amount} onChange={(event) => setDeductionForm((previous) => ({ ...previous, amount: event.target.value }))} placeholder="Amount" />
          <input value={deductionForm.reason} onChange={(event) => setDeductionForm((previous) => ({ ...previous, reason: event.target.value }))} placeholder="Reason" />
          <button type="submit">Log Deduction</button>
        </form>
      </SectionCard>

      <SectionCard title="Escrow Timeline">
        {timeline.length ? (
          <ul className="list">
            {timeline.map((item) => (
              <li key={item.key}><span>{item.action}</span><span>{new Date(item.at).toLocaleString()}</span></li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">Timeline will populate as events occur.</p>
        )}
      </SectionCard>

      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}

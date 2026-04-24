import { useEffect, useState } from "react";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { addDisputeMessage, createTenantDispute, getTenantDisputes } from "../lib/tenantApi";

export function DisputesPage() {
  const { token } = useAuth();
  const [data, setData] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [form, setForm] = useState({ title: "", category: "payment", message: "", evidenceName: "" });
  const [reply, setReply] = useState("");

  async function load() {
    const result = await getTenantDisputes(token);
    setData(result.disputes);
    if (!activeId && result.disputes.length) {
      setActiveId(result.disputes[0].id);
    }
  }

  useEffect(() => {
    load().catch(() => setData([]));
  }, [token]);

  async function onCreate(event) {
    event.preventDefault();
    await createTenantDispute(token, form);
    setForm({ title: "", category: "payment", message: "", evidenceName: "" });
    await load();
  }

  async function onReply() {
    if (!activeId || !reply) {
      return;
    }
    await addDisputeMessage(token, activeId, { message: reply });
    setReply("");
    await load();
  }

  const active = data.find((item) => item.id === activeId);
  const counts = {
    total: data.length,
    open: data.filter((item) => item.status === "open" || item.status === "under_review").length,
    resolved: data.filter((item) => item.status === "resolved").length,
    evidence: data.reduce((sum, item) => sum + Number(item.evidence?.length || 0), 0)
  };

  return (
    <div className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Disputes</p>
          <h1>Track every issue with a clean evidence trail.</h1>
          <p className="page-hero-copy">Open, review, and resolve disputes without losing context. Every message and attachment stays tied to the case.</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={() => document.querySelector(".create-dispute-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}>New Dispute</button>
        </div>
      </div>

      <div className="card-grid four">
        <StatCard label="Total Cases" value={String(counts.total)} tone="trust" />
        <StatCard label="Open" value={String(counts.open)} tone="alert" />
        <StatCard label="Resolved" value={String(counts.resolved)} tone="success" />
        <StatCard label="Evidence Files" value={String(counts.evidence)} helper="Documents attached to cases" />
      </div>

      <div className="split-grid">
        <SectionCard title="All Disputes">
          {data.length ? (
            <ul className="list">
              {data.map((item) => (
                <li key={item.id}>
                  <button className="link-button" onClick={() => setActiveId(item.id)}>{item.title}</button>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No disputes yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Create New Dispute" className="create-dispute-card">
          <form className="form-grid" onSubmit={onCreate}>
            <input placeholder="Dispute title" value={form.title} onChange={(event) => setForm((p) => ({ ...p, title: event.target.value }))} required />
            <select value={form.category} onChange={(event) => setForm((p) => ({ ...p, category: event.target.value }))}>
              <option value="payment">Payment</option>
              <option value="verification">Verification</option>
              <option value="lease">Lease</option>
              <option value="deposit">Deposit</option>
            </select>
            <textarea placeholder="Describe the issue" value={form.message} onChange={(event) => setForm((p) => ({ ...p, message: event.target.value }))} required />
            <input placeholder="Evidence file name" value={form.evidenceName} onChange={(event) => setForm((p) => ({ ...p, evidenceName: event.target.value }))} />
            <button type="submit">Submit Dispute</button>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Dispute Detail">
        {!active ? <p className="empty-state">Select a dispute to view details.</p> : (
          <>
            <h3>{active.title}</h3>
            <StatusBadge status={active.status} />
            <p>Category: {active.category}</p>
            <h4>Timeline</h4>
            <ul className="list">{active.messages.map((entry) => <li key={entry.id}>{entry.at} - {entry.by}: {entry.message}</li>)}</ul>
            <h4>Evidence</h4>
            <ul className="list">{active.evidence.map((entry) => <li key={entry.id}>{entry.name}</li>)}</ul>
            <div className="form-inline">
              <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Add message" />
              <button onClick={onReply}>Send</button>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

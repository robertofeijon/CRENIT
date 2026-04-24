import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { addLandlordDisputeMessage, getLandlordDisputes, updateLandlordDispute } from "../../lib/landlordApi";

export function LandlordDisputesPage() {
  const { token } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const result = await getLandlordDisputes(token);
    setDisputes(Array.isArray(result.disputes) ? result.disputes : []);
  }

  useEffect(() => {
    load().catch(() => setDisputes([]));
  }, [token]);

  useEffect(() => {
    if (!selectedId && disputes.length) {
      setSelectedId(disputes[0].id);
    }
  }, [disputes, selectedId]);

  const selected = disputes.find((item) => item.id === selectedId) || null;

  const metrics = useMemo(() => {
    const open = disputes.filter((item) => item.status === "open").length;
    const inReview = disputes.filter((item) => item.status === "under_review").length;
    const resolved = disputes.filter((item) => item.status === "resolved").length;
    const avgAgeDays = disputes.length
      ? Math.round(disputes.reduce((sum, item) => sum + Math.max(1, Math.round((Date.now() - new Date(item.openedAt).getTime()) / 86_400_000)), 0) / disputes.length)
      : 0;
    return { open, inReview, resolved, avgAgeDays };
  }, [disputes]);

  async function onStatusChange(disputeId, status) {
    try {
      await updateLandlordDispute(token, disputeId, { status });
      setMessage("Dispute status updated.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onReply(event) {
    event.preventDefault();
    if (!selected || !reply.trim()) {
      setMessage("Choose a dispute and add a response.");
      return;
    }

    try {
      await addLandlordDisputeMessage(token, selected.id, { body: reply.trim() });
      setReply("");
      setMessage("Response sent to dispute timeline.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  return (
    <div className="page-stack">
      <div className="card-grid four">
        <StatCard label="Open" value={String(metrics.open)} helper="Needs first response" tone="alert" />
        <StatCard label="Under Review" value={String(metrics.inReview)} helper="Waiting verification" tone="trust" />
        <StatCard label="Resolved" value={String(metrics.resolved)} helper="Closed with record" tone="success" />
        <StatCard label="Avg Age" value={`${metrics.avgAgeDays}d`} helper="Current case age" tone="alert" />
      </div>

      <SectionCard title="Dispute Queue">
        {disputes.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Issue</th><th>Priority</th><th>Status</th><th>Opened</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {disputes.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <p className="muted">{item.tenant} · {item.property}</p>
                    </td>
                    <td><StatusBadge status={item.priority} /></td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>{new Date(item.openedAt).toLocaleDateString()}</td>
                    <td>
                      <div className="button-row compact-actions">
                        <button type="button" onClick={() => setSelectedId(item.id)}>Open</button>
                        {item.status !== "under_review" ? <button type="button" className="ghost" onClick={() => onStatusChange(item.id, "under_review")}>Review</button> : null}
                        {item.status !== "resolved" ? <button type="button" className="ghost" onClick={() => onStatusChange(item.id, "resolved")}>Resolve</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No disputes currently in queue.</p>
        )}
      </SectionCard>

      <SectionCard title="Selected Dispute Timeline">
        {selected ? (
          <>
            <div className="inline-row" style={{ marginBottom: "10px" }}>
              <strong>{selected.title}</strong>
              <StatusBadge status={selected.status} />
            </div>
            <ul className="list">
              {(selected.messages || []).map((entry, index) => (
                <li key={`${selected.id}-${entry.at}-${index}`}>
                  <span>
                    <strong>{entry.by}</strong>
                    <p>{entry.body}</p>
                  </span>
                  <span>{new Date(entry.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>

            <form className="form-grid" onSubmit={onReply} style={{ marginTop: "12px" }}>
              <label>
                Landlord Response
                <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Type a response to a dispute" />
              </label>
              <button type="submit">Submit Response</button>
            </form>
          </>
        ) : (
          <p className="empty-state">Choose a dispute from the queue to review details.</p>
        )}
      </SectionCard>

      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}

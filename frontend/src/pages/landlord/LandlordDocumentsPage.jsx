import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { createLandlordDocument, deleteLandlordDocument, getLandlordDocuments, updateLandlordDocument } from "../../lib/landlordApi";

const documentCategories = ["lease", "inspection", "payment", "tenant-doc", "general"];
const documentStatuses = ["draft", "review", "signed", "archived"];

function nextStatus(status) {
  if (status === "draft") {
    return "review";
  }
  if (status === "review") {
    return "signed";
  }
  return status;
}

function daysUntil(dateIso) {
  if (!dateIso) {
    return null;
  }
  const delta = new Date(dateIso).getTime() - Date.now();
  return Math.ceil(delta / 86_400_000);
}

export function LandlordDocumentsPage() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", category: "lease", property: "", expiresAt: "" });
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await getLandlordDocuments(token);
      setDocuments(result.documents || []);
    } catch (requestError) {
      setMessage(requestError.message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents.filter((doc) => {
      if (categoryFilter !== "all" && doc.category !== categoryFilter) {
        return false;
      }
      if (statusFilter !== "all" && doc.status !== statusFilter) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return [doc.name, doc.property, doc.category, doc.status].join(" ").toLowerCase().includes(normalized);
    });
  }, [documents, query, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const expiringSoon = documents.filter((doc) => doc.expiresAt && daysUntil(doc.expiresAt) !== null && daysUntil(doc.expiresAt) <= 30).length;
    const signed = documents.filter((doc) => doc.status === "signed").length;
    const inReview = documents.filter((doc) => doc.status === "review").length;
    return { expiringSoon, signed, inReview, total: documents.length };
  }, [documents]);

  async function onUpload(event) {
    event.preventDefault();
    setMessage("");

    try {
      await createLandlordDocument(token, form);
      setForm({ name: "", category: "lease", property: "", expiresAt: "" });
      setMessage("Document added to archive queue.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onAdvanceStatus(documentId, currentStatus) {
    setMessage("");
    try {
      await updateLandlordDocument(token, documentId, { status: nextStatus(currentStatus) });
      setMessage("Document status updated.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onDelete(documentId) {
    setMessage("");
    try {
      await deleteLandlordDocument(token, documentId);
      setMessage("Document removed.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  if (loading) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  return (
    <div className="page-stack">
      <div className="card-grid four">
        <StatCard label="Total Files" value={String(stats.total)} helper="All document records" tone="trust" />
        <StatCard label="Signed" value={String(stats.signed)} helper="Ready for audit and sharing" tone="success" />
        <StatCard label="In Review" value={String(stats.inReview)} helper="Pending landlord action" tone="alert" />
        <StatCard label="Expiring Soon" value={String(stats.expiringSoon)} helper="Within the next 30 days" tone="alert" />
      </div>

      <SectionCard title="Upload Registry Entry">
        <form className="form-grid" onSubmit={onUpload}>
          <label>
            Document Name
            <input value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} placeholder="Lease Agreement.pdf" required />
          </label>
          <label>
            Category
            <select value={form.category} onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}>
              {documentCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            Property
            <input value={form.property} onChange={(event) => setForm((previous) => ({ ...previous, property: event.target.value }))} required />
          </label>
          <label>
            Expiry Date
            <input type="date" value={form.expiresAt} onChange={(event) => setForm((previous) => ({ ...previous, expiresAt: event.target.value }))} />
          </label>
          <button type="submit">Save Document</button>
        </form>
      </SectionCard>

      <SectionCard title="Archive">
        <div className="filter-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, property, category" />
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">All categories</option>
            {documentCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {documentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>

        {filtered.length ? (
          <div className="table-wrap" style={{ marginTop: "14px" }}>
            <table>
              <thead>
                <tr><th>Name</th><th>Category</th><th>Status</th><th>Size</th><th>Expiry</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <strong>{doc.name}</strong>
                      <p className="muted">{doc.property}</p>
                    </td>
                    <td>{doc.category}</td>
                    <td><StatusBadge status={doc.status} /></td>
                    <td>{doc.sizeKb} KB</td>
                    <td>{doc.expiresAt ? `${new Date(doc.expiresAt).toLocaleDateString()} (${daysUntil(doc.expiresAt)}d)` : "No expiry"}</td>
                    <td>
                      <div className="button-row compact-actions">
                        {doc.status !== "signed" ? <button type="button" onClick={() => onAdvanceStatus(doc.id, doc.status)}>Advance</button> : null}
                        <button type="button" className="ghost" onClick={() => onDelete(doc.id)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No documents match your filters.</p>
        )}
      </SectionCard>

      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTenantDocuments } from "../lib/tenantApi";
import "./tenant-dark-shell.css";

export function DocumentsPage() {
  const { token, logout } = useAuth();
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ type: "all", date: "" });

  useEffect(() => {
    getTenantDocuments(token).then(setData).catch(() => setData(null));
  }, [token]);

  const visible = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.documents.filter((doc) => {
      if (filters.type !== "all" && doc.type !== filters.type) {
        return false;
      }
      if (filters.date && !doc.date.startsWith(filters.date)) {
        return false;
      }
      return true;
    });
  }, [data, filters]);

  if (!data) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  return (
    <div className="tenant-dark-page">
      <header className="tenant-dark-topnav">
        <div className="tenant-dark-logo">Crenit<span>.</span></div>
        <nav className="tenant-dark-nav-pills" aria-label="Tenant navigation">
          <Link to="/tenant/dashboard">Dashboard</Link>
          <Link to="/tenant/payments">Payments</Link>
          <Link to="/tenant/documents" className="active">Documents</Link>
          <Link to="/tenant/credit">Credit</Link>
          <Link to="/tenant/disputes">Disputes</Link>
        </nav>
        <button type="button" className="tenant-dark-signout" onClick={logout}>Sign Out</button>
      </header>

      <section className="tenant-dark-hero">
        <div>
          <p className="tenant-dark-tag">DOCUMENT VAULT</p>
          <h1>
            Keep every proof on hand.
            <em> No missing files.</em>
          </h1>
          <p className="tenant-dark-subtext">Filter fast, preview in one click, and download verified records whenever leasing or finance needs documentation.</p>
        </div>
        <div className="tenant-dark-hero-actions">
          <span className="tenant-dark-live-badge is-active">Archive synced</span>
          <button type="button" className="tenant-dark-solid-btn">Upload Soon</button>
          <Link to="/tenant/lease" className="tenant-dark-ghost-btn">Lease Folder</Link>
        </div>
      </section>

      <section className="tenant-dark-stats">
        <article className="tenant-dark-stat accent-orange">
          <p className="label">Visible files</p>
          <h2>{visible.length}</h2>
          <small>Current filter output</small>
        </article>
        <article className="tenant-dark-stat accent-blue">
          <p className="label">Filter type</p>
          <h2>{filters.type === "all" ? "ALL" : filters.type.toUpperCase()}</h2>
          <small>{filters.date || "All periods"}</small>
        </article>
        <article className="tenant-dark-stat accent-green">
          <p className="label">Archive size</p>
          <h2>{data.documents.length}</h2>
          <small>Total stored docs</small>
        </article>
        <article className="tenant-dark-stat accent-purple">
          <p className="label">Latest file</p>
          <h2>{visible[0]?.date?.slice(5, 7) || "--"}</h2>
          <small>{visible[0]?.name || "No selection"}</small>
        </article>
      </section>

      <section className="tenant-dark-content-grid">
        <div className="tenant-dark-left-col">
          <p className="tenant-dark-tag">Document archive</p>
          <article className="tenant-dark-list-card">
            {!visible.length ? <p className="tenant-dark-empty">No documents match the selected filters.</p> : visible.map((doc) => (
              <div key={doc.id} className="tenant-dark-row">
                <span className="tenant-dark-icon" aria-hidden="true">D</span>
                <div className="tenant-dark-meta">
                  <strong>{doc.name}</strong>
                  <small>{doc.date}</small>
                </div>
                <p className="tenant-dark-amount">{doc.type.toUpperCase()}</p>
                <span className="tenant-dark-inline-actions">
                  <a href={doc.url} target="_blank" rel="noreferrer">Preview</a>
                  <a href={doc.url} download>Download</a>
                </span>
              </div>
            ))}
          </article>
        </div>

        <div className="tenant-dark-right-col">
          <article className="tenant-dark-card">
            <p className="tenant-dark-tag">Filters</p>
            <div className="tenant-dark-filter-grid">
              <label>
                Type
                <select value={filters.type} onChange={(event) => setFilters((p) => ({ ...p, type: event.target.value }))}>
                  <option value="all">All Types</option>
                  <option value="receipt">Receipts</option>
                  <option value="statement">Statements</option>
                  <option value="lease">Lease</option>
                  <option value="verification">Verification</option>
                </select>
              </label>
              <label>
                Month
                <input type="month" value={filters.date} onChange={(event) => setFilters((p) => ({ ...p, date: event.target.value }))} />
              </label>
            </div>
          </article>

          <article className="tenant-dark-card">
            <p className="tenant-dark-tag">Quick links</p>
            <ul className="tenant-dark-links">
              <li><Link to="/tenant/lease">Lease <span>{">"}</span></Link></li>
              <li><Link to="/tenant/deposit">Deposit <span>{">"}</span></Link></li>
              <li><Link to="/tenant/credit">Credit Score <span>{">"}</span></Link></li>
              <li><Link to="/tenant/disputes">Disputes <span>{">"}</span></Link></li>
              <li><Link to="/tenant/payments">Payments <span>{">"}</span></Link></li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTenantOverview } from "../lib/tenantApi";
import "./tenant-dark-shell.css";

export function DashboardHomePage() {
  const { token, logout } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    getTenantOverview(token).then(setData).catch(() => setData(null));
  }, [token]);

  if (!data) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  const streakSegments = Array.from({ length: 8 }, (_, index) => index < Math.min(data.credit?.streak || 0, 8));
  const paymentsRows = [
    {
      id: "next-rent",
      label: "Monthly Rent",
      amount: Number(data.rentDue?.amount || 0),
      due: data.rentDue?.nextDate || "TBD",
      status: data.rentDue?.status || "pending"
    },
    {
      id: "deposit-escrow",
      label: "Deposit Escrow",
      amount: Number(data.deposit?.amount || 0),
      due: data.deposit?.lastUpdated || "Updated recently",
      status: data.deposit?.status || "active"
    },
    {
      id: "credit-impact",
      label: "Credit Impact",
      amount: Number(data.credit?.score || 0),
      due: data.credit?.trend?.replaceAll("_", " ") || "Monitoring",
      status: data.credit?.tier || "stable"
    }
  ];

  const activityItems = (data.activity || []).slice(0, 6);
  const activityIcons = ["ok", "clock", "bag", "ok", "clock", "bag"];

  function toneForStatus(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("active") || normalized.includes("paid") || normalized.includes("stable")) {
      return "is-paid";
    }
    if (normalized.includes("upcoming") || normalized.includes("due") || normalized.includes("pending")) {
      return "is-upcoming";
    }
    return "is-due";
  }

  return (
    <div className="tenant-dark-page">
      <header className="tenant-dark-topnav">
        <div className="tenant-dark-logo">Crenit<span>.</span></div>
        <nav className="tenant-dark-nav-pills" aria-label="Tenant navigation">
          <Link to="/tenant/dashboard" className="active">Dashboard</Link>
          <Link to="/tenant/payments">Payments</Link>
          <Link to="/tenant/deposit">Deposit</Link>
          <Link to="/tenant/documents">Documents</Link>
          <Link to="/tenant/verification">KYC</Link>
        </nav>
        <button type="button" className="tenant-dark-signout" onClick={logout}>Sign Out</button>
      </header>

      <section className="tenant-dark-hero">
        <div>
          <p className="tenant-dark-tag">DAILY SNAPSHOT</p>
          <h1>
            Rent and deposit tracking.
            <em> Built for clean records.</em>
          </h1>
          <p className="tenant-dark-subtext">Track due rent, deposit status, and KYC progress from one dashboard.</p>
        </div>
        <div className="tenant-dark-hero-actions">
          <span className="tenant-dark-live-badge is-active">Live sync active</span>
          <Link to="/tenant/payments" className="tenant-dark-solid-btn">Pay Rent Now</Link>
          <Link to="/tenant/lease" className="tenant-dark-ghost-btn">View Lease</Link>
        </div>
      </section>

      <section className="tenant-dark-stats">
        <article className="tenant-dark-stat accent-orange">
          <p className="label">Rent due</p>
          <h2>${Number(data.rentDue?.amount || 0).toLocaleString()}</h2>
          <small>{data.rentDue?.nextDate || "This cycle"}</small>
        </article>

        <article className="tenant-dark-stat accent-blue">
          <p className="label">Credit score</p>
          <h2>{data.credit?.score || 0}</h2>
          <small>{data.credit?.tier || "stable"}</small>
        </article>

        <article className="tenant-dark-stat accent-green">
          <p className="label">Deposit escrow</p>
          <h2>${Number(data.deposit?.amount || 0).toLocaleString()}</h2>
          <small>{data.deposit?.status || "active"}</small>
        </article>

        <article className="tenant-dark-stat accent-purple">
          <p className="label">Payment streak</p>
          <h2>{data.credit?.streak || 0}</h2>
          <small>Months on-time</small>
        </article>
      </section>

      <section className="tenant-dark-content-grid">
        <div className="tenant-dark-left-col">
          <p className="tenant-dark-tag">Payment overview</p>
          <article className="tenant-dark-list-card">
            {paymentsRows.map((row) => (
              <div key={row.id} className="tenant-dark-row">
                <span className="tenant-dark-icon" aria-hidden="true">$</span>
                <div className="tenant-dark-meta">
                  <strong>{row.label}</strong>
                  <small>{row.due}</small>
                </div>
                <p className="tenant-dark-amount">{row.id === "credit-impact" ? row.amount : `$${row.amount.toLocaleString()}`}</p>
                <span className={`tenant-dark-status ${toneForStatus(row.status)}`}>{row.status}</span>
              </div>
            ))}
          </article>
        </div>

        <div className="tenant-dark-right-col">
          <article className="tenant-dark-card">
            <p className="tenant-dark-tag">Activity feed</p>
            <ul className="tenant-dark-activity-list">
            {activityItems.map((item, index) => (
                <li key={item.id}>
                  <span className="tenant-dark-icon" aria-hidden="true">{activityIcons[index % activityIcons.length].slice(0, 1).toUpperCase()}</span>
                <div>
                    <p>{item.message}</p>
                  <small>{new Date(item.at).toLocaleDateString()}</small>
                </div>
              </li>
            ))}
            </ul>
          </article>

          <article className="tenant-dark-card">
            <p className="tenant-dark-tag">Quick links</p>
            <ul className="tenant-dark-links">
              <li><Link to="/tenant/payments">Payments <span>{">"}</span></Link></li>
              <li><Link to="/tenant/deposit">Deposit <span>{">"}</span></Link></li>
              <li><Link to="/tenant/documents">Documents <span>{">"}</span></Link></li>
              <li><Link to="/tenant/lease">Lease <span>{">"}</span></Link></li>
              <li><Link to="/tenant/verification">KYC <span>{">"}</span></Link></li>
            </ul>
          </article>
        </div>
      </section>

      <section className="tenant-dark-streak">
        <p className="tenant-dark-tag">Streak gauge</p>
        <div className="tenant-dark-segments" aria-label="Payment streak progress">
          {streakSegments.map((filled, index) => <span key={`segment-${index}`} className={filled ? "is-on" : ""} />)}
        </div>
      </section>
    </div>
  );
}

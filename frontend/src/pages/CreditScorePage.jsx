import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTenantCredit } from "../lib/tenantApi";
import { subscribeTenantRealtime } from "../lib/realtime";
import "./tenant-dark-shell.css";

export function CreditScorePage() {
  const { token, logout } = useAuth();
  const [data, setData] = useState(null);
  const [insightMode, setInsightMode] = useState("overview");

  async function loadCredit() {
    const result = await getTenantCredit(token);
    setData(result);
  }

  useEffect(() => {
    let active = true;
    getTenantCredit(token).then((result) => {
      if (active) {
        setData(result);
      }
    }).catch(() => {
      if (active) {
        setData(null);
      }
    });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const unsubscribe = subscribeTenantRealtime(token, {
      onCredit: () => loadCredit().catch(() => {})
    });

    return () => {
      unsubscribe();
    };
  }, [token]);

  const maxScore = useMemo(() => Math.max(...(data?.history || []).map((item) => item.score), 1), [data]);

  const scoreDelta = useMemo(() => {
    const history = data?.history || [];
    if (history.length < 2) {
      return 0;
    }
    return history[history.length - 1].score - history[0].score;
  }, [data]);

  const improvementTips = useMemo(() => {
    const tips = [];
    if ((data?.latePaymentCount || 0) > 0) {
      tips.push("Keep every rent payment on or before the due date to reduce late-payment drag.");
    }
    if ((data?.paymentStreak || 0) < 12) {
      tips.push("A longer on-time streak can raise the score faster than one-off balance changes.");
    }
    if ((data?.onTimePercentage || 0) < 95) {
      tips.push("Set reminders or autopay if you want your on-time rate to stay above 95%.");
    }
    if (!tips.length) {
      tips.push("Your rent record is already strong. Keep the same pattern and monitor for errors.");
    }
    return tips;
  }, [data]);

  if (!data) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  const history = Array.isArray(data.history) ? data.history : [];

  return (
    <div className="tenant-dark-page">
      <header className="tenant-dark-topnav">
        <div className="tenant-dark-logo">Crenit<span>.</span></div>
        <nav className="tenant-dark-nav-pills" aria-label="Tenant navigation">
          <Link to="/tenant/dashboard">Dashboard</Link>
          <Link to="/tenant/payments">Payments</Link>
          <Link to="/tenant/documents">Documents</Link>
          <Link to="/tenant/credit" className="active">Credit</Link>
          <Link to="/tenant/disputes">Disputes</Link>
        </nav>
        <button type="button" className="tenant-dark-signout" onClick={logout}>Sign Out</button>
      </header>

      <section className="tenant-dark-hero">
        <div>
          <p className="tenant-dark-tag">CREDIT PULSE</p>
          <h1>
            Build leverage from rent.
            <em> Track every gain.</em>
          </h1>
          <p className="tenant-dark-subtext">Monitor your score trend, keep on-time momentum, and act quickly when your profile needs correction.</p>
        </div>
        <div className="tenant-dark-hero-actions">
          <span className="tenant-dark-live-badge is-active">Credit sync active</span>
          <a className="tenant-dark-solid-btn" href={data.reportUrl} target="_blank" rel="noreferrer">Download Report</a>
          <button type="button" className="tenant-dark-ghost-btn" onClick={() => loadCredit().catch(() => {})}>Refresh</button>
        </div>
      </section>

      <section className="tenant-dark-stats">
        <article className="tenant-dark-stat accent-orange">
          <p className="label">Current score</p>
          <h2>{data.currentScore}</h2>
          <small>Live profile number</small>
        </article>
        <article className="tenant-dark-stat accent-blue">
          <p className="label">Tier</p>
          <h2>{String(data.tier || "stable").toUpperCase()}</h2>
          <small>Current rating class</small>
        </article>
        <article className="tenant-dark-stat accent-green">
          <p className="label">On-time rate</p>
          <h2>{data.onTimePercentage}%</h2>
          <small>Payment reliability</small>
        </article>
        <article className="tenant-dark-stat accent-purple">
          <p className="label">Late payments</p>
          <h2>{data.latePaymentCount}</h2>
          <small>Recorded misses</small>
        </article>
      </section>

      <section className="tenant-dark-content-grid">
        <div className="tenant-dark-left-col">
          <p className="tenant-dark-tag">Score trend</p>
          <article className="tenant-dark-card">
            <div className="tenant-dark-chart-row">
              {history.map((item) => (
                <div key={item.month} className="tenant-dark-bar-item">
                  <div className="tenant-dark-bar" style={{ height: `${Math.max(20, (item.score / maxScore) * 170)}px` }} />
                  <p>{item.month}</p>
                  <small>{item.score}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="tenant-dark-card">
            <p className="tenant-dark-tag">What to watch</p>
            {insightMode === "history" ? (
              <ul className="tenant-dark-note-list">
                {history.slice().reverse().map((item) => (
                  <li key={`${item.month}-${item.score}`}>
                    <span>{item.month}</span>
                    <strong>{item.score}</strong>
                  </li>
                ))}
              </ul>
            ) : insightMode === "improve" ? (
              <ul className="tenant-dark-note-list">
                {improvementTips.map((tip) => (
                  <li key={tip}><span>{tip}</span></li>
                ))}
              </ul>
            ) : (
              <p className="tenant-dark-empty">Your rent record is trending in the right direction. Keep momentum and monitor shifts monthly.</p>
            )}
          </article>
        </div>

        <div className="tenant-dark-right-col">
          <article className="tenant-dark-card">
            <p className="tenant-dark-tag">Score pulse</p>
            <div className="tenant-dark-kpi-grid">
              <div>
                <p>Momentum</p>
                <strong>{scoreDelta >= 0 ? "+" : ""}{scoreDelta}</strong>
              </div>
              <div>
                <p>Streak</p>
                <strong>{data.paymentStreak} mo</strong>
              </div>
              <div>
                <p>Mode</p>
                <strong>{insightMode.toUpperCase()}</strong>
              </div>
            </div>
            <div className="tenant-dark-pill-row">
              <button type="button" className={insightMode === "overview" ? "active" : ""} onClick={() => setInsightMode("overview")}>Overview</button>
              <button type="button" className={insightMode === "improve" ? "active" : ""} onClick={() => setInsightMode("improve")}>Improve</button>
              <button type="button" className={insightMode === "history" ? "active" : ""} onClick={() => setInsightMode("history")}>History</button>
            </div>
          </article>
          <article className="tenant-dark-card">
            <p className="tenant-dark-tag">How scoring works</p>
            <ul className="tenant-dark-note-list">
              <li><span>{data.calculationRule}</span></li>
              <li><span>Payment streak: {data.paymentStreak} months</span></li>
              <li><span>Recent on-time rate: {data.onTimePercentage}%</span></li>
            </ul>
          </article>

          <article className="tenant-dark-card">
            <p className="tenant-dark-tag">Quick links</p>
            <ul className="tenant-dark-links">
              <li><Link to="/tenant/lease">Lease <span>{">"}</span></Link></li>
              <li><Link to="/tenant/deposit">Deposit <span>{">"}</span></Link></li>
              <li><Link to="/tenant/payments">Payments <span>{">"}</span></Link></li>
              <li><Link to="/tenant/disputes">Disputes <span>{">"}</span></Link></li>
              <li><Link to="/tenant/documents">Documents <span>{">"}</span></Link></li>
            </ul>
          </article>
        </div>
      </section>

      <div className="tenant-dark-footer-actions">
        <a className="tenant-dark-solid-btn" href={data.reportUrl} target="_blank" rel="noreferrer">Download Credit Report</a>
        <button type="button" className="tenant-dark-ghost-btn" onClick={() => window.navigator.clipboard.writeText(data.reportShareLink)}>Share Credit Report</button>
      </div>
    </div>
  );
}

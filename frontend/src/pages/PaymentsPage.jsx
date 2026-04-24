import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTenantPayments, recordMissedTenantPayment, submitTenantPayment, updateAutopay } from "../lib/tenantApi";
import { subscribeTenantRealtime } from "../lib/realtime";
import "./payments-dark.css";

export function PaymentsPage() {
  const { token, logout } = useAuth();
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [missedAmount, setMissedAmount] = useState("");

  async function load() {
    const result = await getTenantPayments(token);
    setData(result);
  }

  useEffect(() => {
    load().catch(() => setData(null));
    const unsubscribe = subscribeTenantRealtime(token, {
      onPayment: () => load().catch(() => {}),
      onAutoPay: () => load().catch(() => {})
    });

    return () => {
      unsubscribe();
    };
  }, [token]);

  async function onPayNow() {
    setMessage("");
    try {
      if (!Number(data.currentMonth.amountDue)) {
        setMessage("No balance is currently due.");
        return;
      }
      await submitTenantPayment(token, { amount: data.currentMonth.amountDue });
      setMessage("Payment completed successfully.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onToggleAutopay() {
    try {
      if (!data.autoPayEnabled) {
        setMessage("Auto-pay is already disabled.");
        return;
      }
      await updateAutopay(token, false);
      await load();
      setMessage("Auto-pay disabled.");
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onRecordMissedPayment() {
    const numericAmount = Number(missedAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage("Enter a valid missed payment amount.");
      return;
    }

    try {
      await recordMissedTenantPayment(token, { amount: numericAmount, dueDate: data.currentMonth?.dueDate });
      await load();
      setMissedAmount("");
      setMessage("Missed payment recorded.");
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  const statItems = useMemo(() => {
    if (!data) {
      return { due: 0, upcoming: 0, methods: 0, paid: 0 };
    }

    const paid = (data.history || []).filter((item) => item.status === "paid").length;
    const missed = (data.history || []).filter((item) => item.status === "missed").length;
    return {
      due: Number(data.currentMonth?.amountDue || 0),
      upcoming: Number(data.upcoming?.length || 0),
      methods: Number(data.methods?.length || 0),
      paid,
      missed
    };
  }, [data]);

  const paymentRows = useMemo(() => {
    if (!data) {
      return [];
    }

    const upcomingRows = (data.upcoming || []).slice(0, 3).map((item, index) => ({
      id: `upcoming-${item.id || index}`,
      name: "Monthly Rent",
      date: item.dueDate,
      amount: Number(item.amount || 0),
      status: "upcoming"
    }));

    const historyRows = (data.history || []).slice(0, 3).map((item, index) => ({
      id: `history-${item.id || index}`,
      name: item.description || "Rent Payment",
      date: item.date,
      amount: Number(item.amount || 0),
      status: item.status === "paid" ? "auto-paid" : item.status === "missed" ? "missed" : "due"
    }));

    const currentDue = {
      id: "current-due",
      name: "Current Cycle",
      date: data.currentMonth?.dueDate || "TBD",
      amount: Number(data.currentMonth?.amountDue || 0),
      status: Number(data.currentMonth?.amountDue || 0) > 0 ? "due" : "auto-paid"
    };

    return [currentDue, ...upcomingRows, ...historyRows].slice(0, 6);
  }, [data]);

  const primaryMethod = useMemo(() => {
    if (!data) {
      return null;
    }
    return data.sharedTestCard || data.methods?.find((method) => method.isPrimary) || data.methods?.[0] || null;
  }, [data]);

  function statusTone(status) {
    if (status === "auto-paid") {
      return "is-paid";
    }
    if (status === "upcoming") {
      return "is-upcoming";
    }
    if (status === "missed") {
      return "is-due";
    }
    return "is-due";
  }

  function statusLabel(status) {
    if (status === "auto-paid") {
      return "Auto-paid";
    }
    if (status === "upcoming") {
      return "Upcoming";
    }
    if (status === "missed") {
      return "Missed";
    }
    return "Due";
  }

  function onSignOut() {
    logout();
  }

  if (!data) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  return (
    <div className="payments-dark-page">
      <header className="payments-topnav">
        <div className="payments-logo">Crenit<span>.</span></div>
        <nav className="payments-nav-pills" aria-label="Payments quick navigation">
          <Link to="/tenant/dashboard">Dashboard</Link>
          <Link to="/tenant/payments" className="active">Payments</Link>
          <Link to="/tenant/deposit">Deposit</Link>
          <Link to="/tenant/documents">Documents</Link>
          <Link to="/tenant/verification">KYC</Link>
        </nav>
        <button type="button" className="topnav-signout" onClick={onSignOut}>Sign Out</button>
      </header>

      <section className="payments-hero">
        <div>
          <p className="mono-tag">MONEY ROUTINE</p>
          <h1>
            Track rent and deposits.
            <em> Keep clean records.</em>
          </h1>
          <p className="hero-subtext">Log paid and missed rent events, then review a complete history for reporting and reconciliation.</p>
        </div>
        <div className="hero-actions">
          <span className={`live-badge ${data.autoPayEnabled ? "is-active" : "is-off"}`}>
            {data.autoPayEnabled ? "Auto-pay active" : "Auto-pay off"}
          </span>
          <button type="button" className="cta-solid" onClick={onPayNow}>Pay Now</button>
          <button type="button" className="cta-ghost" onClick={onToggleAutopay}>Disable Auto-pay</button>
          <input
            type="number"
            min="0"
            step="0.01"
            value={missedAmount}
            onChange={(event) => setMissedAmount(event.target.value)}
            placeholder="Missed amount"
          />
          <button type="button" className="cta-ghost" onClick={onRecordMissedPayment}>Record Missed</button>
        </div>
      </section>

      <section className="payments-stats">
        <article className="payments-stat accent-orange">
          <p className="label">Current due</p>
          <h2>${statItems.due.toLocaleString()}</h2>
          <small>This billing cycle</small>
        </article>
        <article className="payments-stat accent-blue">
          <p className="label">Upcoming bills</p>
          <h2>{statItems.upcoming}</h2>
          <small>Scheduled items</small>
        </article>
        <article className="payments-stat accent-green">
          <p className="label">Payment methods</p>
          <h2>{statItems.methods}</h2>
          <small>Saved cards</small>
        </article>
        <article className="payments-stat accent-purple">
          <p className="label">Missed</p>
          <h2>{statItems.missed}</h2>
          <small>Recorded missed rent items</small>
        </article>
      </section>

      <section className="payments-content-grid">
        <div className="left-col">
          <p className="mono-tag">Scheduled payments</p>
          <article className="payments-list-card">
            {paymentRows.map((row) => (
              <div key={row.id} className="payment-row">
                <span className="icon-box" aria-hidden="true">$</span>
                <div className="payment-meta">
                  <strong>{row.name}</strong>
                  <small>{row.date}</small>
                </div>
                <p className="payment-amount">${row.amount.toLocaleString()}</p>
                <span className={`status-pill ${statusTone(row.status)}`}>{statusLabel(row.status)}</span>
              </div>
            ))}
          </article>
        </div>

        <div className="right-col">
          <article className="payment-method-card">
            <p className="mono-tag">Payment method</p>
            <div className="chip-visual">
              <span />
            </div>
            <h3>{primaryMethod?.label || "Shared test card"}</h3>
            <p className="mono-data">**** **** **** {primaryMethod?.last4 || "1111"}</p>
          </article>

          <article className="quick-links-card">
            <p className="mono-tag">Quick links</p>
            <ul>
              <li><Link to="/tenant/lease">Lease <span>›</span></Link></li>
              <li><Link to="/tenant/deposit">Deposit <span>›</span></Link></li>
              <li><Link to="/tenant/verification">KYC <span>›</span></Link></li>
              <li><Link to="/tenant/documents">Documents <span>›</span></Link></li>
            </ul>
          </article>
        </div>
      </section>

      {message ? <p className="payments-message">{message}</p> : null}
    </div>
  );
}

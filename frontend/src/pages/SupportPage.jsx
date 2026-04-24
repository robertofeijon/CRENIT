import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { getTenantSupport, submitSupportMessage } from "../lib/tenantApi";

const topicLabels = {
  payment: "Payment Help",
  dispute: "Dispute Help",
  kyc: "Verification Help",
  lease: "Lease Help"
};

export function SupportPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ topic: "payment", message: "" });
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getTenantSupport(token).then((result) => {
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

  const filteredFaq = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!data?.faq) {
      return [];
    }
    return data.faq.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(normalized));
  }, [data, search]);

  const filteredArticles = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!data?.articles) {
      return [];
    }
    return data.articles.filter((item) => `${item.title} ${item.category || ""} ${item.summary || ""}`.toLowerCase().includes(normalized));
  }, [data, search]);

  const ticketStats = useMemo(() => {
    const tickets = data?.tickets || [];
    return {
      open: tickets.filter((ticket) => ticket.status === "open").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
      total: tickets.length
    };
  }, [data]);

  async function onSubmit(event) {
    event.preventDefault();
    try {
      await submitSupportMessage(token, form);
      setMessage("Support request submitted. Our team will respond shortly.");
      setForm({ topic: form.topic, message: "" });
      const result = await getTenantSupport(token);
      setData(result);
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  if (!data) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  return (
    <div className="support-layout">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Support</p>
          <h1>Get help without leaving the tenant portal.</h1>
          <p className="page-hero-copy">Browse common fixes, scan help articles, and submit a request when you need a human to step in.</p>
        </div>
      </div>

      <div className="card-grid three">
        <StatCard label="Open Tickets" value={String(ticketStats.open)} tone="alert" />
        <StatCard label="Resolved Tickets" value={String(ticketStats.resolved)} helper="Closed support items" tone="success" />
        <StatCard label="Help Articles" value={String(data.articles.length)} helper="Guides and walkthroughs" tone="trust" />
      </div>

      <SectionCard title="Search Support">
        <div className="filter-row">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search FAQs or articles" />
        </div>
      </SectionCard>

      <div className="support-grid">
        <SectionCard title="Frequently Asked Questions">
          {filteredFaq.length ? (
            <ul className="list faq-list">
              {filteredFaq.map((item) => (
                <li key={item.q}>
                  <strong>{item.q}</strong>
                  <p>{item.a}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No FAQs match your search.</p>
          )}
        </SectionCard>

        <SectionCard title="Help Articles">
          {filteredArticles.length ? (
            <ul className="list article-list">
              {filteredArticles.map((article) => (
                <li key={article.id}>
                  <span>
                    <strong>{article.title}</strong>
                    <p className="muted">{article.summary || "Guided help article"}</p>
                  </span>
                  <StatusBadge status={article.category || "guide"} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No articles match your search.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Open Support Tickets">
        {data.tickets && data.tickets.length ? (
          <ul className="list">
            {data.tickets.map((ticket) => (
              <li key={ticket.id}>
                <span>
                  <strong>{topicLabels[ticket.topic] || ticket.topic}</strong>
                  <p>{ticket.message}</p>
                </span>
                <span className="button-row compact-actions">
                  <StatusBadge status={ticket.status} />
                  <span className="muted">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "Recently"}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No support tickets yet.</p>
        )}
      </SectionCard>

      <SectionCard title="Contact Support">
        <form className="form-grid" onSubmit={onSubmit}>
          <select value={form.topic} onChange={(event) => setForm((p) => ({ ...p, topic: event.target.value }))}>
            <option value="payment">Payment Help</option>
            <option value="dispute">Dispute Help</option>
            <option value="kyc">KYC Help</option>
            <option value="lease">Lease Help</option>
          </select>
          <textarea value={form.message} onChange={(event) => setForm((p) => ({ ...p, message: event.target.value }))} required placeholder="Tell us how we can help" />
          <button type="submit">Submit Request</button>
        </form>
      </SectionCard>

      {message ? <p className="ok-text">{message}</p> : null}
    </div>
  );
}

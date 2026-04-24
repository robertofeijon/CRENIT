import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getLandlordSupport, submitLandlordSupportMessage, updateLandlordSupportTicket } from "../../lib/landlordApi";

const topicLabels = {
  payment: "Payment Help",
  dispute: "Dispute Help",
  kyc: "Verification Help",
  lease: "Lease Help",
  documents: "Document Help"
};

export function LandlordSupportPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ topic: "payment", urgency: "medium", message: "" });
  const [notice, setNotice] = useState("");

  async function load() {
    const result = await getLandlordSupport(token);
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

  const filteredGuides = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!data?.faq) {
      return [];
    }
    return data.faq.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(normalized));
  }, [data, query]);

  const filteredArticles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!data?.articles) {
      return [];
    }
    return data.articles.filter((item) => `${item.title} ${item.category || ""} ${item.summary || ""}`.toLowerCase().includes(normalized));
  }, [data, query]);

  const ticketStats = useMemo(() => {
    const tickets = data?.tickets || [];
    return {
      open: tickets.filter((ticket) => ticket.status === "open").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved" || ticket.status === "closed").length,
      total: tickets.length
    };
  }, [data]);

  async function onSubmit(event) {
    event.preventDefault();
    try {
      await submitLandlordSupportMessage(token, form);
      setNotice("Support request submitted. Our team will respond shortly.");
      setForm({ topic: form.topic, urgency: form.urgency, message: "" });
      await load();
    } catch (requestError) {
      setNotice(requestError.message);
    }
  }

  async function onResolve(ticketId) {
    try {
      await updateLandlordSupportTicket(token, ticketId, { status: "resolved" });
      setNotice("Ticket marked as resolved.");
      await load();
    } catch (requestError) {
      setNotice(requestError.message);
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
          <h1>Get help without leaving the landlord portal.</h1>
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
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search FAQs or articles" />
        </div>
      </SectionCard>

      <div className="support-grid">
        <SectionCard title="Frequently Asked Questions">
          {filteredGuides.length ? (
            <ul className="list faq-list">
              {filteredGuides.map((item) => (
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
                  <StatusBadge status={ticket.urgency} />
                  <StatusBadge status={ticket.status} />
                  {ticket.status !== "resolved" && ticket.status !== "closed" ? <button type="button" className="ghost" onClick={() => onResolve(ticket.id)}>Resolve</button> : null}
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
          <label>
            Topic
            <input value={form.topic} onChange={(event) => setForm((previous) => ({ ...previous, topic: event.target.value }))} placeholder="Payment issue" />
          </label>
          <label>
            Urgency
            <select value={form.urgency} onChange={(event) => setForm((previous) => ({ ...previous, urgency: event.target.value }))}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label>
            Message
            <textarea value={form.message} onChange={(event) => setForm((previous) => ({ ...previous, message: event.target.value }))} placeholder="Describe your issue" />
          </label>
          <button type="submit">Submit Ticket</button>
        </form>
      </SectionCard>

      {notice ? <p className="ok-text">{notice}</p> : null}
    </div>
  );
}

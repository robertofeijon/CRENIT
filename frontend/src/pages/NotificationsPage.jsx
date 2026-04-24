import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { getLandlordNotifications, markLandlordNotificationRead, updateLandlordNotificationPreferences } from "../lib/landlordApi";

const preferenceLabels = {
  bookingAlerts: "Booking alerts",
  paymentAlerts: "Payment alerts",
  verificationAlerts: "Verification alerts",
  supportUpdates: "Support updates",
  systemAlerts: "System alerts"
};

export function NotificationsPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [message, setMessage] = useState("");

  async function load() {
    const result = await getLandlordNotifications(token);
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

  const visibleNotifications = useMemo(() => {
    const notifications = data?.notifications || [];
    const normalized = query.trim().toLowerCase();
    return notifications.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return `${item.title} ${item.message} ${item.type}`.toLowerCase().includes(normalized);
    });
  }, [data, query, typeFilter]);

  const groupedNotifications = useMemo(() => {
    return visibleNotifications.reduce((accumulator, item) => {
      const bucket = item.read ? "read" : "unread";
      accumulator[bucket] = accumulator[bucket] || [];
      accumulator[bucket].push(item);
      return accumulator;
    }, {});
  }, [visibleNotifications]);

  const notificationTypes = useMemo(() => {
    const notifications = data?.notifications || [];
    return Array.from(new Set(notifications.map((item) => item.type))).sort();
  }, [data]);

  const unreadCount = data?.notifications?.filter((item) => !item.read).length || 0;
  const preferenceCount = data?.preferences ? Object.values(data.preferences).filter(Boolean).length : 0;

  async function onTogglePreference(key) {
    if (!data?.preferences) {
      return;
    }
    await updateLandlordNotificationPreferences(token, { [key]: !data.preferences[key] });
    await load();
    setMessage("Notification preferences updated.");
  }

  async function onMarkRead(id) {
    await markLandlordNotificationRead(token, id);
    await load();
    setMessage("Notification marked as read.");
  }

  async function onMarkAllRead() {
    const unread = (data?.notifications || []).filter((item) => !item.read);
    await Promise.all(unread.map((item) => markLandlordNotificationRead(token, item.id)));
    await load();
    setMessage("All visible unread notifications were marked as read.");
  }

  if (!data) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  return (
    <div className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>Keep up with booking, payment, and support alerts.</h1>
          <p className="page-hero-copy">Tune what matters, then scan the inbox for the messages that still need your attention.</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={onMarkAllRead}>Mark All Read</button>
        </div>
      </div>

      <div className="card-grid three">
        <StatCard label="Unread" value={String(unreadCount)} tone="alert" />
        <StatCard label="Preferences" value={String(preferenceCount)} helper="Notification channels enabled" />
        <StatCard label="Inbox Items" value={String(data.notifications.length)} helper="Recent activity feed" tone="trust" />
      </div>

      <SectionCard title="Notification Preferences">
        <div className="toggle-grid">
          {Object.entries(data.preferences).map(([key, value]) => (
            <label key={key} className="toggle-item">
              <span>{preferenceLabels[key] || key.replace(/([A-Z])/g, " $1")}</span>
              <input type="checkbox" checked={Boolean(value)} onChange={() => onTogglePreference(key)} />
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Inbox Controls">
        <div className="filter-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notifications" />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All types</option>
            {notificationTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </SectionCard>

      <SectionCard title="Inbox">
        {visibleNotifications.length ? (
          <div className="support-layout">
            {Object.entries(groupedNotifications).map(([group, items]) => (
              <div key={group} className="detail-card">
                <p className="muted">{group === "unread" ? "Unread" : "Read"}</p>
                <ul className="list">
                  {items.map((item) => (
                    <li key={item.id} className={!item.read ? "unread" : ""}>
                      <div>
                        <div className="inline-row" style={{ marginBottom: "6px" }}>
                          <StatusBadge status={item.type} />
                          {!item.read ? <StatusBadge status="pending" /> : <StatusBadge status="cleared" />}
                        </div>
                        <strong>{item.title}</strong>
                        <p>{item.message}</p>
                        <p className="muted">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Recently"}</p>
                      </div>
                      {!item.read ? <button type="button" onClick={() => onMarkRead(item.id)}>Mark Read</button> : <span className="muted">Read</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No notifications match your filters.</p>
        )}
      </SectionCard>

      {message ? <p className="ok-text">{message}</p> : null}
    </div>
  );
}

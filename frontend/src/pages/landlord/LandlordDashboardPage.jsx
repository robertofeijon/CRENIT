import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAdminBookings, getLandlordAudit, getLandlordProperties, getLandlordRelationships } from "../../lib/landlordApi";

export function LandlordDashboardPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [bookingResult, propertyResult, auditResult, relationshipResult] = await Promise.all([
          getAdminBookings(token),
          getLandlordProperties(token),
          getLandlordAudit(token, { pageSize: 8 }),
          getLandlordRelationships(token)
        ]);

        if (!active) {
          return;
        }

        setBookings(bookingResult.bookings || []);
        setProperties(propertyResult.properties || []);
        setAuditEvents(auditResult.events || []);
        setRelationships(relationshipResult.relationships || []);
      } catch (requestError) {
        if (!active) {
          return;
        }
        setBookings([]);
        setProperties([]);
        setAuditEvents([]);
        setRelationships([]);
        setError(requestError.message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [token]);

  const metrics = useMemo(() => {
    const pending = bookings.filter((item) => item.status === "pending").length;
    const confirmed = bookings.filter((item) => item.status === "confirmed").length;
    const approved = bookings.filter((item) => item.status === "approved").length;
    const rejected = bookings.filter((item) => item.status === "rejected").length;
    const poolDay = bookings.filter((item) => item.bookingType === "pool-day").length;
    const totalProperties = properties.length;
    const totalUnits = properties.reduce((sum, property) => sum + Number(property.unitCount || 0), 0);
    const occupiedUnits = properties.reduce((sum, property) => sum + Number(property.occupiedUnits || 0), 0);
    const maintenanceUnits = properties.reduce((sum, property) => sum + Number(property.maintenanceUnits || 0), 0);
    const occupancyRate = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const estimatedMonthlyRevenue = properties.reduce((sum, property) => {
      const averageRent = ((Number(property.monthlyRentLow || 0) + Number(property.monthlyRentHigh || 0)) / 2) || 0;
      return sum + (averageRent * Number(property.occupiedUnits || 0));
    }, 0);
    const linkedTenants = relationships.filter((relationship) => relationship.status === "accepted").length;
    const pendingConnections = relationships.filter((relationship) => relationship.status === "pending").length;
    const draftBookings = bookings.filter((item) => item.status === "draft").length;
    const bookedByType = bookings.reduce((accumulator, item) => {
      const key = item.bookingType || "standard";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});
    const activeProperties = properties.filter((property) => property.status === "active").length;
    const topProperty = [...properties].sort((a, b) => Number(b.occupancyRate || 0) - Number(a.occupancyRate || 0))[0] || null;

    return {
      pending,
      confirmed,
      approved,
      rejected,
      draftBookings,
      poolDay,
      totalProperties,
      totalUnits,
      occupiedUnits,
      maintenanceUnits,
      occupancyRate,
      estimatedMonthlyRevenue,
      linkedTenants,
      pendingConnections,
      bookedByType,
      activeProperties,
      topProperty
    };
  }, [bookings, properties, relationships]);

  const activity = useMemo(() => {
    return auditEvents
      .slice(0, 6)
      .map((entry) => ({
        id: entry.id,
        message: String(entry.action || "system.update").replaceAll(".", " "),
        at: entry.at
      }));
  }, [auditEvents]);

  if (loading) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  return (
    <div className="editorial-dashboard landlord-editorial">
      <header className="editorial-topbar">
        <div>
          <h1>Operations Command.</h1>
          <p>Portfolio controls, finance posture, and compliance signals in one frame.</p>
        </div>
        <div className="editorial-topbar-actions">
          <span className="sync-chip">Live sync</span>
          <Link to="/landlord/properties" className="button-link ghost">Review portfolio</Link>
          <Link to="/landlord/payments" className="button-link">Open finance desk</Link>
        </div>
      </header>

      <section className="alert-strip landlord-alert" role="status" aria-live="polite">
        <span className="dot" aria-hidden="true" />
        <span>{error || "Connection snapshot is stable across portfolio and tenant links."}</span>
      </section>

      <section className="landlord-stat-grid">
        <article className="stat-paper-card">
          <p className="kicker">Properties</p>
          <h2>{metrics.totalProperties}</h2>
          <span className="pill blue">portfolio</span>
        </article>
        <article className="stat-paper-card">
          <p className="kicker">Occupancy</p>
          <h2>{metrics.occupancyRate}%</h2>
          <span className="pill green">{metrics.occupiedUnits}/{metrics.totalUnits}</span>
        </article>
        <article className="stat-paper-card">
          <p className="kicker">Pending Requests</p>
          <h2>{metrics.pending + metrics.confirmed}</h2>
          <span className="pill blue">queue</span>
        </article>
        <article className="stat-paper-card">
          <p className="kicker">Revenue Signal</p>
          <h2>${Math.round(metrics.estimatedMonthlyRevenue).toLocaleString()}</h2>
          <span className="pill green">forecast</span>
        </article>
        <article className="stat-paper-card">
          <p className="kicker">Linked Tenants</p>
          <h2>{metrics.linkedTenants}</h2>
          <span className="pill blue">accepted</span>
        </article>
        <article className="stat-paper-card">
          <p className="kicker">Draft Bookings</p>
          <h2>{metrics.draftBookings}</h2>
          <span className="pill blue">drafts</span>
        </article>
      </section>

      <section className="editorial-two-col">
        <article className="panel-block">
          <h3>Connection Snapshot</h3>
          <ul className="snapshot-rows">
            <li><span>Accepted links</span><strong>{metrics.linkedTenants}</strong></li>
            <li><span>Pending match requests</span><strong>{metrics.pendingConnections}</strong></li>
            <li><span>Active rent properties</span><strong>{metrics.activeProperties}</strong></li>
          </ul>
        </article>

        <article className="panel-block">
          <h3>Activity Feed</h3>
          <ul className="activity-feed">
            {activity.map((item, index) => (
              <li key={item.id}>
                <span className={`ic ${index % 2 === 0 ? "clock" : "ok"}`} aria-hidden="true" />
                <div>
                  <p>{item.message}</p>
                  <small>{new Date(item.at).toLocaleDateString()}</small>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <div className="editorial-bottom-actions">
        <Link to="/landlord/reports" className="button-link ghost">Open reports</Link>
        <Link to="/landlord/tenants" className="button-link">Manage tenants</Link>
      </div>
    </div>
  );
}

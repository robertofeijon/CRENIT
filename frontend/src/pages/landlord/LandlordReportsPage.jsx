import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getAdminBookings, getLandlordProperties, getLandlordRelationships } from "../../lib/landlordApi";

export function LandlordReportsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [range, setRange] = useState("90d");

  useEffect(() => {
    Promise.all([
      getAdminBookings(token),
      getLandlordProperties(token),
      getLandlordRelationships(token)
    ])
      .then(([bookingResult, propertyResult, relationshipResult]) => {
        setBookings(bookingResult.bookings || []);
        setProperties(propertyResult.properties || []);
        setRelationships(relationshipResult.relationships || []);
      })
      .catch(() => {
        setBookings([]);
        setProperties([]);
        setRelationships([]);
      });
  }, [token]);

  const analytics = useMemo(() => {
    const now = new Date();
    const minDate = new Date(now);
    minDate.setDate(now.getDate() - (range === "30d" ? 30 : range === "90d" ? 90 : 180));

    const recentBookings = bookings.filter((item) => {
      const date = new Date(item.date || item.createdAt || 0);
      return !Number.isNaN(date.getTime()) && date >= minDate;
    });

    const monthly = {};
    recentBookings.forEach((item) => {
      const month = (item.date || item.createdAt || "").slice(0, 7) || "unknown";
      monthly[month] = (monthly[month] || 0) + 1;
    });

    const statusMix = recentBookings.reduce((accumulator, item) => {
      const key = item.status || "unknown";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    const typeMix = recentBookings.reduce((accumulator, item) => {
      const key = item.bookingType || "standard";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    const occupancyRate = properties.length
      ? Math.round(
          properties.reduce((sum, property) => sum + Number(property.occupancyRate || 0), 0) / properties.length
        )
      : 0;
    const totalUnits = properties.reduce((sum, property) => sum + Number(property.unitCount || 0), 0);
    const activeConnections = relationships.filter((item) => item.status === "accepted").length;

    return {
      monthly: Object.entries(monthly),
      statusMix,
      typeMix,
      occupancyRate,
      totalUnits,
      activeConnections,
      bookingCount: recentBookings.length,
      occupiedUnits: properties.reduce((sum, property) => sum + Number(property.occupiedUnits || 0), 0),
      propertiesCount: properties.length
    };
  }, [bookings, properties, relationships, range]);

  const topProperty = useMemo(() => {
    return [...properties].sort((a, b) => Number(b.occupancyRate || 0) - Number(a.occupancyRate || 0))[0] || null;
  }, [properties]);

  function onGenerateReport() {
    const lines = [
      ["Metric", "Value"],
      ["Date", new Date().toISOString().slice(0, 10)],
      ["Range", range],
      ["Bookings", analytics.bookingCount],
      ["OccupancyRate", `${analytics.occupancyRate}%`],
      ["TotalUnits", analytics.totalUnits],
      ["OccupiedUnits", analytics.occupiedUnits],
      ["ActiveConnections", analytics.activeConnections],
      ["Properties", analytics.propertiesCount]
    ];

    const csv = lines.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rent-deposit-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-stack">
      <div className="card-grid four">
        <StatCard label="Bookings" value={String(analytics.bookingCount)} helper={`Last ${range}`} tone="trust" />
        <StatCard label="Occupancy" value={`${analytics.occupancyRate}%`} helper={`${analytics.occupiedUnits}/${analytics.totalUnits} units`} tone="success" />
        <StatCard label="Connections" value={String(analytics.activeConnections)} helper="Accepted tenant matches" tone="trust" />
        <StatCard label="Properties" value={String(analytics.propertiesCount)} helper="Portfolio under review" tone="alert" />
      </div>

      <SectionCard title="Reports and Analytics">
        <div className="filter-row" style={{ marginBottom: "12px" }}>
          <select value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="180d">Last 180 days</option>
          </select>
          <button type="button" onClick={onGenerateReport}>Generate Report</button>
        </div>
        <div className="chart-row">
          {analytics.monthly.map(([month, count]) => (
            <div key={month} className="bar-item">
              <div className="bar" style={{ height: `${Math.max(24, count * 20)}px` }} />
              <small>{month}</small>
            </div>
          ))}
        </div>
        <p className="muted">This view combines bookings, occupancy, and portfolio activity for a quick operational pulse.</p>
      </SectionCard>

      <div className="split-grid">
        <SectionCard title="Booking Status Mix">
          <ul className="list">
            {Object.entries(analytics.statusMix).map(([status, count]) => (
              <li key={status}>
                <StatusBadge status={status} />
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Booking Type Mix">
          <ul className="list">
            {Object.entries(analytics.typeMix).map(([type, count]) => (
              <li key={type}>
                <span>{type}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Top Property Snapshot">
        {topProperty ? (
          <div className="detail-grid">
            <div className="detail-card">
              <p className="muted">Property</p>
              <strong>{topProperty.name}</strong>
              <p>{topProperty.address}</p>
            </div>
            <div className="detail-card">
              <p className="muted">Occupancy</p>
              <strong>{topProperty.occupancyRate}%</strong>
              <p>{topProperty.occupiedUnits}/{topProperty.unitCount} units occupied</p>
            </div>
            <div className="detail-card">
              <p className="muted">Signal</p>
              <strong>{topProperty.recentActivity || "No recent activity"}</strong>
            </div>
          </div>
        ) : (
          <p className="empty-state">No property records available for reports.</p>
        )}
      </SectionCard>
    </div>
  );
}

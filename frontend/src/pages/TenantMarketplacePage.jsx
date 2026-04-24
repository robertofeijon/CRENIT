import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { acceptTenantRelationship, getTenantMarketplace, getTenantRelationships, requestMarketplaceMatch } from "../lib/tenantApi";

const sortOptions = [
  { label: "Rent: Low to High", sortBy: "monthlyRentLow", sortDir: "asc" },
  { label: "Rent: High to Low", sortBy: "monthlyRentLow", sortDir: "desc" },
  { label: "Vacancy: Most Open", sortBy: "availableUnits", sortDir: "desc" },
  { label: "Vacancy: Least Open", sortBy: "availableUnits", sortDir: "asc" }
];

function normalizeGroupName(property) {
  const city = String(property.city || "Unknown City").trim();
  const state = String(property.state || "").trim();
  return state ? `${city}, ${state}` : city;
}

export function TenantMarketplacePage() {
  const { token } = useAuth();
  const [properties, setProperties] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [minAvailableUnits, setMinAvailableUnits] = useState("");
  const [maxOccupancy, setMaxOccupancy] = useState("");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [maxBedrooms, setMaxBedrooms] = useState("");
  const [minBathrooms, setMinBathrooms] = useState("");
  const [maxBathrooms, setMaxBathrooms] = useState("");
  const [sortChoice, setSortChoice] = useState("rent-asc");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const sortConfig = useMemo(() => {
    return sortOptions.find((option) => `${option.sortBy}-${option.sortDir}` === sortChoice) || sortOptions[0];
  }, [sortChoice]);

  async function load() {
    setLoading(true);
    try {
      const [marketResult, relationshipResult] = await Promise.all([
        getTenantMarketplace(token, {
          q: query,
          city,
          minRent,
          maxRent,
          minAvailableUnits,
          maxOccupancy,
          minBedrooms,
          maxBedrooms,
          minBathrooms,
          maxBathrooms,
          sortBy: sortConfig.sortBy,
          sortDir: sortConfig.sortDir
        }),
        getTenantRelationships(token)
      ]);

      setProperties(marketResult.properties || []);
      setRelationships(relationshipResult.relationships || []);
    } catch (requestError) {
      setProperties([]);
      setRelationships([]);
      setMessage(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 250);

    return () => clearTimeout(timer);
  }, [token, query, city, minRent, maxRent, minAvailableUnits, maxOccupancy, minBedrooms, maxBedrooms, minBathrooms, maxBathrooms, sortChoice]);

  async function onRequest(property) {
    setBusyId(property.id);
    setMessage("");
    try {
      await requestMarketplaceMatch(token, {
        propertyId: property.id,
        message: `Interested in ${property.name} at ${property.address}`
      });
      setMessage(`Request sent for ${property.name}.`);
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    } finally {
      setBusyId("");
    }
  }

  async function onAccept(relationshipId) {
    setBusyId(relationshipId);
    setMessage("");
    try {
      await acceptTenantRelationship(token, relationshipId);
      setMessage("Invitation accepted and your workspace is linked.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    } finally {
      setBusyId("");
    }
  }

  const acceptedCount = relationships.filter((relationship) => relationship.status === "accepted").length;
  const pendingCount = relationships.filter((relationship) => relationship.status === "pending").length;

  const neighborhoodGroups = useMemo(() => {
    const groups = new Map();

    properties.forEach((property) => {
      const key = normalizeGroupName(property);
      const current = groups.get(key) || {
        name: key,
        propertyCount: 0,
        availableUnits: 0,
        totalRentLow: 0,
        totalRentHigh: 0,
        items: []
      };

      current.propertyCount += 1;
      current.availableUnits += Number(property.availableUnits || 0);
      current.totalRentLow += Number(property.monthlyRentLow || 0);
      current.totalRentHigh += Number(property.monthlyRentHigh || property.monthlyRentLow || 0);
      current.items.push(property);
      groups.set(key, current);
    });

    return Array.from(groups.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [properties]);

  if (loading) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  return (
    <div className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Marketplace</p>
          <h1>Find a place, request a match, and keep the landlord link in one place.</h1>
          <p className="page-hero-copy">Browse available homes, send interest requests, and accept landlord invitations when you are ready to connect.</p>
        </div>
      </div>

      <div className="card-grid three">
        <StatCard label="Listings" value={String(properties.length)} helper="Available properties" tone="trust" />
        <StatCard label="Accepted Links" value={String(acceptedCount)} helper="Active landlord connections" tone="success" />
        <StatCard label="Pending" value={String(pendingCount)} helper="Waiting on action" tone="alert" />
      </div>

      <SectionCard title="Search and Sort Listings">
        <div className="filter-row" style={{ flexWrap: "wrap" }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by property, address, or city" />
          <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Filter by city" />
          <input type="number" min={0} value={minRent} onChange={(event) => setMinRent(event.target.value)} placeholder="Min rent" />
          <input type="number" min={0} value={maxRent} onChange={(event) => setMaxRent(event.target.value)} placeholder="Max rent" />
          <input type="number" min={0} value={minAvailableUnits} onChange={(event) => setMinAvailableUnits(event.target.value)} placeholder="Min open units" />
          <input type="number" min={0} max={100} value={maxOccupancy} onChange={(event) => setMaxOccupancy(event.target.value)} placeholder="Max occupancy %" />
          <input type="number" min={0} value={minBedrooms} onChange={(event) => setMinBedrooms(event.target.value)} placeholder="Min bedrooms" />
          <input type="number" min={0} value={maxBedrooms} onChange={(event) => setMaxBedrooms(event.target.value)} placeholder="Max bedrooms" />
          <input type="number" min={0} step="0.5" value={minBathrooms} onChange={(event) => setMinBathrooms(event.target.value)} placeholder="Min baths" />
          <input type="number" min={0} step="0.5" value={maxBathrooms} onChange={(event) => setMaxBathrooms(event.target.value)} placeholder="Max baths" />
          <select value={sortChoice} onChange={(event) => setSortChoice(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={`${option.sortBy}-${option.sortDir}`} value={`${option.sortBy}-${option.sortDir}`}>{option.label}</option>
            ))}
          </select>
          <button type="button" className="ghost" onClick={() => { setQuery(""); setCity(""); }}>Clear</button>
          <button type="button" className="ghost" onClick={() => { setQuery(""); setCity(""); setMinRent(""); setMaxRent(""); setMinAvailableUnits(""); setMaxOccupancy(""); setMinBedrooms(""); setMaxBedrooms(""); setMinBathrooms(""); setMaxBathrooms(""); setSortChoice("rent-asc"); }}>Reset Filters</button>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>Use rent, vacancy, bedroom, and bathroom filters to narrow the listing pool to homes that fit your budget and availability needs.</p>
      </SectionCard>

      <SectionCard title="Neighborhood Map">
        {neighborhoodGroups.length ? (
          <div className="card-grid two">
            {neighborhoodGroups.map((group) => {
              const averageRent = group.propertyCount ? Math.round(group.totalRentLow / group.propertyCount) : 0;
              const openShare = group.propertyCount ? Math.round((group.availableUnits / group.propertyCount) * 10) : 0;

              return (
                <section key={group.name} className="surface-card" style={{ padding: 20, borderRadius: 18 }}>
                  <div className="inline-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p className="eyebrow" style={{ marginBottom: 8 }}>Neighborhood</p>
                      <h3 style={{ margin: 0 }}>{group.name}</h3>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p className="muted" style={{ margin: 0 }}>{group.propertyCount} listings</p>
                      <p className="muted" style={{ margin: 0 }}>{group.availableUnits} open units</p>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12, marginTop: 16 }}>
                    <div className="surface-card" style={{ padding: 12, borderRadius: 14 }}>
                      <p className="muted" style={{ margin: 0 }}>Avg rent</p>
                      <strong>${averageRent.toLocaleString()}</strong>
                    </div>
                    <div className="surface-card" style={{ padding: 12, borderRadius: 14 }}>
                      <p className="muted" style={{ margin: 0 }}>Open share</p>
                      <strong>{openShare}%</strong>
                    </div>
                  </div>

                  <div className="card-grid two" style={{ marginTop: 16 }}>
                    {group.items.map((property) => (
                      <article key={property.id} className="surface-card" style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)" }}>
                        <div className="inline-row" style={{ justifyContent: "space-between" }}>
                          <div>
                            <h4 style={{ margin: 0 }}>{property.name}</h4>
                            <p className="muted" style={{ marginTop: 6 }}>{property.address}</p>
                          </div>
                          <StatusBadge status={property.status} />
                        </div>

                        <p style={{ marginTop: 12 }}>{property.city}, {property.state} {property.zipCode}</p>
                        <p className="muted">Landlord: {property.landlord?.name || "Unknown"} {property.landlord?.email ? `· ${property.landlord.email}` : ""}</p>
                        <p className="muted">Layout: {Number(property.bedrooms || 0)} bd · {Number(property.bathrooms || 0)} ba</p>
                        <p className="muted">Availability: {property.availableUnits} of {property.unitCount} units open</p>
                        <p className="muted">Rent range: ${Number(property.monthlyRentLow || 0).toLocaleString()} - ${Number(property.monthlyRentHigh || property.monthlyRentLow || 0).toLocaleString()}</p>
                        <p className="muted">{property.recentActivity}</p>

                        <div className="button-row" style={{ marginTop: 16 }}>
                          <button type="button" disabled={busyId === property.id} onClick={() => onRequest(property)}>
                            {busyId === property.id ? "Sending..." : "Request Match"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">No matching properties found.</p>
        )}
      </SectionCard>

      <SectionCard title="My Invitations and Requests">
        {relationships.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Property</th><th>Landlord</th><th>Direction</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {relationships.map((relationship) => (
                  <tr key={relationship.id}>
                    <td>
                      <strong>{relationship.property?.name}</strong>
                      <p className="muted">{relationship.property?.address}</p>
                    </td>
                    <td>
                      <strong>{relationship.landlord?.name}</strong>
                      <p className="muted">{relationship.landlord?.email}</p>
                    </td>
                    <td>{relationship.direction === "landlord_invite" ? "Invitation" : "Request"}</td>
                    <td><StatusBadge status={relationship.status} /></td>
                    <td>
                      {relationship.direction === "landlord_invite" && relationship.status === "pending" ? (
                        <button type="button" disabled={busyId === relationship.id} onClick={() => onAccept(relationship.id)}>
                          {busyId === relationship.id ? "Accepting..." : "Accept Invite"}
                        </button>
                      ) : (
                        <span className="muted">{relationship.status === "accepted" ? "Linked" : "Waiting"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No invitations or requests yet.</p>
        )}
      </SectionCard>

      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}

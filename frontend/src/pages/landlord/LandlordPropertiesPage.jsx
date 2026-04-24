import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { LoadingSpinner, Toast } from "../../components/ui/StateComponents";
import { useAuth } from "../../context/AuthContext";
import { createLandlordProperty, deleteLandlordProperty, getLandlordProperties, updateLandlordProperty } from "../../lib/landlordApi";

const formDefaults = {
  name: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  unitCount: 1,
  occupiedUnits: 0,
  maintenanceUnits: 0,
  monthlyRentLow: 0,
  monthlyRentHigh: 0,
  status: "active",
  recentActivity: "Portfolio updated"
};

export function LandlordPropertiesPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(formDefaults);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState(() => {
    const raw = searchParams.get("status") || "all";
    return ["all", "active", "pending", "maintenance"].includes(raw) ? raw : "all";
  });
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page")) || 1));
  const [pageSize, setPageSize] = useState(() => {
    const raw = Number(searchParams.get("pageSize")) || 5;
    return [5, 10, 20].includes(raw) ? raw : 5;
  });
  const [sortBy, setSortBy] = useState(() => searchParams.get("sortBy") || "updatedAt");
  const [sortDir, setSortDir] = useState(() => searchParams.get("sortDir") === "asc" ? "asc" : "desc");
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [rowActionState, setRowActionState] = useState({});
  const hasLoadedOnce = useRef(false);

  function mapPropertyToForm(property) {
    return {
      name: property.name || "",
      address: property.address || "",
      city: property.city || "",
      state: property.state || "",
      zipCode: property.zipCode || "",
      unitCount: Number(property.unitCount || 0),
      occupiedUnits: Number(property.occupiedUnits || 0),
      maintenanceUnits: Number(property.maintenanceUnits || 0),
      monthlyRentLow: Number(property.monthlyRentLow || 0),
      monthlyRentHigh: Number(property.monthlyRentHigh || 0),
      status: property.status || "active",
      recentActivity: property.recentActivity || "Portfolio updated"
    };
  }

  async function load() {
    const result = await getLandlordProperties(token, {
      q: debouncedQuery,
      status: statusFilter === "all" ? "" : statusFilter,
      page,
      pageSize,
      sortBy,
      sortDir
    });
    setProperties(result.properties || []);
    setTotalItems(result.pagination?.total || (result.properties || []).length);
    setTotalPages(result.pagination?.totalPages || 1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadPage() {
      if (hasLoadedOnce.current) {
        setListLoading(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const result = await getLandlordProperties(token, {
          q: debouncedQuery,
          status: statusFilter === "all" ? "" : statusFilter,
          page,
          pageSize,
          sortBy,
          sortDir
        }, { signal: controller.signal });
        if (!active) {
          return;
        }
        setProperties(result.properties || []);
        setTotalItems(result.pagination?.total || (result.properties || []).length);
        setTotalPages(result.pagination?.totalPages || 1);
      } catch (requestError) {
        if (requestError?.name === "AbortError") {
          return;
        }
        if (!active) {
          return;
        }
        setProperties([]);
        setTotalItems(0);
        setTotalPages(1);
        setError(requestError.message);
      } finally {
        if (active) {
          setLoading(false);
          setListLoading(false);
          hasLoadedOnce.current = true;
        }
      }
    }

    loadPage();

    return () => {
      active = false;
      controller.abort();
    };
  }, [token, debouncedQuery, statusFilter, page, pageSize, sortBy, sortDir]);

  function onFormChange(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function onEdit(property) {
    setEditingId(property.id);
    setForm(mapPropertyToForm(property));
    setMessage(`Editing ${property.name}`);
    setError("");
  }

  function onCancelEdit() {
    setEditingId("");
    setForm(formDefaults);
    setMessage("Edit canceled.");
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        await updateLandlordProperty(token, editingId, form);
        setMessage("Property updated.");
      } else {
        await createLandlordProperty(token, form);
        setMessage("Property created.");
      }

      setForm(formDefaults);
      setEditingId("");
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function onQuickStatus(property, status) {
    if (property.status === status) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    const previous = properties;
    setRowActionState((current) => ({
      ...current,
      [property.id]: { pending: true, retry: null, error: "" }
    }));

    const optimistic = {
      ...property,
      status,
      recentActivity: `Status changed to ${status}`,
      updatedAt: new Date().toISOString()
    };

    setProperties((current) => current.map((item) => (item.id === property.id ? optimistic : item)));

    try {
      const result = await updateLandlordProperty(token, property.id, {
        ...mapPropertyToForm(property),
        status,
        recentActivity: `Status changed to ${status}`
      });
      const updated = result?.property;
      if (updated) {
        setProperties((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      }
      setRowActionState((current) => ({
        ...current,
        [property.id]: { pending: false, retry: null, error: "" }
      }));
      setMessage(`${property.name} marked as ${status}.`);
    } catch (requestError) {
      setProperties(previous);
      setError(requestError.message);
      setRowActionState((current) => ({
        ...current,
        [property.id]: {
          pending: false,
          retry: { type: "status", status },
          error: requestError.message
        }
      }));
    } finally {
      setSaving(false);
      setRowActionState((current) => ({
        ...current,
        [property.id]: {
          ...(current[property.id] || {}),
          pending: false
        }
      }));
    }
  }

  async function onConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const property = deleteTarget;
    setSaving(true);
    setError("");
    setMessage("");
    const previous = properties;
    setRowActionState((current) => ({
      ...current,
      [property.id]: { pending: true, retry: null, error: "" }
    }));

    setProperties((current) => current.filter((item) => item.id !== property.id));
    setTotalItems((count) => Math.max(0, count - 1));
    setDeleteTarget(null);

    try {
      await deleteLandlordProperty(token, property.id);
      setRowActionState((current) => {
        const next = { ...current };
        delete next[property.id];
        return next;
      });
      if (editingId === property.id) {
        setEditingId("");
        setForm(formDefaults);
      }
      setMessage(`${property.name} deleted.`);
    } catch (requestError) {
      setProperties(previous);
      setTotalItems((count) => count + 1);
      setError(requestError.message);
      setRowActionState((current) => ({
        ...current,
        [property.id]: {
          pending: false,
          retry: { type: "delete" },
          error: requestError.message
        }
      }));
    } finally {
      setSaving(false);
      setRowActionState((current) => ({
        ...current,
        [property.id]: {
          ...(current[property.id] || {}),
          pending: false
        }
      }));
    }
  }

  function onRetryRowAction(property) {
    const row = rowActionState[property.id];
    if (!row?.retry) {
      return;
    }

    if (row.retry.type === "status") {
      void onQuickStatus(property, row.retry.status);
      return;
    }

    if (row.retry.type === "delete") {
      setDeleteTarget(property);
    }
  }

  const stats = useMemo(() => {
    const totalUnits = properties.reduce((sum, property) => sum + Number(property.unitCount || 0), 0);
    const occupiedUnits = properties.reduce((sum, property) => sum + Number(property.occupiedUnits || 0), 0);
    const maintenanceUnits = properties.reduce((sum, property) => sum + Number(property.maintenanceUnits || 0), 0);
    const occupancyRate = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    return { totalUnits, occupiedUnits, maintenanceUnits, occupancyRate };
  }, [properties]);

  const currentPage = Math.min(page, totalPages);
  const pagedProperties = properties;

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (query) {
      params.set("q", query);
    }
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (page !== 1) {
      params.set("page", String(page));
    }
    if (pageSize !== 5) {
      params.set("pageSize", String(pageSize));
    }
    if (sortBy !== "updatedAt") {
      params.set("sortBy", sortBy);
    }
    if (sortDir !== "desc") {
      params.set("sortDir", sortDir);
    }

    setSearchParams(params, { replace: true });
  }, [query, statusFilter, page, pageSize, sortBy, sortDir, setSearchParams]);

  function onSort(column) {
    if (sortBy === column) {
      setSortDir((previous) => (previous === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortIndicator(column) {
    if (sortBy !== column) {
      return "";
    }
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  if (loading) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  return (
    <div className="page-stack">
      <div className="card-grid three">
        <StatCard label="Properties" value={String(properties.length)} helper="Live records from backend" tone="trust" />
        <StatCard label="Occupied Units" value={String(stats.occupiedUnits)} helper={`${stats.occupancyRate}% occupancy`} tone="success" />
        <StatCard label="Needs Attention" value={String(stats.maintenanceUnits)} helper={`${stats.totalUnits} total units tracked`} tone="alert" />
      </div>

      <SectionCard title="Properties">
        <p className="muted">Create or edit properties here. Changes persist to backend state immediately.</p>
        <form className="form-grid" style={{ marginTop: 12 }} onSubmit={onSubmit}>
          <label>
            Property Name
            <input value={form.name} onChange={(event) => onFormChange("name", event.target.value)} placeholder="Riverside Residences" required />
          </label>
          <label>
            Address
            <input value={form.address} onChange={(event) => onFormChange("address", event.target.value)} placeholder="14 Creek Avenue" required />
          </label>
          <label>
            City
            <input value={form.city} onChange={(event) => onFormChange("city", event.target.value)} placeholder="Windhoek" />
          </label>
          <label>
            State / Region
            <input value={form.state} onChange={(event) => onFormChange("state", event.target.value)} placeholder="Khomas" />
          </label>
          <label>
            ZIP
            <input value={form.zipCode} onChange={(event) => onFormChange("zipCode", event.target.value)} placeholder="9000" />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => onFormChange("status", event.target.value)}>
              <option value="active">active</option>
              <option value="pending">pending</option>
              <option value="maintenance">maintenance</option>
            </select>
          </label>
          <label>
            Unit Count
            <input type="number" min={0} value={form.unitCount} onChange={(event) => onFormChange("unitCount", Number(event.target.value) || 0)} />
          </label>
          <label>
            Occupied Units
            <input type="number" min={0} value={form.occupiedUnits} onChange={(event) => onFormChange("occupiedUnits", Number(event.target.value) || 0)} />
          </label>
          <label>
            Maintenance Units
            <input type="number" min={0} value={form.maintenanceUnits} onChange={(event) => onFormChange("maintenanceUnits", Number(event.target.value) || 0)} />
          </label>
          <label>
            Monthly Rent Low
            <input type="number" min={0} value={form.monthlyRentLow} onChange={(event) => onFormChange("monthlyRentLow", Number(event.target.value) || 0)} />
          </label>
          <label>
            Monthly Rent High
            <input type="number" min={0} value={form.monthlyRentHigh} onChange={(event) => onFormChange("monthlyRentHigh", Number(event.target.value) || 0)} />
          </label>
          <label>
            Recent Activity
            <input value={form.recentActivity} onChange={(event) => onFormChange("recentActivity", event.target.value)} placeholder="Lease verified for Unit B4" />
          </label>

          <div className="button-row">
            <button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update Property" : "Add Property"}</button>
            {editingId ? <button type="button" className="ghost" onClick={onCancelEdit}>Cancel Edit</button> : null}
          </div>
        </form>
        {message ? <p className="ok-text">{message}</p> : null}
      </SectionCard>

      <SectionCard title="Portfolio">
        <div className="filter-row" style={{ marginBottom: 12 }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by property, city, address, or note"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">active</option>
            <option value="pending">pending</option>
            <option value="maintenance">maintenance</option>
          </select>
          <select value={String(pageSize)} onChange={(event) => setPageSize(Number(event.target.value))}>
            <option value="5">5 per page</option>
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
          </select>
          <p className="muted" style={{ marginLeft: "auto" }}>Showing {pagedProperties.length} of {totalItems}</p>
          {listLoading ? <LoadingSpinner size="small" centered={false} /> : null}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><button type="button" className="link-button" onClick={() => onSort("name")}>Property{sortIndicator("name")}</button></th>
                <th><button type="button" className="link-button" onClick={() => onSort("address")}>Address{sortIndicator("address")}</button></th>
                <th><button type="button" className="link-button" onClick={() => onSort("occupancyRate")}>Occupancy{sortIndicator("occupancyRate")}</button></th>
                <th><button type="button" className="link-button" onClick={() => onSort("unitCount")}>Units{sortIndicator("unitCount")}</button></th>
                <th><button type="button" className="link-button" onClick={() => onSort("status")}>Status{sortIndicator("status")}</button></th>
                <th><button type="button" className="link-button" onClick={() => onSort("updatedAt")}>Update{sortIndicator("updatedAt")}</button></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedProperties.map((property) => (
                <tr key={property.id}>
                  <td>
                    <strong>{property.name}</strong>
                    <p className="muted">{property.city}, {property.state}</p>
                  </td>
                  <td>{property.address}</td>
                  <td>{property.occupancyRate}%</td>
                  <td>{property.occupiedUnits}/{property.unitCount}</td>
                  <td><StatusBadge status={property.status} /></td>
                  <td>{property.recentActivity}</td>
                  <td>
                    {rowActionState[property.id]?.pending ? <p className="muted">Syncing...</p> : null}
                    {rowActionState[property.id]?.error ? <p className="error-text" style={{ margin: 0 }}>{rowActionState[property.id].error}</p> : null}
                    <div className="button-row">
                      <button type="button" className="ghost" onClick={() => onEdit(property)}>Edit</button>
                      <button type="button" className="ghost" disabled={saving || rowActionState[property.id]?.pending} onClick={() => onQuickStatus(property, "active")}>Set Active</button>
                      <button type="button" className="ghost" disabled={saving || rowActionState[property.id]?.pending} onClick={() => onQuickStatus(property, "pending")}>Set Pending</button>
                      <button type="button" className="ghost" disabled={saving || rowActionState[property.id]?.pending} onClick={() => onQuickStatus(property, "maintenance")}>Set Maintenance</button>
                      <button type="button" className="danger" disabled={saving || rowActionState[property.id]?.pending} onClick={() => setDeleteTarget(property)}>Delete</button>
                      {rowActionState[property.id]?.retry ? (
                        <button type="button" className="ghost" disabled={saving || rowActionState[property.id]?.pending} onClick={() => onRetryRowAction(property)}>Retry</button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="button-row" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <button type="button" className="ghost" disabled={currentPage <= 1} onClick={() => setPage((previous) => Math.max(1, previous - 1))}>Previous</button>
          <p className="muted">Page {currentPage} of {totalPages}</p>
          <button type="button" className="ghost" disabled={currentPage >= totalPages} onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}>Next</button>
        </div>
      </SectionCard>

      <SectionCard title="Occupancy Snapshot">
        <ul className="progress-list">
          {properties.map((property) => (
            <li key={property.id}>
              <div className="progress-head">
                <span>{property.name}</span>
                <strong>{property.occupancyRate}%</strong>
              </div>
              <div className="progress-track"><span style={{ width: `${property.occupancyRate}%` }} /></div>
              <p>{property.occupiedUnits}/{property.unitCount} units occupied · {property.monthlyRentLow} to {property.monthlyRentHigh} per month</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      {(saving && !loading) ? <LoadingSpinner size="small" centered={false} /> : null}
      {error ? <Toast type="error" message={error} onClose={() => setError("")} /> : null}
      {message ? <Toast type="success" message={message} onClose={() => setMessage("")} /> : null}

      {deleteTarget ? (
        <div className="lp-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <section className="auth-card lp-modal" onClick={(event) => event.stopPropagation()}>
            <h1>Confirm Property Deletion</h1>
            <p className="subtitle">You are deleting {deleteTarget.name}. This operation is permanent.</p>

            <SectionCard title="Dependency Warnings">
              <ul className="list">
                {Number(deleteTarget.occupiedUnits || 0) > 0 ? <li>{deleteTarget.occupiedUnits} occupied units are associated with this property.</li> : null}
                {Number(deleteTarget.maintenanceUnits || 0) > 0 ? <li>{deleteTarget.maintenanceUnits} maintenance units may lose context after deletion.</li> : null}
                <li>Review reports and disputes linked to this address before confirming.</li>
              </ul>
            </SectionCard>

            <div className="button-row" style={{ marginTop: 12 }}>
              <button type="button" className="danger" disabled={saving} onClick={onConfirmDelete}>Delete Property</button>
              <button type="button" className="ghost" disabled={saving} onClick={() => setDeleteTarget(null)}>Cancel</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

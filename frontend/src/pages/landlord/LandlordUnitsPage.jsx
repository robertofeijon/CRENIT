import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatCard } from "../../components/ui/StatCard";
import { LoadingSpinner, Toast } from "../../components/ui/StateComponents";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import {
  autoAssignTenantsToUnits,
  assignTenantToUnit,
  getLandlordTenantCandidates,
  getLandlordUnits,
  getUnitAssignmentHistory,
  previewAutoAssignTenants,
  rollbackUnitAssignment,
  transferTenantBetweenUnits,
  unassignTenantFromUnit
} from "../../lib/landlordApi";

const manualDefaults = {
  unitId: "",
  tenantEmail: "",
  leaseEndDate: ""
};

const transferDefaults = {
  fromUnitId: "",
  toUnitId: "",
  leaseEndDate: ""
};

export function LandlordUnitsPage() {
  const { token } = useAuth();
  const [units, setUnits] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyUnitId, setHistoryUnitId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [manualForm, setManualForm] = useState(manualDefaults);
  const [autoPropertyId, setAutoPropertyId] = useState("");
  const [autoLimit, setAutoLimit] = useState(3);
  const [autoLeaseEndDate, setAutoLeaseEndDate] = useState("");
  const [autoPreview, setAutoPreview] = useState(null);
  const [transferForm, setTransferForm] = useState(transferDefaults);

  async function loadData() {
    const [unitsResult, candidatesResult] = await Promise.all([
      getLandlordUnits(token, {
        q: query,
        status: statusFilter === "all" ? "" : statusFilter,
        page,
        pageSize,
        sortBy: "updatedAt",
        sortDir: "desc"
      }),
      getLandlordTenantCandidates(token)
    ]);

    setUnits(unitsResult.units || []);
    setTotal(unitsResult.pagination?.total || 0);
    setTotalPages(unitsResult.pagination?.totalPages || 1);
    setCandidates(candidatesResult.candidates || []);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        await loadData();
      } catch (requestError) {
        if (!active) {
          return;
        }
        setUnits([]);
        setCandidates([]);
        setTotal(0);
        setTotalPages(1);
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
  }, [token, query, statusFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

  const stats = useMemo(() => {
    const occupied = units.filter((unit) => unit.status === "occupied").length;
    const vacant = units.filter((unit) => unit.status === "vacant").length;
    const maintenance = units.filter((unit) => unit.status === "maintenance").length;
    const monthlySignal = units.reduce((sum, unit) => sum + Number(unit.rentAmount || 0), 0);

    return {
      occupied,
      vacant,
      maintenance,
      monthlySignal
    };
  }, [units]);

  const assignableUnits = useMemo(() => units.filter((unit) => unit.status === "vacant"), [units]);
  const occupiedUnits = useMemo(() => units.filter((unit) => unit.status === "occupied"), [units]);
  const assignableCandidates = useMemo(() => candidates.filter((candidate) => !candidate.alreadyAssigned), [candidates]);

  const propertyOptions = useMemo(() => {
    const seen = new Map();
    units.forEach((unit) => {
      if (!seen.has(unit.propertyId)) {
        seen.set(unit.propertyId, { id: unit.propertyId, name: unit.propertyName });
      }
    });
    return [...seen.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [units]);

  const transferTargetOptions = useMemo(() => {
    const from = units.find((unit) => unit.id === transferForm.fromUnitId);
    if (!from) {
      return assignableUnits;
    }
    return assignableUnits.filter((unit) => unit.propertyId === from.propertyId);
  }, [units, assignableUnits, transferForm.fromUnitId]);

  async function openHistory(unitId) {
    setHistoryUnitId(unitId);
    setHistoryLoading(true);
    setError("");

    try {
      const result = await getUnitAssignmentHistory(token, unitId);
      setHistory(result.history || []);
    } catch (requestError) {
      setHistory([]);
      setError(requestError.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function refreshAfterMutation() {
    await loadData();
    if (historyUnitId) {
      await openHistory(historyUnitId);
    }
  }

  async function onManualAssign(event) {
    event.preventDefault();

    if (!manualForm.unitId || !manualForm.tenantEmail || !manualForm.leaseEndDate) {
      setError("Manual assignment requires unit, tenant, and lease end date.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await assignTenantToUnit(token, manualForm);
      setManualForm(manualDefaults);
      setMessage("Tenant assigned to unit successfully.");
      await refreshAfterMutation();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function onAutoAssign() {
    if (!autoLeaseEndDate) {
      setError("Auto assignment requires a lease end date.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await autoAssignTenantsToUnits(token, {
        propertyId: autoPropertyId,
        limit: autoLimit,
        leaseEndDate: autoLeaseEndDate
      });
      setAutoPreview(null);
      setMessage(result.assignedCount > 0
        ? `Auto-assigned ${result.assignedCount} tenant(s) to vacant units.`
        : result.reason || "No compatible auto-assignment candidates were found.");
      await refreshAfterMutation();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function onPreviewAutoAssign() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await previewAutoAssignTenants(token, {
        propertyId: autoPropertyId,
        limit: autoLimit
      });
      setAutoPreview(result);
      setMessage(`Preview ready: ${result.summary?.plannedCount || 0} planned assignment(s).`);
    } catch (requestError) {
      setAutoPreview(null);
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function onUnassign(unit) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await unassignTenantFromUnit(token, { unitId: unit.id, reason: "Landlord initiated reassignment" });
      setMessage(`Tenant unassigned from ${unit.label}.`);
      await refreshAfterMutation();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function onTransfer(event) {
    event.preventDefault();

    if (!transferForm.fromUnitId || !transferForm.toUnitId || !transferForm.leaseEndDate) {
      setError("Transfer requires source unit, target unit, and lease end date.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await transferTenantBetweenUnits(token, transferForm);
      setTransferForm(transferDefaults);
      setMessage("Tenant transferred successfully.");
      await refreshAfterMutation();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function onRollback(unitId, eventId) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await rollbackUnitAssignment(token, unitId, eventId);
      setMessage("Rollback applied for selected timeline event.");
      await refreshAfterMutation();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function onQuickSelectUnit(unitId) {
    setManualForm((previous) => ({ ...previous, unitId }));
  }

  if (loading) {
    return <div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  return (
    <div className="page-stack">
      <div className="card-grid four">
        <StatCard label="Occupied" value={String(stats.occupied)} helper="Revenue generating now" tone="success" />
        <StatCard label="Vacant" value={String(stats.vacant)} helper="Available inventory" tone="alert" />
        <StatCard label="Maintenance" value={String(stats.maintenance)} helper="Needs follow up" tone="alert" />
        <StatCard label="Rent Signal" value={`$${Math.round(stats.monthlySignal).toLocaleString()}`} helper="Sum of listed unit rents" tone="trust" />
      </div>

      <SectionCard title="Tenant Assignment Rules">
        <ul className="list">
          <li>Same property only: transfers are restricted to units in the same property.</li>
          <li>Maximum tenants per property: active assignments cannot exceed total property units.</li>
          <li>Lease end date required: manual and auto assignment both require lease end date.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Tenant Assignment Control">
        <p className="muted">Assign tenants manually, auto-assign by priority, transfer between units, or unassign when needed.</p>

        <div className="split-grid" style={{ marginTop: 12 }}>
          <form className="form-grid" onSubmit={onManualAssign}>
            <h3 style={{ margin: 0 }}>Manual Assignment</h3>
            <label>
              Vacant Unit
              <select value={manualForm.unitId} onChange={(event) => setManualForm((previous) => ({ ...previous, unitId: event.target.value }))}>
                <option value="">Select vacant unit</option>
                {assignableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.label} · {unit.propertyName}</option>
                ))}
              </select>
            </label>
            <label>
              Tenant Candidate
              <select value={manualForm.tenantEmail} onChange={(event) => setManualForm((previous) => ({ ...previous, tenantEmail: event.target.value }))}>
                <option value="">Select tenant</option>
                {assignableCandidates.map((candidate) => (
                  <option key={candidate.email} value={candidate.email}>{candidate.fullName} · {candidate.email}</option>
                ))}
              </select>
            </label>
            <label>
              Lease End Date
              <input type="date" required value={manualForm.leaseEndDate} onChange={(event) => setManualForm((previous) => ({ ...previous, leaseEndDate: event.target.value }))} />
            </label>
            <button type="submit" disabled={saving}>{saving ? "Assigning..." : "Assign Tenant to Unit"}</button>
          </form>

          <div className="form-grid">
            <h3 style={{ margin: 0 }}>Smart Auto-Assign</h3>
            <label>
              Property Scope
              <select value={autoPropertyId} onChange={(event) => setAutoPropertyId(event.target.value)}>
                <option value="">All properties</option>
                {propertyOptions.map((property) => (
                  <option key={property.id} value={property.id}>{property.name}</option>
                ))}
              </select>
            </label>
            <label>
              Assignment Limit
              <input type="number" min={1} max={25} value={autoLimit} onChange={(event) => setAutoLimit(Math.max(1, Math.min(25, Number(event.target.value) || 1)))} />
            </label>
            <label>
              Lease End Date
              <input type="date" required value={autoLeaseEndDate} onChange={(event) => setAutoLeaseEndDate(event.target.value)} />
            </label>
            <button type="button" className="ghost" onClick={onPreviewAutoAssign} disabled={saving}>{saving ? "Previewing..." : "What-If Simulator"}</button>
            <button type="button" onClick={onAutoAssign} disabled={saving}>{saving ? "Running..." : "Auto-Assign Best Matches"}</button>
            <p className="muted">Auto mode prioritizes accepted relationships, then pending tenant requests, and skips already assigned tenants.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Auto-Assign What-If Preview">
        {!autoPreview ? (
          <p className="empty-state">Run What-If Simulator to preview exact tenant-to-unit matches before committing auto-assign.</p>
        ) : (
          <>
            <div className="card-grid four">
              <StatCard label="Candidates" value={String(autoPreview.summary?.candidateCount || 0)} helper="Eligible tenant candidates" tone="trust" />
              <StatCard label="Vacant Units" value={String(autoPreview.summary?.vacantUnitCount || 0)} helper="Units in scope" tone="alert" />
              <StatCard label="Planned" value={String(autoPreview.summary?.plannedCount || 0)} helper="Assignments if committed" tone="success" />
              <StatCard label="Remaining Vacant" value={String(autoPreview.summary?.remainingVacantUnits || 0)} helper="After simulated run" />
            </div>

            <SectionCard title="Planned Matches">
              {autoPreview.plannedAssignments?.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Tenant</th><th>Unit</th><th>Property</th><th>Priority</th></tr>
                    </thead>
                    <tbody>
                      {autoPreview.plannedAssignments.map((plan) => (
                        <tr key={`${plan.unitId}-${plan.tenantEmail}`}>
                          <td>
                            <strong>{plan.tenantName}</strong>
                            <p className="muted">{plan.tenantEmail}</p>
                          </td>
                          <td><strong>{plan.unitLabel}</strong></td>
                          <td>
                            <strong>{plan.propertyName}</strong>
                            <p className="muted">{plan.propertyAddress}</p>
                          </td>
                          <td>{plan.candidatePriority}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-state">No assignments would be made with current filters.</p>
              )}
            </SectionCard>

            <SectionCard title="Skipped Candidates">
              {autoPreview.skippedCandidates?.length ? (
                <ul className="list">
                  {autoPreview.skippedCandidates.map((entry) => (
                    <li key={`${entry.email}-${entry.reason}`}>
                      <strong>{entry.fullName}</strong> ({entry.email}) - {entry.reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No skipped candidates for this scenario.</p>
              )}
            </SectionCard>
          </>
        )}
      </SectionCard>

      <SectionCard title="Transfer Tenant Between Units">
        <form className="form-grid" onSubmit={onTransfer}>
          <label>
            From Occupied Unit
            <select value={transferForm.fromUnitId} onChange={(event) => setTransferForm((previous) => ({ ...previous, fromUnitId: event.target.value }))}>
              <option value="">Select occupied unit</option>
              {occupiedUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.label} · {unit.propertyName} · {unit.tenantEmail || unit.tenantName}</option>
              ))}
            </select>
          </label>
          <label>
            To Vacant Unit (same property)
            <select value={transferForm.toUnitId} onChange={(event) => setTransferForm((previous) => ({ ...previous, toUnitId: event.target.value }))}>
              <option value="">Select vacant target unit</option>
              {transferTargetOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.label} · {unit.propertyName}</option>
              ))}
            </select>
          </label>
          <label>
            New Lease End Date
            <input type="date" required value={transferForm.leaseEndDate} onChange={(event) => setTransferForm((previous) => ({ ...previous, leaseEndDate: event.target.value }))} />
          </label>
          <button type="submit" disabled={saving}>{saving ? "Transferring..." : "Transfer Tenant"}</button>
        </form>
      </SectionCard>

      <SectionCard title="Units Management">
        <p>Track rent per unit, occupancy, and assignment status from the live unit ledger.</p>
        <div className="filter-row" style={{ marginTop: 12 }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by property, unit, tenant"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="occupied">occupied</option>
            <option value="vacant">vacant</option>
            <option value="maintenance">maintenance</option>
          </select>
          <select value={String(pageSize)} onChange={(event) => setPageSize(Number(event.target.value))}>
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="30">30 per page</option>
          </select>
          <p className="muted" style={{ marginLeft: "auto" }}>Showing {units.length} of {total}</p>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table>
            <thead>
              <tr><th>Unit</th><th>Property</th><th>Rent</th><th>Status</th><th>Tenant</th><th>Lease</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td><strong>{unit.label}</strong></td>
                  <td>
                    <strong>{unit.propertyName}</strong>
                    <p className="muted">{unit.propertyAddress}</p>
                  </td>
                  <td>${Math.round(Number(unit.rentAmount || 0)).toLocaleString()}</td>
                  <td><StatusBadge status={unit.status} /></td>
                  <td>
                    <span>{unit.tenantName || "Unassigned"}</span>
                    {unit.tenantEmail ? <p className="muted">{unit.tenantEmail}</p> : null}
                    {unit.assignmentMode ? <p className="muted">Assigned via {unit.assignmentMode}</p> : null}
                  </td>
                  <td>{unit.leaseEndDate || "-"}</td>
                  <td>
                    <div className="button-row">
                      {unit.status === "vacant" ? (
                        <button type="button" className="ghost" disabled={saving} onClick={() => onQuickSelectUnit(unit.id)}>Select</button>
                      ) : null}
                      {unit.status === "occupied" ? (
                        <button type="button" className="danger" disabled={saving} onClick={() => onUnassign(unit)}>Unassign</button>
                      ) : null}
                      <button type="button" className="ghost" disabled={saving} onClick={() => openHistory(unit.id)}>History ({unit.assignmentHistoryCount || 0})</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="button-row" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <button type="button" className="ghost" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <p className="muted">Page {Math.min(page, totalPages)} of {totalPages}</p>
          <button type="button" className="ghost" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
        </div>

        {loading ? <LoadingSpinner size="small" centered={false} /> : null}
      </SectionCard>

      <SectionCard title={historyUnitId ? `Assignment Timeline · ${historyUnitId}` : "Assignment Timeline"}>
        {!historyUnitId ? (
          <p className="empty-state">Choose "History" on a unit row to inspect timeline and rollback points.</p>
        ) : historyLoading ? (
          <LoadingSpinner size="small" centered={false} />
        ) : history.length ? (
          <ul className="list">
            {history.map((event) => (
              <li key={event.id}>
                <div className="inline-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <strong>{event.type}</strong>
                    <p className="muted" style={{ margin: 0 }}>{event.at} · {event.actorName || event.actorId || "system"}</p>
                    {event.details?.reason ? <p className="muted" style={{ margin: 0 }}>Reason: {event.details.reason}</p> : null}
                    {event.details?.restoredEventType ? <p className="muted" style={{ margin: 0 }}>Restored: {event.details.restoredEventType}</p> : null}
                  </div>
                  <button type="button" className="ghost" disabled={saving} onClick={() => onRollback(historyUnitId, event.id)}>Rollback To Before</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No assignment history events for this unit yet.</p>
        )}
      </SectionCard>

      {error ? <Toast type="error" message={error} onClose={() => setError("")} /> : null}
      {message ? <Toast type="success" message={message} onClose={() => setMessage("")} /> : null}
    </div>
  );
}

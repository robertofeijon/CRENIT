import { useEffect, useState } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { approveLandlordRelationship, getLandlordProperties, getLandlordRelationships, inviteTenantToProperty } from "../../lib/landlordApi";

export function LandlordCommunicationPage() {
  const { token } = useAuth();
  const [properties, setProperties] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [form, setForm] = useState({ email: "", propertyId: "", tenantName: "", message: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const [propertyResult, relationshipResult] = await Promise.all([
      getLandlordProperties(token, { pageSize: 50, sortBy: "name", sortDir: "asc" }),
      getLandlordRelationships(token)
    ]);

    setProperties(propertyResult.properties || []);
    setRelationships(relationshipResult.relationships || []);
    if (!form.propertyId && (propertyResult.properties || []).length) {
      setForm((previous) => ({ ...previous, propertyId: propertyResult.properties[0].id }));
    }
  }

  useEffect(() => {
    load().catch((requestError) => setMessage(requestError.message));
  }, [token]);

  function onChange(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function onInvite(event) {
    event.preventDefault();
    setMessage("");

    try {
      await inviteTenantToProperty(token, form);
      setMessage("Invitation sent successfully.");
      setForm((previous) => ({ ...previous, email: "", tenantName: "", message: "" }));
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function onApprove(relationshipId) {
    setMessage("");
    try {
      await approveLandlordRelationship(token, relationshipId);
      setMessage("Tenant request approved.");
      await load();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  const pendingRequests = relationships.filter((relationship) => relationship.direction === "tenant_request" && relationship.status === "pending");
  const activeConnections = relationships.filter((relationship) => relationship.status === "accepted");

  return (
    <div className="page-stack">
      <SectionCard title="Invite a Tenant">
        <form className="form-grid" onSubmit={onInvite}>
          <label>
            Tenant Email
            <input value={form.email} onChange={(event) => onChange("email", event.target.value)} placeholder="tenant@example.com" required />
          </label>
          <label>
            Tenant Name
            <input value={form.tenantName} onChange={(event) => onChange("tenantName", event.target.value)} placeholder="Optional display name" />
          </label>
          <label>
            Property
            <select value={form.propertyId} onChange={(event) => onChange("propertyId", event.target.value)}>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>{property.name}</option>
              ))}
            </select>
          </label>
          <label>
            Message
            <textarea value={form.message} onChange={(event) => onChange("message", event.target.value)} placeholder="Add a note for the tenant" />
          </label>
          <button type="submit">Send Invitation</button>
        </form>
      </SectionCard>

      <SectionCard title="Pending Requests">
        {pendingRequests.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tenant</th><th>Property</th><th>Message</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {pendingRequests.map((relationship) => (
                  <tr key={relationship.id}>
                    <td>
                      <strong>{relationship.tenant?.name || relationship.tenant?.email}</strong>
                      <p className="muted">{relationship.tenant?.email}</p>
                    </td>
                    <td>
                      <strong>{relationship.property?.name}</strong>
                      <p className="muted">{relationship.property?.address}</p>
                    </td>
                    <td>{relationship.message || "No message provided"}</td>
                    <td><StatusBadge status={relationship.status} /></td>
                    <td>
                      {relationship.direction === "tenant_request" ? (
                        <button type="button" onClick={() => onApprove(relationship.id)}>Approve</button>
                      ) : (
                        <span className="muted">Awaiting tenant response</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No pending tenant requests.</p>
        )}
      </SectionCard>

      <SectionCard title="Active Connections">
        {activeConnections.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tenant</th><th>Property</th><th>Direction</th><th>Status</th></tr>
              </thead>
              <tbody>
                {activeConnections.map((relationship) => (
                  <tr key={relationship.id}>
                    <td>
                      <strong>{relationship.tenant?.name || relationship.tenant?.email}</strong>
                      <p className="muted">{relationship.tenant?.email}</p>
                    </td>
                    <td>
                      <strong>{relationship.property?.name}</strong>
                      <p className="muted">{relationship.property?.address}</p>
                    </td>
                    <td>{relationship.direction === "landlord_invite" ? "Invitation" : "Request"}</td>
                    <td><StatusBadge status={relationship.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No active connections yet.</p>
        )}
      </SectionCard>

      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}

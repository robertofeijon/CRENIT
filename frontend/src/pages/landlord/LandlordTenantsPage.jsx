import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getAdminBookings, getLandlordRelationships } from "../../lib/landlordApi";

export function LandlordTenantsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [relationships, setRelationships] = useState([]);

  useEffect(() => {
    Promise.all([getAdminBookings(token), getLandlordRelationships(token)])
      .then(([bookingResult, relationshipResult]) => {
        setBookings(bookingResult.bookings || []);
        setRelationships(relationshipResult.relationships || []);
      })
      .catch(() => {
        setBookings([]);
        setRelationships([]);
      });
  }, [token]);

  const bookingTenants = useMemo(() => {
    const grouped = {};
    bookings.forEach((booking) => {
      const key = booking.email || booking.id;
      if (!grouped[key]) {
        grouped[key] = {
          name: booking.fullName,
          email: booking.email,
          reliability: 75,
          latestStatus: booking.status,
          totalRequests: 0
        };
      }
      grouped[key].totalRequests += 1;
      grouped[key].latestStatus = booking.status;
      if (booking.status === "approved") grouped[key].reliability += 5;
      if (booking.status === "rejected") grouped[key].reliability -= 6;
    });
    return Object.values(grouped);
  }, [bookings]);

  const linkedTenants = useMemo(() => relationships.filter((relationship) => relationship.status === "accepted"), [relationships]);

  return (
    <div className="page-stack">
      <SectionCard title="Linked Tenants">
        {linkedTenants.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tenant</th><th>Property</th><th>Direction</th><th>Status</th></tr>
              </thead>
              <tbody>
                {linkedTenants.map((relationship) => (
                  <tr key={relationship.id}>
                    <td>
                      <strong>{relationship.tenant?.name}</strong>
                      <p className="muted">{relationship.tenant?.email}</p>
                    </td>
                    <td>
                      <strong>{relationship.property?.name}</strong>
                      <p className="muted">{relationship.property?.address}</p>
                    </td>
                    <td>{relationship.direction === "landlord_invite" ? "Invite" : "Request"}</td>
                    <td><StatusBadge status={relationship.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No landlord-tenant links yet.</p>
        )}
      </SectionCard>

      <SectionCard title="Booking Requests">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Requests</th><th>Status</th><th>Reliability</th></tr>
            </thead>
            <tbody>
              {bookingTenants.map((tenant) => (
                <tr key={tenant.email}>
                  <td>{tenant.name}</td>
                  <td>{tenant.email}</td>
                  <td>{tenant.totalRequests}</td>
                  <td>{tenant.latestStatus}</td>
                  <td>{Math.max(0, Math.min(100, tenant.reliability))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

import { useEffect, useState } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { approveBooking, confirmBooking, getAdminBookings, rejectBooking } from "../../lib/landlordApi";

export function LandlordPaymentsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  async function loadBookings() {
    try {
      const result = await getAdminBookings(token);
      setBookings(result.bookings || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    loadBookings();
  }, [token]);

  async function onAction(id, action) {
    try {
      if (action === "confirm") await confirmBooking(token, id);
      if (action === "approve") await approveBooking(token, id);
      if (action === "reject") await rejectBooking(token, id, "Rejected by landlord");
      await loadBookings();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="page-stack">
      <SectionCard title="Payment and Booking Control">
        {error ? <p className="error-text">{error}</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Tenant</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>
                  <td>{booking.fullName}</td>
                  <td>{booking.bookingType}</td>
                  <td><StatusBadge status={booking.status} /></td>
                  <td>{booking.date}</td>
                  <td>
                    <div className="button-row">
                      {booking.status === "pending" ? <button type="button" onClick={() => onAction(booking.id, "confirm")}>Confirm</button> : null}
                      {booking.status === "confirmed" ? <button type="button" onClick={() => onAction(booking.id, "approve")}>Approve</button> : null}
                      {["pending", "confirmed"].includes(booking.status) ? <button type="button" className="danger" onClick={() => onAction(booking.id, "reject")}>Reject</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

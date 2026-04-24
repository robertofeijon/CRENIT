import { useEffect, useState } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { useAuth } from "../../context/AuthContext";
import { getAdminBookings } from "../../lib/landlordApi";

export function LandlordNotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    getAdminBookings(token)
      .then((result) => {
        const items = (result.bookings || []).slice(0, 10).map((booking) => ({
          id: booking.id,
          title: `Booking ${booking.status}`,
          message: `${booking.fullName} requested ${booking.bookingType} on ${booking.date}`,
          read: booking.status === "approved"
        }));
        setNotifications(items);
      })
      .catch(() => setNotifications([]));
  }, [token]);

  return (
    <div className="page-stack">
      <SectionCard title="Notifications">
        <ul className="list">
          {notifications.map((item) => (
            <li key={item.id} className={item.read ? "" : "unread"}>
              <span><strong>{item.title}</strong> - {item.message}</span>
              <span>{item.read ? "Read" : "Unread"}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

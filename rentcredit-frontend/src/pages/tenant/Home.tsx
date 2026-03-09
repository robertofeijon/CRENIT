import React, { useEffect, useState } from 'react';
import { fetchRentDue, fetchProfile, fetchTenantProperty } from '../../api';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  images: string[];
}

export default function TenantHome() {
  const [rent, setRent] = useState<{ amount: string; due: string } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [property, setProperty] = useState<Property | null>(null);

  useEffect(() => {
    fetchRentDue().then(setRent).catch(console.error);
    fetchProfile().then((p) => setProfile(p.user || p)).catch(() => {});
    fetchTenantProperty().then(setProperty).catch(() => {});
  }, []);

  return (
    <div className="page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Dashboard</div>
          <div className="pg-title">
            Good morning{profile?.fullName ? `, ${profile.fullName}` : ''}
          </div>
          {profile?.phoneNumber && (
            <div style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 2 }}>
              Phone: {profile.phoneNumber}
            </div>
          )}
        </div>
        <div className="pg-actions">
          <button className="btn btn-outline">View Statements</button>
        </div>
      </div>
      <div className="rent-block">
        <div className="rb-left">
          <div className="rb-eyebrow">Rent Due · June 2025</div>
          <div className="rb-amount">{rent ? rent.amount : '$‑'}</div>
          <div className="rb-detail">
            Due in <strong>6 days</strong> · {rent?.due || '...'} · {property ? `${property.name}, ${property.address}` : 'Loading property...'}
          </div>
        </div>
        <div className="rb-right">
          <button className="btn-white">Pay Now</button>
          <button className="btn-white-ghost">Schedule Payment</button>
        </div>
      </div>

      {property && (
        <div className="property-section">
          <h3 className="section-title">Your Property</h3>
          <div className="property-card">
            <div className="property-images">
              {property.images && property.images.length > 0 ? (
                property.images.map((imageUrl, index) => (
                  <img
                    key={index}
                    src={`http://localhost:3000${imageUrl}`}
                    alt={`${property.name} ${index + 1}`}
                    className="property-image"
                  />
                ))
              ) : (
                <div className="no-images">No images available</div>
              )}
            </div>
            <div className="property-info">
              <h4>{property.name}</h4>
              <p>{property.address}, {property.city}, {property.state}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

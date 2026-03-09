import React, { useEffect, useState } from 'react';
import { fetchAvailableProperties } from '../../api';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  monthlyRent?: number;
  images?: string[];
  unitCount?: number;
}

interface FilterOptions {
  minPrice: number;
  maxPrice: number;
  city: string;
  search: string;
}

const FAVORITES_KEY = 'tenant_favorites';

function getFavorites(): string[] {
  const stored = localStorage.getItem(FAVORITES_KEY);
  return stored ? JSON.parse(stored) : [];
}

function toggleFavorite(propertyId: string) {
  const favorites = getFavorites();
  const idx = favorites.indexOf(propertyId);
  if (idx > -1) {
    favorites.splice(idx, 1);
  } else {
    favorites.push(propertyId);
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return !idx || idx === -1;
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="card" style={{ padding: '16px 18px', flex: 1, minWidth: 140 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{label}</div>
        <span style={{ fontSize: 16, opacity: 0.7 }}>{icon}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function PropertyCard({
  property,
  isFavorited,
  onFavToggle,
  onViewDetails,
}: {
  property: Property;
  isFavorited: boolean;
  onFavToggle: () => void;
  onViewDetails: () => void;
}) {
  const hasImage =
    property.images && property.images.length > 0;

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Property Image */}
      <div
        style={{
          height: 200,
          background: hasImage ? undefined : 'linear-gradient(135deg, var(--violet) 0%, rgba(167,139,250,0.1) 100%)',
          backgroundImage: hasImage
            ? `url("${
                property.images![0].startsWith('http')
                  ? property.images![0]
                  : property.images![0]
              }")`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!hasImage && (
          <div style={{ fontSize: 48, opacity: 0.3 }}>🏠</div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavToggle();
          }}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: '50%',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = isFavorited
              ? 'rgba(212,29,88,0.8)'
              : 'rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.5)';
          }}
        >
          {isFavorited ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Property Info */}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
          {property.name}
        </div>

        <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 12 }}>
          📍 {property.address}, {property.city}
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ color: 'var(--ink-3)', fontSize: 11 }}>Monthly Rent</div>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--violet)',
                marginTop: 2,
              }}
            >
              ${(property.monthlyRent || 0).toLocaleString()}
            </div>
          </div>
          {property.unitCount && (
            <div>
              <div style={{ color: 'var(--ink-3)', fontSize: 11 }}>Units</div>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginTop: 2,
                }}
              >
                {property.unitCount}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onViewDetails}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          View Details
        </button>
      </div>
    </div>
  );
}

function PropertyModal({
  property,
  onClose,
}: {
  property: Property | null;
  onClose: () => void;
}) {
  const [inquiry, setInquiry] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!property) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 600,
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 24,
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div className="pg-title" style={{ margin: 0 }}>
            {property.name}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: 'var(--ink-3)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Images */}
        {property.images && property.images.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <img
              src={property.images[0].startsWith('http') ? property.images[0] : property.images[0]}
              alt={property.name}
              style={{
                width: '100%',
                height: 300,
                objectFit: 'cover',
                borderRadius: 'var(--r-lg)',
                marginBottom: 10,
              }}
            />
            {property.images.length > 1 && (
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                + {property.images.length - 1} more image{property.images.length > 2 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>
              Monthly Rent
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--violet)' }}>
              ${(property.monthlyRent || 0).toLocaleString()}
            </div>
          </div>
          {property.unitCount && (
            <div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>
                Units
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {property.unitCount}
              </div>
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>
              Address
            </div>
            <div style={{ fontSize: 14 }}>
              {property.address}
              <br />
              {property.city}, {property.state}
            </div>
          </div>
        </div>

        {/* Inquiry Form */}
        {!submitted ? (
          <div style={{ borderTop: '1px solid var(--surface-3)', paddingTop: 20 }}>
            <div className="pg-title" style={{ fontSize: 16, margin: '0 0 12px 0' }}>
              Send an Inquiry
            </div>
            <textarea
              value={inquiry}
              onChange={(e) => setInquiry(e.target.value)}
              placeholder="Tell the landlord about yourself..."
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid var(--surface-3)',
                borderRadius: 'var(--r-md)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontFamily: 'inherit',
                fontSize: 14,
                minHeight: 100,
                resize: 'vertical',
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={() => setSubmitted(true)}
                disabled={!inquiry.trim()}
              >
                Send Inquiry
              </button>
              <button className="btn btn-outline" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              borderTop: '1px solid var(--surface-3)',
              paddingTop: 20,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div className="pg-title" style={{ fontSize: 16, margin: 0 }}>
              Inquiry Sent!
            </div>
            <p style={{ color: 'var(--ink-3)', marginTop: 8 }}>
              The landlord will review your inquiry and contact you soon.
            </p>
            <button
              className="btn btn-primary"
              onClick={onClose}
              style={{ marginTop: 16 }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrowseRentals() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 10000,
    city: '',
    search: '',
  });

  useEffect(() => {
    setFavorites(getFavorites());
    fetchAvailableProperties()
      .then((props) => {
        setProperties(Array.isArray(props) ? props : []);
      })
      .catch((e) => {
        console.error('Failed to fetch properties:', e);
        setProperties([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredProperties = properties.filter((p) => {
    const rent = p.monthlyRent || 0;
    const matchPrice = rent >= filters.minPrice && rent <= filters.maxPrice;
    const matchCity = !filters.city || p.city.toLowerCase().includes(filters.city.toLowerCase());
    const matchSearch =
      !filters.search ||
      p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      p.address.toLowerCase().includes(filters.search.toLowerCase());
    return matchPrice && matchCity && matchSearch;
  });

  const cities = [...new Set(properties.map((p) => p.city))].sort();
  const minPrice = properties.length ? Math.min(...properties.map((p) => p.monthlyRent || 0)) : 0;
  const maxPriceAvail = properties.length ? Math.max(...properties.map((p) => p.monthlyRent || 0)) : 10000;

  const stats = {
    total: properties.length,
    available: filteredProperties.length,
    favorited: favorites.length,
    avgRent:
      filteredProperties.length > 0
        ? Math.round(
            filteredProperties.reduce((sum, p) => sum + (p.monthlyRent || 0), 0) /
              filteredProperties.length
          )
        : 0,
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Tenant · Browse</div>
          <div className="pg-title">Available Rentals</div>
        </div>
        <div className="pg-actions">
          <button className="btn btn-outline btn-sm">🤍 {favorites.length} Favorites</button>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <StatCard label="Total Properties" value={stats.total} icon="🏠" />
        <StatCard label="Matching Your Filters" value={stats.available} icon="✓" />
        <StatCard label="Avg Monthly Rent" value={`$${stats.avgRent}`} icon="💰" />
        <StatCard label="Saved Favorites" value={stats.favorited} icon="❤️" />
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        <input
          type="text"
          placeholder="Search by property name or address..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{
            gridColumn: 'repeat(auto-fit, minmax(180px, 1fr))',
            padding: '10px 12px',
            border: '1px solid var(--surface-3)',
            borderRadius: 'var(--r-md)',
            background: 'var(--bg)',
            color: 'var(--ink)',
            fontSize: 14,
          }}
        />

        <select
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          style={{
            padding: '10px 12px',
            border: '1px solid var(--surface-3)',
            borderRadius: 'var(--r-md)',
            background: 'var(--bg)',
            color: 'var(--ink)',
            fontSize: 14,
          }}
        >
          <option value="">All Cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>
            Min Rent: ${filters.minPrice}
          </label>
          <input
            type="range"
            min={minPrice}
            max={maxPriceAvail}
            value={filters.minPrice}
            onChange={(e) =>
              setFilters({
                ...filters,
                minPrice: Math.min(Number(e.target.value), filters.maxPrice),
              })
            }
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>
            Max Rent: ${filters.maxPrice}
          </label>
          <input
            type="range"
            min={minPrice}
            max={maxPriceAvail}
            value={filters.maxPrice}
            onChange={(e) =>
              setFilters({
                ...filters,
                maxPrice: Math.max(Number(e.target.value), filters.minPrice),
              })
            }
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)' }}>
          Loading properties…
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏚️</div>
          <p>No properties match your filters.</p>
          <button
            className="btn btn-outline btn-sm"
            onClick={() =>
              setFilters({
                minPrice: 0,
                maxPrice: 10000,
                city: '',
                search: '',
              })
            }
            style={{ marginTop: 12 }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 18,
          }}
        >
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              isFavorited={favorites.includes(property.id)}
              onFavToggle={() => {
                toggleFavorite(property.id);
                setFavorites(getFavorites());
              }}
              onViewDetails={() => setSelectedProperty(property)}
            />
          ))}
        </div>
      )}

      {/* Property Details Modal */}
      <PropertyModal property={selectedProperty} onClose={() => setSelectedProperty(null)} />
    </div>
  );
}

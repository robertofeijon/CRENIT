export type ResidenceInput = {
  country?: string;
  region?: string;
  city?: string;
  street_address?: string;
  postal_code?: string;
  residential_status?: string;
};

const normalize = (value?: string | null) =>
  (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');

export function compareResidence(
  tenant: ResidenceInput,
  landlord: ResidenceInput | null,
  threshold = 0.72,
): { match: boolean; score: number; compared: boolean } {
  if (!landlord) {
    return { match: true, score: 1, compared: false };
  }

  const pairs: Array<[string | undefined, string | undefined, number]> = [
    [tenant.country, landlord.country, 0.15],
    [tenant.region, landlord.region, 0.2],
    [tenant.city, landlord.city, 0.25],
    [tenant.street_address, landlord.street_address, 0.35],
    [tenant.postal_code, landlord.postal_code, 0.05],
  ];

  let score = 0;
  let weight = 0;
  for (const [a, b, w] of pairs) {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) continue;
    weight += w;
    if (na === nb) {
      score += w;
      continue;
    }
    if (na.includes(nb) || nb.includes(na)) {
      score += w * 0.85;
    }
  }

  if (weight === 0) {
    return { match: false, score: 0, compared: true };
  }

  const ratio = score / weight;
  return { match: ratio >= threshold, score: ratio, compared: true };
}

export function residenceFromProperty(property: {
  address_street?: string | null;
  address_suburb?: string | null;
  address_city?: string | null;
  address_postcode?: string | null;
  address_country?: string | null;
}): ResidenceInput {
  return {
    country: property.address_country || 'Namibia',
    region: property.address_suburb || property.address_city || '',
    city: property.address_city || '',
    street_address: property.address_street || '',
    postal_code: property.address_postcode || '',
    residential_status: 'RENTING',
  };
}

/** Landlord KYC wizard step 2 — primary property / reference location for tenant cross-check. */
export type LandlordKycPropertyInput = {
  country?: string;
  region?: string;
  city?: string;
  street_address?: string;
  postal_code?: string;
};

export function residenceFromLandlordKycStep2(property: LandlordKycPropertyInput | null | undefined): ResidenceInput | null {
  if (!property) return null;
  const hasAny =
    property.country?.trim() ||
    property.region?.trim() ||
    property.city?.trim() ||
    property.street_address?.trim();
  if (!hasAny) return null;
  return {
    country: property.country?.trim() || 'Namibia',
    region: property.region?.trim() || '',
    city: property.city?.trim() || '',
    street_address: property.street_address?.trim() || '',
    postal_code: property.postal_code?.trim() || '',
  };
}

export function residenceFromLandlordProfileAddress(profile: {
  address_country?: string | null;
  address_region?: string | null;
  address_city?: string | null;
  address_street?: string | null;
  address_postcode?: string | null;
} | null | undefined): ResidenceInput | null {
  if (!profile) return null;
  const hasAny = profile.address_street?.trim() || profile.address_city?.trim() || profile.address_region?.trim();
  if (!hasAny) return null;
  return {
    country: profile.address_country?.trim() || 'Namibia',
    region: profile.address_region?.trim() || '',
    city: profile.address_city?.trim() || '',
    street_address: profile.address_street?.trim() || '',
    postal_code: profile.address_postcode?.trim() || '',
  };
}

export type LandlordReferenceSource =
  | 'landlord_kyc_step2'
  | 'landlord_profile_address'
  | 'lease_tenant_residence'
  | 'leased_property';

export type ResolvedLandlordReference = {
  residence: ResidenceInput;
  source: LandlordReferenceSource;
  label: string;
};

function residenceHasComparableFields(residence: ResidenceInput | null | undefined): boolean {
  if (!residence) return false;
  return Boolean(
    residence.street_address?.trim() ||
      residence.city?.trim() ||
      residence.region?.trim() ||
      residence.country?.trim(),
  );
}

/**
 * Picks the landlord-side address used to cross-check a tenant's declared residence.
 * Priority: landlord KYC step-2 property → landlord profile address (same fields) →
 * lease tenant_residence (landlord-declared expectation) → leased unit property address.
 */
export function resolveLandlordReferenceForTenantCheck(candidates: {
  landlordKycStep2?: ResidenceInput | null;
  landlordProfileAddress?: ResidenceInput | null;
  leaseTenantResidence?: ResidenceInput | null;
  leasedProperty?: ResidenceInput | null;
}): ResolvedLandlordReference | null {
  if (residenceHasComparableFields(candidates.landlordKycStep2)) {
    return {
      residence: candidates.landlordKycStep2!,
      source: 'landlord_kyc_step2',
      label: 'Landlord KYC — primary property (step 2)',
    };
  }
  if (residenceHasComparableFields(candidates.landlordProfileAddress)) {
    return {
      residence: candidates.landlordProfileAddress!,
      source: 'landlord_profile_address',
      label: 'Landlord profile — primary property address',
    };
  }
  if (residenceHasComparableFields(candidates.leaseTenantResidence)) {
    return {
      residence: candidates.leaseTenantResidence!,
      source: 'lease_tenant_residence',
      label: 'Lease — landlord-reported tenant residence',
    };
  }
  if (residenceHasComparableFields(candidates.leasedProperty)) {
    return {
      residence: candidates.leasedProperty!,
      source: 'leased_property',
      label: 'Leased property address',
    };
  }
  return null;
}

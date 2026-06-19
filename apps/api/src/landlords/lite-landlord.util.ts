export const LITE_LANDLORD_MAX_UNITS = 3;

export type LandlordTier = 'LITE' | 'FULL';

export function resolveLandlordTierFromUnitCount(unitCount: number): LandlordTier {
  return unitCount > 0 && unitCount <= LITE_LANDLORD_MAX_UNITS ? 'LITE' : 'FULL';
}

export function resolveLandlordTierFromManagedCount(propertiesManagedCount: number): LandlordTier {
  return propertiesManagedCount > 0 && propertiesManagedCount <= LITE_LANDLORD_MAX_UNITS ? 'LITE' : 'FULL';
}

export const LITE_LANDLORD_CONSENT_VERSION = 'landlord-lite-v1';
export const FULL_LANDLORD_CONSENT_VERSION = 'landlord-kyc-v1';

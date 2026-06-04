-- TOTP 2FA session window for privileged roles (admin / landlord enforcement)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS two_factor_verified_until timestamptz;

COMMENT ON COLUMN profiles.two_factor_verified_until IS
  'After successful TOTP verify-session; required for ADMIN/LANDLORD API access when two_factor_enabled is true.';
